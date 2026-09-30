import { Prisma, RelationType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { exampleIdForImport, formulaIdForImport } from "./ids";
import { knowledgeBundleSchema, type KnowledgeBundle } from "./schema";

export const MAX_BUNDLE_BYTES = 2 * 1024 * 1024;
const symmetricTypes = new Set<RelationType>([RelationType.RELATED, RelationType.SIMILAR, RelationType.DIFFERENT]);

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
  for (const [index, relation] of parsed.data.relations.entries()) if (relation.sourceSlug === relation.targetSlug) errors.push(`relations[${index}]: 知识点不能关联自身。`);
  return errors.length ? { ok: false, errors } : { ok: true, bundle: parsed.data };
}

async function resolveBundleCourses(bundle: KnowledgeBundle, tx: Prisma.TransactionClient) {
  const existingAreas = await tx.subjectArea.findMany({ where: { slug: { in: bundle.subjectAreas.map((area) => area.slug) } }, select: { slug: true } });
  const areaSlugs = new Set(existingAreas.map((area) => area.slug));
  for (const course of bundle.courses) if (course.subjectAreaSlug && !areaSlugs.has(course.subjectAreaSlug) && !bundle.subjectAreas.some((area) => area.slug === course.subjectAreaSlug)) throw new Error(`课程 ${course.slug} 指向不存在的专业方向 ${course.subjectAreaSlug}。`);
  const courses = await tx.course.findMany({ where: { slug: { in: bundle.courses.map((course) => course.slug) } }, select: { id: true, slug: true } });
  return new Map(courses.map((course) => [course.slug, course.id]));
}

export async function previewKnowledgeBundle(input: string | unknown) {
  const parsed = parseKnowledgeBundle(input); if (!parsed.ok) return parsed;
  const bundle = parsed.bundle;
  const relationSlugs = bundle.relations.flatMap((relation) => [relation.sourceSlug, relation.targetSlug]);
  const referencedCourseSlugs = [...new Set([...bundle.courses.map((course) => course.slug), ...bundle.knowledgePoints.map((point) => point.courseSlug)])];
  const [areas, courses, points] = await Promise.all([
    prisma.subjectArea.findMany({ where: { slug: { in: bundle.subjectAreas.map((area) => area.slug) } }, select: { slug: true } }),
    prisma.course.findMany({ where: { slug: { in: referencedCourseSlugs } }, select: { slug: true } }),
    prisma.knowledgePoint.findMany({ where: { slug: { in: [...new Set([...bundle.knowledgePoints.map((point) => point.slug), ...relationSlugs])] } }, select: { id: true, slug: true } }),
  ]);
  const courseSlugs = new Set(courses.map((course) => course.slug));
  const bundleCourseSlugs = new Set(bundle.courses.map((course) => course.slug));
  const pointSlugs = new Set(points.map((point) => point.slug));
  const errors = [...bundle.knowledgePoints.flatMap((point, index) => !courseSlugs.has(point.courseSlug) && !bundleCourseSlugs.has(point.courseSlug) ? [`knowledgePoints[${index}].courseSlug: 课程 "${point.courseSlug}" 不存在。`] : []), ...bundle.relations.flatMap((relation, index) => !pointSlugs.has(relation.sourceSlug) && !bundle.knowledgePoints.some((point) => point.slug === relation.sourceSlug) ? [`relations[${index}].sourceSlug: knowledge point "${relation.sourceSlug}" 不存在。`] : []), ...bundle.relations.flatMap((relation, index) => !pointSlugs.has(relation.targetSlug) && !bundle.knowledgePoints.some((point) => point.slug === relation.targetSlug) ? [`relations[${index}].targetSlug: knowledge point "${relation.targetSlug}" 不存在。`] : [])];
  if (errors.length) return { ok: false as const, errors };
  const pointIds = new Map(points.map((point) => [point.slug, point.id]));
  const formulas = bundle.knowledgePoints.flatMap((point) => (point.formulas ?? []).map((formula) => ({ id: formula.key.startsWith("db:") ? formula.key.slice(3) : formulaIdForImport(point.slug, formula.key), point }))).map((item) => item.id);
  const examples = bundle.knowledgePoints.flatMap((point) => (point.examples ?? []).map((example) => ({ id: example.key.startsWith("db:") ? example.key.slice(3) : exampleIdForImport(point.slug, example.key) }))).map((item) => item.id);
  const [formulaCount, exampleCount, existingRelations] = await Promise.all([
    prisma.formula.count({ where: { id: { in: formulas } } }), prisma.example.count({ where: { id: { in: examples } } }),
    prisma.knowledgeRelation.findMany({ where: { sourceKnowledgePointId: { in: [...pointIds.values()] }, targetKnowledgePointId: { in: [...pointIds.values()] }, relationType: { in: bundle.relations.map((relation) => relation.relationType) } }, select: { sourceKnowledgePointId: true, targetKnowledgePointId: true, relationType: true } }),
  ]);
  const existingRelationKeys = new Set(existingRelations.map((relation) => `${relation.sourceKnowledgePointId}:${relation.targetKnowledgePointId}:${relation.relationType}`));
  const relationExists = (relation: KnowledgeBundle["relations"][number]) => { const sourceId = pointIds.get(relation.sourceSlug); const targetId = pointIds.get(relation.targetSlug); if (!sourceId || !targetId) return false; const direct = `${sourceId}:${targetId}:${relation.relationType}`; const reverse = `${targetId}:${sourceId}:${relation.relationType}`; return existingRelationKeys.has(direct) || (symmetricTypes.has(relation.relationType) && existingRelationKeys.has(reverse)); };
  return { ok: true as const, bundle, summary: { subjectAreas: countChanges(bundle.subjectAreas, areas.map((item) => item.slug)), courses: countChanges(bundle.courses, courses.map((item) => item.slug)), knowledgePoints: countChanges(bundle.knowledgePoints, points.map((item) => item.slug)), formulas: { create: bundle.knowledgePoints.flatMap((point) => point.formulas ?? []).length - formulaCount, update: formulaCount }, examples: { create: bundle.knowledgePoints.flatMap((point) => point.examples ?? []).length - exampleCount, update: exampleCount }, relations: { create: bundle.relations.filter((relation) => !relationExists(relation)).length, update: bundle.relations.filter((relation) => relationExists(relation)).length }, errors: 0, warnings: 0 } };
}

