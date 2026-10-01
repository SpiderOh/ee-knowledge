import { PrismaClient, RelationType, StudyStatus } from "@prisma/client";
import { exportKnowledgeBundle, importKnowledgeBundle, previewKnowledgeBundle } from "@/features/content-transfer/service";

const prisma = new PrismaClient();
const areaSlug = "verify-content-area";
const courseSlug = "verify-content-course";
const pointSlug = "verify-content-point";
const relatedSlug = "verify-content-related";
const existingAreaSlug = "verify-existing-area";
const existingCourseSlug = "verify-existing-course";
const newCourseSlug = "verify-new-course";
const emptyCourseSlug = "verify-empty-course";
const emptyAreaSlug = "verify-empty-area";
const hijackASlug = "verify-hijack-a";
const hijackBSlug = "verify-hijack-b";
const sortSlugs = ["verify-sort-a", "verify-sort-b", "verify-sort-c"];

const bundle = (summary = "验证内容") => ({ kind: "ee-knowledge-content" as const, schemaVersion: "1.0" as const, subjectAreas: [{ slug: areaSlug, name: "验证方向", description: null, sortOrder: 99 }], courses: [{ slug: courseSlug, name: "验证课程", description: "Content transfer verification", sortOrder: 99, subjectAreaSlug: areaSlug }], knowledgePoints: [{ slug: pointSlug, courseSlug, title: "验证知识点", category: "CONCEPT" as const, summary, definition: "## 定义\n\n验证 Markdown。", importance: 3, interviewImportance: 3, difficulty: 2, reviewStatus: "AI_DRAFT" as const, formulas: [{ key: "main", name: "验证公式", latex: "x + y = z", description: null, conditions: null, sortOrder: 0 }], examples: [{ key: "demo", title: "验证案例", type: "测试", content: "案例内容", solution: "案例解答", sortOrder: 0 }] }, { slug: relatedSlug, courseSlug, title: "验证关系目标", category: "CONCEPT" as const, summary: "关系目标", reviewStatus: "AI_DRAFT" as const }], relations: [{ sourceSlug: pointSlug, targetSlug: relatedSlug, relationType: RelationType.RELATED, description: "验证关系" }] });

function assert(condition: boolean, message: string): asserts condition { if (!condition) throw new Error(message); }

async function cleanup() {
  const pointSlugs = [pointSlug, relatedSlug, "verify-existing-point", hijackASlug, hijackBSlug, ...sortSlugs];
  await prisma.knowledgePoint.deleteMany({ where: { slug: { in: pointSlugs } } });
  await prisma.course.deleteMany({ where: { slug: { in: [courseSlug, existingCourseSlug, newCourseSlug, emptyCourseSlug] } } });
  await prisma.subjectArea.deleteMany({ where: { slug: { in: [areaSlug, existingAreaSlug, emptyAreaSlug] } } });
}

async function counts() { const [points, formulas, examples, relations] = await Promise.all([prisma.knowledgePoint.count({ where: { slug: { in: [pointSlug, relatedSlug] } } }), prisma.formula.count({ where: { knowledgePoint: { slug: pointSlug } } }), prisma.example.count({ where: { knowledgePoint: { slug: pointSlug } } }), prisma.knowledgeRelation.count({ where: { source: { slug: pointSlug }, target: { slug: relatedSlug } } })]); return { points, formulas, examples, relations }; }

