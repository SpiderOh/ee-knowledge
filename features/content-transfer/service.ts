import { InterviewAnswerType, Prisma, RelationType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { exampleIdForImport, formulaIdForImport, questionIdForImport } from "./ids";
import { knowledgeBundleSchema, type KnowledgeBundle } from "./schema";
import { validateKnowledgePointCourseChange, validateKnowledgePointCourseSlug } from "@/features/structure-management/consistency";

export const MAX_BUNDLE_BYTES = 2 * 1024 * 1024;
const symmetricTypes = new Set<RelationType>([RelationType.RELATED, RelationType.SIMILAR, RelationType.DIFFERENT]);

function questionAnswer(question: { answers: Array<{ answerType: InterviewAnswerType; content: string }> }, type: InterviewAnswerType) { return question.answers.find((answer) => answer.answerType === type)?.content ?? null; }

export type BundleValidation = { ok: true; bundle: KnowledgeBundle } | { ok: false; errors: string[] };

export function parseKnowledgeBundle(input: string | unknown): BundleValidation {
  if (typeof input === "string" && Buffer.byteLength(input, "utf8") > MAX_BUNDLE_BYTES) return { ok: false, errors: ["Knowledge Bundle 超过 2 MB 限制。"] };
  let value: unknown = input;
  if (typeof input === "string") { try { value = JSON.parse(input) as unknown; } catch { return { ok: false, errors: ["JSON 格式无效。"] }; } }
  const parsed = knowledgeBundleSchema.safeParse(value);
  if (!parsed.success) return { ok: false, errors: parsed.error.issues.map((issue) => `${issue.path.join(".") || "bundle"}: ${issue.message}`) };
  const errors: string[] = [];
  const seenPoints = new Set<string>();
  for (const [index, point] of parsed.data.knowledgePoints.entries()) {
    if (seenPoints.has(point.slug)) errors.push(`knowledgePoints[${index}].slug: 重复的知识点 slug。`);
    seenPoints.add(point.slug);
    const formulaKeys = new Set<string>(); for (const formula of point.formulas ?? []) { if (formulaKeys.has(formula.key)) errors.push(`knowledgePoints[${index}].formulas.${formula.key}: Formula key 重复。`); formulaKeys.add(formula.key); }
    const exampleKeys = new Set<string>(); for (const example of point.examples ?? []) { if (exampleKeys.has(example.key)) errors.push(`knowledgePoints[${index}].examples.${example.key}: Example key 重复。`); exampleKeys.add(example.key); }
  }
  const relationKeys = new Set<string>();
  for (const [index, relation] of parsed.data.relations.entries()) {
    if (relation.sourceSlug === relation.targetSlug) errors.push(`relations[${index}]: 知识点不能关联自身。`);
    const direct = `${relation.sourceSlug}:${relation.targetSlug}:${relation.relationType}`;
    const reverse = `${relation.targetSlug}:${relation.sourceSlug}:${relation.relationType}`;
    if (relationKeys.has(direct) || (symmetricTypes.has(relation.relationType) && relationKeys.has(reverse))) errors.push(`relations[${index}]: 重复或镜像关系。`);
    relationKeys.add(direct);
  }
  return errors.length ? { ok: false, errors } : { ok: true, bundle: parsed.data };
}

type ReferenceResolution = { areaIds: Map<string, string>; courseIds: Map<string, string>; errors: string[] };

async function resolveBundleReferences(bundle: KnowledgeBundle, db: Pick<typeof prisma, "subjectArea" | "course"> | Prisma.TransactionClient): Promise<ReferenceResolution> {
  const areaSlugs = [...new Set([...bundle.subjectAreas.map((area) => area.slug), ...bundle.courses.flatMap((course) => course.subjectAreaSlug ? [course.subjectAreaSlug] : [])])];
  const courseSlugs = [...new Set([...bundle.courses.map((course) => course.slug), ...bundle.knowledgePoints.map((point) => point.courseSlug)])];
  const [areas, courses] = await Promise.all([
    db.subjectArea.findMany({ where: { slug: { in: areaSlugs } }, select: { id: true, slug: true } }),
    db.course.findMany({ where: { slug: { in: courseSlugs } }, select: { id: true, slug: true } }),
  ]);
  const bundleAreaSlugs = new Set(bundle.subjectAreas.map((area) => area.slug));
  const bundleCourseSlugs = new Set(bundle.courses.map((course) => course.slug));
  const areaSet = new Set(areas.map((area) => area.slug));
  const courseSet = new Set(courses.map((course) => course.slug));
  const errors: string[] = [];
  for (const course of bundle.courses) if (course.subjectAreaSlug && !areaSet.has(course.subjectAreaSlug) && !bundleAreaSlugs.has(course.subjectAreaSlug)) errors.push(`课程 ${course.slug} 指向不存在的专业方向 ${course.subjectAreaSlug}。`);
  for (const point of bundle.knowledgePoints) if (!courseSet.has(point.courseSlug) && !bundleCourseSlugs.has(point.courseSlug)) errors.push(`知识点 ${point.slug} 的课程 ${point.courseSlug} 不存在。`);
  return { areaIds: new Map(areas.map((area) => [area.slug, area.id])), courseIds: new Map(courses.map((course) => [course.slug, course.id])), errors };
}

type IdentityDb = Pick<typeof prisma, "formula" | "example" | "interviewQuestion"> | Prisma.TransactionClient;
type ImportIdentity = { id: string; exists: boolean; ownershipValid: boolean };

async function resolveFormulaIdentity(db: IdentityDb, pointId: string, pointSlug: string, key: string): Promise<ImportIdentity> {
  const nativeId = key.startsWith("db:") ? key.slice(3) : null;
  const native = nativeId ? await db.formula.findUnique({ where: { id: nativeId }, select: { id: true, knowledgePointId: true } }) : null;
  const id = native?.id ?? formulaIdForImport(pointSlug, key);
  const existing = native ?? await db.formula.findUnique({ where: { id }, select: { id: true, knowledgePointId: true } });
  return { id, exists: Boolean(existing), ownershipValid: !existing || existing.knowledgePointId === pointId };
}

async function resolveExampleIdentity(db: IdentityDb, pointId: string, pointSlug: string, key: string): Promise<ImportIdentity> {
  const nativeId = key.startsWith("db:") ? key.slice(3) : null;
  const native = nativeId ? await db.example.findUnique({ where: { id: nativeId }, select: { id: true, knowledgePointId: true } }) : null;
  const id = native?.id ?? exampleIdForImport(pointSlug, key);
  const existing = native ?? await db.example.findUnique({ where: { id }, select: { id: true, knowledgePointId: true } });
  return { id, exists: Boolean(existing), ownershipValid: !existing || existing.knowledgePointId === pointId };
}

async function resolveQuestionIdentity(db: IdentityDb, pointId: string, pointSlug: string, key: string): Promise<ImportIdentity> {
  const nativeId = key.startsWith("db:") ? key.slice(3) : null;
  const native = nativeId ? await db.interviewQuestion.findUnique({ where: { id: nativeId }, select: { id: true, knowledgePointId: true } }) : null;
  const id = native?.id ?? questionIdForImport(pointSlug, key);
  const existing = native ?? await db.interviewQuestion.findUnique({ where: { id }, select: { id: true, knowledgePointId: true } });
  return { id, exists: Boolean(existing), ownershipValid: !existing || existing.knowledgePointId === pointId };
}

export async function previewKnowledgeBundle(input: string | unknown) {
  const parsed = parseKnowledgeBundle(input); if (!parsed.ok) return parsed;
  const bundle = parsed.bundle;
  const relationSlugs = bundle.relations.flatMap((relation) => [relation.sourceSlug, relation.targetSlug]);
  const pointSlugsToCheck = [...new Set([...bundle.knowledgePoints.map((point) => point.slug), ...relationSlugs])];
  const [references, points] = await Promise.all([
    resolveBundleReferences(bundle, prisma),
    prisma.knowledgePoint.findMany({ where: { slug: { in: pointSlugsToCheck } }, select: { id: true, slug: true } }),
  ]);
  const errors = [...references.errors];
  const pointSlugs = new Set(points.map((point) => point.slug));
  for (const [index, relation] of bundle.relations.entries()) {
    if (!pointSlugs.has(relation.sourceSlug) && !bundle.knowledgePoints.some((point) => point.slug === relation.sourceSlug)) errors.push(`relations[${index}].sourceSlug: knowledge point "${relation.sourceSlug}" 不存在。`);
    if (!pointSlugs.has(relation.targetSlug) && !bundle.knowledgePoints.some((point) => point.slug === relation.targetSlug)) errors.push(`relations[${index}].targetSlug: knowledge point "${relation.targetSlug}" 不存在。`);
  }
  const pointIds = new Map(points.map((point) => [point.slug, point.id]));
  for (const point of bundle.knowledgePoints) {
    const existing = pointIds.get(point.slug);
    if (existing && !await validateKnowledgePointCourseSlug(prisma, existing, point.courseSlug)) errors.push(`知识点 ${point.slug} 仍关联到其他课程教材的章节，不能更换课程。`);
  }
  const resolvedFormulaIds: string[] = [];
  const resolvedExampleIds: string[] = [];
  const resolvedQuestionIds: string[] = [];
  for (const [pointIndex, point] of bundle.knowledgePoints.entries()) {
    const pointId = pointIds.get(point.slug) ?? "";
    for (const [index, formula] of (point.formulas ?? []).entries()) {
      const identity = await resolveFormulaIdentity(prisma, pointId, point.slug, formula.key);
      resolvedFormulaIds.push(identity.id);
      if (!identity.ownershipValid) errors.push(`knowledgePoints[${pointIndex}].formulas[${index}].key: Formula identity 指向其他知识点。`);
    }
    for (const [index, example] of (point.examples ?? []).entries()) {
      const identity = await resolveExampleIdentity(prisma, pointId, point.slug, example.key);
      resolvedExampleIds.push(identity.id);
      if (!identity.ownershipValid) errors.push(`knowledgePoints[${pointIndex}].examples[${index}].key: Example identity 指向其他知识点。`);
    }
    for (const [index, question] of (point.questions ?? []).entries()) {
      const identity = await resolveQuestionIdentity(prisma, pointId, point.slug, question.key);
      resolvedQuestionIds.push(identity.id);
      if (!identity.ownershipValid) errors.push(`knowledgePoints[${pointIndex}].questions[${index}].key: Question identity 指向其他知识点。`);
    }
  }
  if (errors.length) return { ok: false as const, errors };
  const [formulaCount, exampleCount, questionCount, existingRelations] = await Promise.all([
    prisma.formula.count({ where: { id: { in: resolvedFormulaIds } } }),
    prisma.example.count({ where: { id: { in: resolvedExampleIds } } }),
    prisma.interviewQuestion.count({ where: { id: { in: resolvedQuestionIds } } }),
    prisma.knowledgeRelation.findMany({ where: { sourceKnowledgePointId: { in: [...pointIds.values()] }, targetKnowledgePointId: { in: [...pointIds.values()] }, relationType: { in: bundle.relations.map((relation) => relation.relationType) } }, select: { sourceKnowledgePointId: true, targetKnowledgePointId: true, relationType: true } }),
  ]);
  const existingRelationKeys = new Set(existingRelations.map((relation) => `${relation.sourceKnowledgePointId}:${relation.targetKnowledgePointId}:${relation.relationType}`));
  const relationExists = (relation: KnowledgeBundle["relations"][number]) => { const sourceId = pointIds.get(relation.sourceSlug); const targetId = pointIds.get(relation.targetSlug); if (!sourceId || !targetId) return false; const direct = `${sourceId}:${targetId}:${relation.relationType}`; const reverse = `${targetId}:${sourceId}:${relation.relationType}`; return existingRelationKeys.has(direct) || (symmetricTypes.has(relation.relationType) && existingRelationKeys.has(reverse)); };
  return { ok: true as const, bundle, summary: { subjectAreas: countChanges(bundle.subjectAreas, [...references.areaIds.keys()]), courses: countChanges(bundle.courses, [...references.courseIds.keys()]), knowledgePoints: countChanges(bundle.knowledgePoints, points.map((item) => item.slug)), formulas: { create: bundle.knowledgePoints.flatMap((point) => point.formulas ?? []).length - formulaCount, update: formulaCount }, examples: { create: bundle.knowledgePoints.flatMap((point) => point.examples ?? []).length - exampleCount, update: exampleCount }, questions: { create: bundle.knowledgePoints.flatMap((point) => point.questions ?? []).length - questionCount, update: questionCount }, relations: { create: bundle.relations.filter((relation) => !relationExists(relation)).length, update: bundle.relations.filter((relation) => relationExists(relation)).length }, errors: 0, warnings: 0 } };
}
function countChanges(items: Array<{ slug: string }>, existing: string[]) { const set = new Set(existing); const create = items.filter((item) => !set.has(item.slug)).length; return { create, update: items.length - create }; }

function has<T extends object>(object: T, key: keyof T) { return Object.prototype.hasOwnProperty.call(object, key); }

export async function importKnowledgeBundle(input: string | unknown) {
  const preview = await previewKnowledgeBundle(input); if (!preview.ok) return preview;
  const bundle = preview.bundle;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const areaIds = new Map<string, string>();
      for (const area of bundle.subjectAreas) { const updateData: Prisma.SubjectAreaUncheckedUpdateInput = { name: area.name }; if (has(area, "description")) updateData.description = area.description; if (has(area, "sortOrder")) updateData.sortOrder = area.sortOrder; const saved = await tx.subjectArea.upsert({ where: { slug: area.slug }, update: updateData, create: { slug: area.slug, name: area.name, description: area.description ?? null, sortOrder: area.sortOrder ?? 0 } }); areaIds.set(area.slug, saved.id); }
      const references = await resolveBundleReferences(bundle, tx); if (references.errors.length) throw new Error(references.errors[0]);
      const courseIds = references.courseIds;
       for (const course of bundle.courses) { const updateData: Prisma.CourseUncheckedUpdateInput = { name: course.name }; if (has(course, "description")) updateData.description = course.description; if (has(course, "sortOrder")) updateData.sortOrder = course.sortOrder; if (has(course, "subjectAreaSlug")) { if (course.subjectAreaSlug === null) updateData.subjectAreaId = null; else if (typeof course.subjectAreaSlug === "string") { const subjectAreaId = areaIds.get(course.subjectAreaSlug) ?? references.areaIds.get(course.subjectAreaSlug); if (!subjectAreaId) throw new Error(`课程 ${course.slug} 的专业方向不存在。`); updateData.subjectAreaId = subjectAreaId; } } const createSubjectAreaId = typeof course.subjectAreaSlug === "string" ? areaIds.get(course.subjectAreaSlug) ?? references.areaIds.get(course.subjectAreaSlug) ?? null : null; const saved = await tx.course.upsert({ where: { slug: course.slug }, update: updateData, create: { slug: course.slug, name: course.name, description: course.description ?? null, sortOrder: course.sortOrder ?? 0, subjectAreaId: createSubjectAreaId } }); courseIds.set(course.slug, saved.id); }
      for (const point of bundle.knowledgePoints) if (!courseIds.has(point.courseSlug)) { const existing = await tx.course.findUnique({ where: { slug: point.courseSlug }, select: { id: true } }); if (existing) courseIds.set(point.courseSlug, existing.id); }
       const pointIds = new Map<string, string>(); let createdKnowledgePoints = 0; let updatedKnowledgePoints = 0; let formulasChanged = 0; let examplesChanged = 0; let questionsChanged = 0; let relationsChanged = 0;
       for (const point of bundle.knowledgePoints) { const courseId = courseIds.get(point.courseSlug); if (!courseId) throw new Error(`知识点 ${point.slug} 的课程不存在。`); const existing = await tx.knowledgePoint.findUnique({ where: { slug: point.slug }, select: { id: true, courseId: true } }); if (existing && existing.courseId !== courseId && !await validateKnowledgePointCourseChange(tx, existing.id, courseId)) throw new Error(`知识点 ${point.slug} 仍关联到其他课程教材的章节，不能更换课程。`); const fields: Prisma.KnowledgePointUncheckedCreateInput = { title: point.title, slug: point.slug, courseId, category: point.category ?? "CONCEPT", summary: point.summary ?? null, commonMistakes: point.commonMistakes ?? null, masteryCriteria: point.masteryCriteria ?? null, definition: point.definition ?? null, plainExplanation: point.plainExplanation ?? null, principle: point.principle ?? null, physicalMeaning: point.physicalMeaning ?? null, engineeringMeaning: point.engineeringMeaning ?? null, importance: point.importance ?? 3, interviewImportance: point.interviewImportance ?? 3, difficulty: point.difficulty ?? 3, reviewStatus: point.reviewStatus ?? "AI_DRAFT", source: point.source ?? null, sourceBook: point.sourceBook ?? null, sourceChapter: point.sourceChapter ?? null, sourcePage: point.sourcePage ?? null, confidence: point.confidence ?? null }; const updateData: Prisma.KnowledgePointUncheckedUpdateInput = { title: point.title, courseId }; for (const key of ["category", "summary", "commonMistakes", "masteryCriteria", "definition", "plainExplanation", "principle", "physicalMeaning", "engineeringMeaning", "importance", "interviewImportance", "difficulty", "reviewStatus", "source", "sourceBook", "sourceChapter", "sourcePage", "confidence"] as const) if (has(point, key)) Object.assign(updateData, { [key]: point[key] }); const saved = existing ? await tx.knowledgePoint.update({ where: { id: existing.id }, data: updateData }) : await tx.knowledgePoint.create({ data: fields }); pointIds.set(point.slug, saved.id); if (existing) updatedKnowledgePoints++; else createdKnowledgePoints++; }
      for (const point of bundle.knowledgePoints) {
        const pointId = pointIds.get(point.slug); if (!pointId) throw new Error(`知识点 ${point.slug} 导入失败。`);
        for (const formula of point.formulas ?? []) {
          const identity = await resolveFormulaIdentity(tx, pointId, point.slug, formula.key); if (!identity.ownershipValid) throw new Error(`${formula.key}: Formula identity 指向其他知识点。`);
          const updateData: Prisma.FormulaUncheckedUpdateInput = {};
          for (const key of ["name", "latex", "description", "conditions", "sortOrder"] as const) if (has(formula, key)) Object.assign(updateData, { [key]: formula[key] });
          const createData: Prisma.FormulaUncheckedCreateInput = { id: identity.id, knowledgePointId: pointId, name: formula.name ?? null, latex: formula.latex, description: formula.description ?? null, conditions: formula.conditions ?? null, sortOrder: formula.sortOrder ?? 0 };
          const existed = await tx.formula.findUnique({ where: { id: identity.id }, select: { id: true } });
          if (existed) await tx.formula.update({ where: { id: identity.id }, data: updateData }); else await tx.formula.create({ data: createData });
          formulasChanged++;
        }
        for (const example of point.examples ?? []) {
          const identity = await resolveExampleIdentity(tx, pointId, point.slug, example.key); if (!identity.ownershipValid) throw new Error(`${example.key}: Example identity 指向其他知识点。`);
          const updateData: Prisma.ExampleUncheckedUpdateInput = {};
          for (const key of ["title", "type", "content", "solution", "sortOrder"] as const) if (has(example, key)) Object.assign(updateData, { [key]: example[key] });
          const createData: Prisma.ExampleUncheckedCreateInput = { id: identity.id, knowledgePointId: pointId, title: example.title ?? null, type: example.type ?? null, content: example.content, solution: example.solution ?? null, sortOrder: example.sortOrder ?? 0 };
          const existed = await tx.example.findUnique({ where: { id: identity.id }, select: { id: true } });
           if (existed) await tx.example.update({ where: { id: identity.id }, data: updateData }); else await tx.example.create({ data: createData });
           examplesChanged++;
         }
         for (const question of point.questions ?? []) {
           const identity = await resolveQuestionIdentity(tx, pointId, point.slug, question.key); if (!identity.ownershipValid) throw new Error(`${question.key}: Question identity 指向其他知识点。`);
           const createData = { id: identity.id, knowledgePointId: pointId, question: question.question, level: question.level ?? 1, frequency: question.frequency ?? 3, source: question.source ?? null };
           if (identity.exists) {
             const updateData: Prisma.InterviewQuestionUncheckedUpdateInput = { question: question.question };
             if (has(question, "level")) updateData.level = question.level;
             if (has(question, "frequency")) updateData.frequency = question.frequency;
             if (has(question, "source")) updateData.source = question.source;
             await tx.interviewQuestion.update({ where: { id: identity.id }, data: updateData });
           }
           const saved = identity.exists ? { id: identity.id } : await tx.interviewQuestion.create({ data: createData });
           const answerValues: Array<[InterviewAnswerType, string | null | undefined]> = [[InterviewAnswerType.SHORT_30S, question.shortAnswer], [InterviewAnswerType.MEDIUM_1MIN, question.standardAnswer], [InterviewAnswerType.DEEP, question.deepAnswer]];
           for (const [answerType, content] of answerValues) {
             if (content === undefined) continue;
             if (content === null || content === "") await tx.interviewAnswer.deleteMany({ where: { interviewQuestionId: saved.id, answerType } });
             else await tx.interviewAnswer.upsert({ where: { interviewQuestionId_answerType: { interviewQuestionId: saved.id, answerType } }, update: { content }, create: { interviewQuestionId: saved.id, answerType, content } });
           }
           questionsChanged++;
         }
       }
      for (const relation of bundle.relations) { const sourceId = pointIds.get(relation.sourceSlug) ?? (await tx.knowledgePoint.findUnique({ where: { slug: relation.sourceSlug }, select: { id: true } }))?.id; const targetId = pointIds.get(relation.targetSlug) ?? (await tx.knowledgePoint.findUnique({ where: { slug: relation.targetSlug }, select: { id: true } }))?.id; if (!sourceId || !targetId) throw new Error(`关系 ${relation.sourceSlug} → ${relation.targetSlug} 的知识点不存在。`); if (sourceId === targetId) throw new Error("知识点不能关联自身。"); const reverse = symmetricTypes.has(relation.relationType) ? await tx.knowledgeRelation.findUnique({ where: { sourceKnowledgePointId_targetKnowledgePointId_relationType: { sourceKnowledgePointId: targetId, targetKnowledgePointId: sourceId, relationType: relation.relationType } }, select: { id: true } }) : null; if (reverse) { await tx.knowledgeRelation.update({ where: { id: reverse.id }, data: { description: relation.description } }); } else { await tx.knowledgeRelation.upsert({ where: { sourceKnowledgePointId_targetKnowledgePointId_relationType: { sourceKnowledgePointId: sourceId, targetKnowledgePointId: targetId, relationType: relation.relationType } }, update: { description: relation.description }, create: { sourceKnowledgePointId: sourceId, targetKnowledgePointId: targetId, relationType: relation.relationType, description: relation.description } }); } relationsChanged++; }
       return { createdKnowledgePoints, updatedKnowledgePoints, formulas: formulasChanged, examples: examplesChanged, questions: questionsChanged, relations: relationsChanged };
    });
    return { ok: true as const, result };
  } catch (error) { return { ok: false as const, errors: [error instanceof Error ? error.message : "知识 Bundle 导入失败，请稍后重试。"] }; }
}