function countChanges(items: Array<{ slug: string }>, existing: string[]) { const set = new Set(existing); const create = items.filter((item) => !set.has(item.slug)).length; return { create, update: items.length - create }; }

function has<T extends object>(object: T, key: keyof T) { return Object.prototype.hasOwnProperty.call(object, key); }

export async function importKnowledgeBundle(input: string | unknown) {
  const preview = await previewKnowledgeBundle(input); if (!preview.ok) return preview;
  const bundle = preview.bundle;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const areaIds = new Map<string, string>();
      for (const area of bundle.subjectAreas) { const saved = await tx.subjectArea.upsert({ where: { slug: area.slug }, update: { name: area.name, description: area.description, sortOrder: area.sortOrder }, create: area }); areaIds.set(area.slug, saved.id); }
      const courseIds = await resolveBundleCourses(bundle, tx);
      for (const course of bundle.courses) { const subjectAreaId = course.subjectAreaSlug ? areaIds.get(course.subjectAreaSlug) ?? (await tx.subjectArea.findUnique({ where: { slug: course.subjectAreaSlug }, select: { id: true } }))?.id : undefined; if (course.subjectAreaSlug && !subjectAreaId) throw new Error(`课程 ${course.slug} 的专业方向不存在。`); const saved = await tx.course.upsert({ where: { slug: course.slug }, update: { name: course.name, description: course.description, sortOrder: course.sortOrder, subjectAreaId }, create: { slug: course.slug, name: course.name, description: course.description, sortOrder: course.sortOrder, subjectAreaId } }); courseIds.set(course.slug, saved.id); }
      const pointIds = new Map<string, string>(); let createdKnowledgePoints = 0; let updatedKnowledgePoints = 0; let formulasChanged = 0; let examplesChanged = 0; let relationsChanged = 0;
      for (const point of bundle.knowledgePoints) { const courseId = courseIds.get(point.courseSlug); if (!courseId) throw new Error(`知识点 ${point.slug} 的课程不存在。`); const existing = await tx.knowledgePoint.findUnique({ where: { slug: point.slug }, select: { id: true } }); const fields: Prisma.KnowledgePointUncheckedCreateInput = { title: point.title, slug: point.slug, courseId, category: point.category ?? "CONCEPT", summary: point.summary ?? null, definition: point.definition ?? null, plainExplanation: point.plainExplanation ?? null, principle: point.principle ?? null, physicalMeaning: point.physicalMeaning ?? null, engineeringMeaning: point.engineeringMeaning ?? null, importance: point.importance ?? 3, interviewImportance: point.interviewImportance ?? 3, difficulty: point.difficulty ?? 3, reviewStatus: point.reviewStatus ?? "AI_DRAFT", source: point.source ?? null, sourceBook: point.sourceBook ?? null, sourceChapter: point.sourceChapter ?? null, sourcePage: point.sourcePage ?? null, confidence: point.confidence ?? null }; const updateData: Prisma.KnowledgePointUncheckedUpdateInput = { title: point.title, courseId }; for (const key of ["category", "summary", "definition", "plainExplanation", "principle", "physicalMeaning", "engineeringMeaning", "importance", "interviewImportance", "difficulty", "reviewStatus", "source", "sourceBook", "sourceChapter", "sourcePage", "confidence"] as const) if (has(point, key)) Object.assign(updateData, { [key]: point[key] }); const saved = existing ? await tx.knowledgePoint.update({ where: { id: existing.id }, data: updateData }) : await tx.knowledgePoint.create({ data: fields }); pointIds.set(point.slug, saved.id); if (existing) updatedKnowledgePoints++; else createdKnowledgePoints++; }
      for (const point of bundle.knowledgePoints) { const pointId = pointIds.get(point.slug); if (!pointId) throw new Error(`知识点 ${point.slug} 导入失败。`); for (const formula of point.formulas ?? []) { const nativeId = formula.key.startsWith("db:") ? formula.key.slice(3) : ""; const id = nativeId && await tx.formula.findUnique({ where: { id: nativeId }, select: { id: true } }) ? nativeId : formulaIdForImport(point.slug, formula.key); const existed = await tx.formula.findUnique({ where: { id }, select: { id: true } }); await tx.formula.upsert({ where: { id }, update: { knowledgePointId: pointId, name: formula.name, latex: formula.latex, description: formula.description, conditions: formula.conditions, sortOrder: formula.sortOrder }, create: { id, knowledgePointId: pointId, name: formula.name, latex: formula.latex, description: formula.description, conditions: formula.conditions, sortOrder: formula.sortOrder } }); formulasChanged += existed ? 1 : 1; } for (const example of point.examples ?? []) { const nativeId = example.key.startsWith("db:") ? example.key.slice(3) : ""; const id = nativeId && await tx.example.findUnique({ where: { id: nativeId }, select: { id: true } }) ? nativeId : exampleIdForImport(point.slug, example.key); const existed = await tx.example.findUnique({ where: { id }, select: { id: true } }); await tx.example.upsert({ where: { id }, update: { knowledgePointId: pointId, title: example.title, content: example.content, solution: example.solution, type: example.type, sortOrder: example.sortOrder }, create: { id, knowledgePointId: pointId, title: example.title, content: example.content, solution: example.solution, type: example.type, sortOrder: example.sortOrder } }); examplesChanged += existed ? 1 : 1; } }
      for (const relation of bundle.relations) { const sourceId = pointIds.get(relation.sourceSlug) ?? (await tx.knowledgePoint.findUnique({ where: { slug: relation.sourceSlug }, select: { id: true } }))?.id; const targetId = pointIds.get(relation.targetSlug) ?? (await tx.knowledgePoint.findUnique({ where: { slug: relation.targetSlug }, select: { id: true } }))?.id; if (!sourceId || !targetId) throw new Error(`关系 ${relation.sourceSlug} → ${relation.targetSlug} 的知识点不存在。`); if (sourceId === targetId) throw new Error("知识点不能关联自身。"); const reverse = symmetricTypes.has(relation.relationType) ? await tx.knowledgeRelation.findUnique({ where: { sourceKnowledgePointId_targetKnowledgePointId_relationType: { sourceKnowledgePointId: targetId, targetKnowledgePointId: sourceId, relationType: relation.relationType } }, select: { id: true } }) : null; if (reverse) { await tx.knowledgeRelation.update({ where: { id: reverse.id }, data: { description: relation.description } }); } else { await tx.knowledgeRelation.upsert({ where: { sourceKnowledgePointId_targetKnowledgePointId_relationType: { sourceKnowledgePointId: sourceId, targetKnowledgePointId: targetId, relationType: relation.relationType } }, update: { description: relation.description }, create: { sourceKnowledgePointId: sourceId, targetKnowledgePointId: targetId, relationType: relation.relationType, description: relation.description } }); } relationsChanged++; }
      return { createdKnowledgePoints, updatedKnowledgePoints, formulas: formulasChanged, examples: examplesChanged, relations: relationsChanged };
    });
    return { ok: true as const, result };
  } catch (error) { return { ok: false as const, errors: [error instanceof Error ? error.message : "知识 Bundle 导入失败，请稍后重试。"] }; }
}