async function main() {
  await cleanup();
  try {
    const first = await importKnowledgeBundle(bundle()); assert(first.ok, "第一次导入失败");
    const firstCounts = await counts(); assert(firstCounts.points === 2 && firstCounts.formulas === 1 && firstCounts.examples === 1 && firstCounts.relations === 1, "第一次导入数据不完整");
    const point = await prisma.knowledgePoint.findUniqueOrThrow({ where: { slug: pointSlug } });
    await prisma.note.create({ data: { knowledgePointId: point.id, content: "用户笔记保护测试" } });
    await prisma.studyProgress.create({ data: { knowledgePointId: point.id, status: StudyStatus.LEARNING, studyCount: 1 } });
    const second = await importKnowledgeBundle(bundle()); assert(second.ok, "第二次导入失败");
    const secondCounts = await counts(); assert(JSON.stringify(firstCounts) === JSON.stringify(secondCounts), "重复导入产生了重复数据");
    const updated = await importKnowledgeBundle(bundle("更新后的验证内容")); assert(updated.ok, "更新导入失败");
    const saved = await prisma.knowledgePoint.findUniqueOrThrow({ where: { slug: pointSlug }, include: { notes: true, studyProgress: true } });
    assert(saved.summary === "更新后的验证内容" && saved.notes.length === 1 && saved.studyProgress?.status === StudyStatus.LEARNING, "导入覆盖了用户数据或未更新内容");

    await prisma.subjectArea.create({ data: { slug: existingAreaSlug, name: "已有方向", sortOrder: 98 } });
    await prisma.course.create({ data: { slug: existingCourseSlug, name: "已有课程", subjectAreaId: (await prisma.subjectArea.findUniqueOrThrow({ where: { slug: existingAreaSlug } })).id, sortOrder: 98 } });
    const existingCourseBundle = { kind: "ee-knowledge-content" as const, schemaVersion: "1.0" as const, subjectAreas: [], courses: [], knowledgePoints: [{ slug: "verify-existing-point", courseSlug: existingCourseSlug, title: "已有课程知识点" }], relations: [] };
    const existingPreview = await previewKnowledgeBundle(existingCourseBundle); assert(existingPreview.ok, "已有课程缺省声明时预览失败");
    const existingImport = await importKnowledgeBundle(existingCourseBundle); assert(existingImport.ok, "已有课程缺省声明时导入失败");
    const newCourseBundle = { kind: "ee-knowledge-content" as const, schemaVersion: "1.0" as const, subjectAreas: [], courses: [{ slug: newCourseSlug, name: "新课程", subjectAreaSlug: existingAreaSlug }], knowledgePoints: [], relations: [] };
    assert((await previewKnowledgeBundle(newCourseBundle)).ok, "已有方向缺省声明时预览失败"); assert((await importKnowledgeBundle(newCourseBundle)).ok, "已有方向缺省声明时导入失败");

    const hijackCourse = await prisma.course.findUniqueOrThrow({ where: { slug: courseSlug } });
    const hijackA = await prisma.knowledgePoint.create({ data: { slug: hijackASlug, title: "Formula 所有者", courseId: hijackCourse.id } });
    const hijackB = await prisma.knowledgePoint.create({ data: { slug: hijackBSlug, title: "Formula 劫持者", courseId: hijackCourse.id } });
    const formulaA = await prisma.formula.create({ data: { knowledgePointId: hijackA.id, latex: "a=b" } });
    const exampleA = await prisma.example.create({ data: { knowledgePointId: hijackA.id, content: "A" } });
    const hijackBundle = { kind: "ee-knowledge-content" as const, schemaVersion: "1.0" as const, subjectAreas: [], courses: [], knowledgePoints: [{ slug: hijackBSlug, courseSlug, title: "Formula 劫持者", formulas: [{ key: `db:${formulaA.id}`, latex: "x=y" }], examples: [{ key: `db:${exampleA.id}`, content: "B" }] }], relations: [] };
    assert(!(await previewKnowledgeBundle(hijackBundle)).ok, "Foreign db key 未在预览阶段拒绝"); assert(!(await importKnowledgeBundle(hijackBundle)).ok, "Foreign db key 未在导入阶段拒绝");
    const ownership = await prisma.formula.findUniqueOrThrow({ where: { id: formulaA.id } }); const exampleOwnership = await prisma.example.findUniqueOrThrow({ where: { id: exampleA.id } }); assert(ownership.knowledgePointId === hijackA.id && exampleOwnership.knowledgePointId === hijackA.id, "Foreign db key 改变了原记录归属");

    await prisma.subjectArea.create({ data: { slug: emptyAreaSlug, name: "空方向", sortOrder: 96 } }); await prisma.course.create({ data: { slug: emptyCourseSlug, name: "空课程", sortOrder: 97, subjectAreaId: hijackCourse.subjectAreaId } });
    const allExport = await exportKnowledgeBundle(); const emptyExport = await exportKnowledgeBundle(emptyCourseSlug); assert(allExport.subjectAreas.some((area) => area.slug === emptyAreaSlug), "全量导出缺少空专业方向"); assert(allExport.courses.some((course) => course.slug === emptyCourseSlug), "全量导出缺少空课程"); assert(emptyExport.courses.length === 1 && emptyExport.courses[0]?.slug === emptyCourseSlug && emptyExport.knowledgePoints.length === 0, "空课程筛选导出不完整");
    for (const [index, slug] of sortSlugs.entries()) await prisma.knowledgePoint.create({ data: { slug, title: slug, courseId: hijackCourse.id } });
    await prisma.knowledgeRelation.create({ data: { sourceKnowledgePointId: (await prisma.knowledgePoint.findUniqueOrThrow({ where: { slug: sortSlugs[2] } })).id, targetKnowledgePointId: (await prisma.knowledgePoint.findUniqueOrThrow({ where: { slug: sortSlugs[0] } })).id, relationType: RelationType.RELATED } });
    await prisma.knowledgeRelation.create({ data: { sourceKnowledgePointId: (await prisma.knowledgePoint.findUniqueOrThrow({ where: { slug: sortSlugs[0] } })).id, targetKnowledgePointId: (await prisma.knowledgePoint.findUniqueOrThrow({ where: { slug: sortSlugs[1] } })).id, relationType: RelationType.RELATED } });
    const sortExport = await exportKnowledgeBundle(courseSlug); const sortedRelations = sortExport.relations; assert(sortedRelations.every((item, index) => index === 0 || `${sortedRelations[index - 1]!.sourceSlug}:${sortedRelations[index - 1]!.relationType}:${sortedRelations[index - 1]!.targetSlug}` <= `${item.sourceSlug}:${item.relationType}:${item.targetSlug}`), "关系未按 slug 稳定排序");

    const serialized = JSON.stringify(allExport); assert(!serialized.includes("notes") && !serialized.includes("favorite") && !serialized.includes("studyProgress") && !serialized.includes("reviewRecords"), "导出包含用户学习数据");
    assert(allExport.knowledgePoints.length >= 2 && allExport.relations.length >= 1, "导出内容不完整");
    console.log("Content transfer verification passed", { firstCounts, secondCounts, existingCourse: true, existingSubjectArea: true, dbKeyProtection: true, emptyAreaExport: true, emptyCourseExport: true, stableRelationSort: true, exportedPoints: allExport.knowledgePoints.length, exportedRelations: allExport.relations.length });
  } finally { await cleanup(); }
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