export async function exportKnowledgeBundle(courseSlug?: string) {
  const selectedCourses = await prisma.course.findMany({ where: courseSlug ? { slug: courseSlug } : undefined, include: { subjectArea: true }, orderBy: [{ sortOrder: "asc" }, { slug: "asc" }] });
  const courseFilter = courseSlug ? { course: { slug: courseSlug } } : {};
  const points = await prisma.knowledgePoint.findMany({ where: courseFilter, orderBy: [{ course: { slug: "asc" } }, { slug: "asc" }], include: { course: { include: { subjectArea: true } }, formulas: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }, examples: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }, interviewQuestions: { orderBy: [{ frequency: "desc" }, { level: "asc" }, { id: "asc" }], include: { answers: true } } } });
  const pointIds = points.map((point) => point.id); const slugs = new Set(points.map((point) => point.slug));
  const relations = await prisma.knowledgeRelation.findMany({ where: { sourceKnowledgePointId: { in: pointIds }, targetKnowledgePointId: { in: pointIds } }, include: { source: { select: { slug: true } }, target: { select: { slug: true } } } });
  const relationData = relations.map((relation) => ({ sourceSlug: relation.source.slug, targetSlug: relation.target.slug, relationType: relation.relationType, description: relation.description })).sort((a, b) => a.sourceSlug.localeCompare(b.sourceSlug) || a.relationType.localeCompare(b.relationType) || a.targetSlug.localeCompare(b.targetSlug));
  const allAreas = courseSlug ? selectedCourses.filter((course) => course.subjectArea).map((course) => course.subjectArea!) : await prisma.subjectArea.findMany({ orderBy: [{ sortOrder: "asc" }, { slug: "asc" }] });
  const areaMap = new Map(allAreas.map((area) => [area.slug, area]));
  for (const course of selectedCourses) if (course.subjectArea) areaMap.set(course.subjectArea.slug, course.subjectArea);
  const areas = [...areaMap.values()].sort((a, b) => a.sortOrder - b.sortOrder || a.slug.localeCompare(b.slug));
   return { kind: "ee-knowledge-content" as const, schemaVersion: "1.0" as const, exportedAt: new Date().toISOString(), subjectAreas: areas.map((area) => ({ slug: area.slug, name: area.name, description: area.description, sortOrder: area.sortOrder })), courses: selectedCourses.map((course) => ({ slug: course.slug, name: course.name, description: course.description, sortOrder: course.sortOrder, subjectAreaSlug: course.subjectArea?.slug ?? null })), knowledgePoints: points.map((point) => ({ slug: point.slug, courseSlug: point.course.slug, title: point.title, category: point.category, summary: point.summary, commonMistakes: point.commonMistakes, masteryCriteria: point.masteryCriteria, definition: point.definition, plainExplanation: point.plainExplanation, principle: point.principle, physicalMeaning: point.physicalMeaning, engineeringMeaning: point.engineeringMeaning, importance: point.importance, interviewImportance: point.interviewImportance, difficulty: point.difficulty, reviewStatus: point.reviewStatus, source: point.source, sourceBook: point.sourceBook, sourceChapter: point.sourceChapter, sourcePage: point.sourcePage, confidence: point.confidence, formulas: point.formulas.map((formula) => ({ key: `db:${formula.id}`, name: formula.name, latex: formula.latex, description: formula.description, conditions: formula.conditions, sortOrder: formula.sortOrder })), examples: point.examples.map((example) => ({ key: `db:${example.id}`, title: example.title, type: example.type, content: example.content, solution: example.solution, sortOrder: example.sortOrder })), questions: point.interviewQuestions.map((question) => ({ key: `db:${question.id}`, question: question.question, level: question.level, frequency: question.frequency, source: question.source, shortAnswer: questionAnswer(question, InterviewAnswerType.SHORT_30S), standardAnswer: questionAnswer(question, InterviewAnswerType.MEDIUM_1MIN), deepAnswer: questionAnswer(question, InterviewAnswerType.DEEP) })) })), relations: relationData.filter((relation) => slugs.has(relation.sourceSlug) && slugs.has(relation.targetSlug)) };
}