export async function exportKnowledgeBundle(courseSlug?: string) {
  const courseFilter = courseSlug ? { course: { slug: courseSlug } } : {};
  const points = await prisma.knowledgePoint.findMany({ where: courseFilter, orderBy: [{ course: { slug: "asc" } }, { slug: "asc" }], include: { course: { include: { subjectArea: true } }, formulas: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }, examples: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] } } });
  const pointIds = points.map((point) => point.id); const slugs = new Set(points.map((point) => point.slug));
  const relations = await prisma.knowledgeRelation.findMany({ where: { sourceKnowledgePointId: { in: pointIds }, targetKnowledgePointId: { in: pointIds } }, include: { source: { select: { slug: true } }, target: { select: { slug: true } } }, orderBy: [{ relationType: "asc" }, { sourceKnowledgePointId: "asc" }, { targetKnowledgePointId: "asc" }] });
  const areaMap = new Map<string, NonNullable<typeof points[number]["course"]["subjectArea"]>>();
  const courseMap = new Map<string, typeof points[number]["course"]>();
  for (const point of points) { if (point.course.subjectArea) areaMap.set(point.course.subjectArea.slug, point.course.subjectArea); courseMap.set(point.course.slug, point.course); }
  const areas = [...areaMap.values()].sort((a, b) => a.sortOrder - b.sortOrder || a.slug.localeCompare(b.slug));
  const courses = [...courseMap.values()].sort((a, b) => a.sortOrder - b.sortOrder || a.slug.localeCompare(b.slug));
  return { kind: "ee-knowledge-content" as const, schemaVersion: "1.0" as const, exportedAt: new Date().toISOString(), subjectAreas: areas.map((area) => ({ slug: area.slug, name: area.name, description: area.description, sortOrder: area.sortOrder })), courses: courses.map((course) => ({ slug: course.slug, name: course.name, description: course.description, sortOrder: course.sortOrder, subjectAreaSlug: course.subjectArea?.slug ?? null })), knowledgePoints: points.map((point) => ({ slug: point.slug, courseSlug: point.course.slug, title: point.title, category: point.category, summary: point.summary, definition: point.definition, plainExplanation: point.plainExplanation, principle: point.principle, physicalMeaning: point.physicalMeaning, engineeringMeaning: point.engineeringMeaning, importance: point.importance, interviewImportance: point.interviewImportance, difficulty: point.difficulty, reviewStatus: point.reviewStatus, source: point.source, sourceBook: point.sourceBook, sourceChapter: point.sourceChapter, sourcePage: point.sourcePage, confidence: point.confidence, formulas: point.formulas.map((formula) => ({ key: `db:${formula.id}`, name: formula.name, latex: formula.latex, description: formula.description, conditions: formula.conditions, sortOrder: formula.sortOrder })), examples: point.examples.map((example) => ({ key: `db:${example.id}`, title: example.title, type: example.type, content: example.content, solution: example.solution, sortOrder: example.sortOrder })) })), relations: relations.filter((relation) => slugs.has(relation.source.slug) && slugs.has(relation.target.slug)).map((relation) => ({ sourceSlug: relation.source.slug, targetSlug: relation.target.slug, relationType: relation.relationType, description: relation.description })) };
}
