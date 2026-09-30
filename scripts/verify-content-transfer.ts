import { PrismaClient, RelationType, StudyStatus } from "@prisma/client";
import { exportKnowledgeBundle, importKnowledgeBundle } from "@/features/content-transfer/service";

const prisma = new PrismaClient();
const areaSlug = "verify-content-area";
const courseSlug = "verify-content-course";
const pointSlug = "verify-content-point";
const relatedSlug = "verify-content-related";

const bundle = (summary = "验证内容") => ({ kind: "ee-knowledge-content" as const, schemaVersion: "1.0" as const, subjectAreas: [{ slug: areaSlug, name: "验证方向", description: null, sortOrder: 99 }], courses: [{ slug: courseSlug, name: "验证课程", description: "Content transfer verification", sortOrder: 99, subjectAreaSlug: areaSlug }], knowledgePoints: [{ slug: pointSlug, courseSlug, title: "验证知识点", category: "CONCEPT" as const, summary, definition: "## 定义\n\n验证 Markdown。", importance: 3, interviewImportance: 3, difficulty: 2, reviewStatus: "AI_DRAFT" as const, formulas: [{ key: "main", name: "验证公式", latex: "x + y = z", description: null, conditions: null, sortOrder: 0 }], examples: [{ key: "demo", title: "验证案例", type: "测试", content: "案例内容", solution: "案例解答", sortOrder: 0 }] }, { slug: relatedSlug, courseSlug, title: "验证关系目标", category: "CONCEPT" as const, summary: "关系目标", reviewStatus: "AI_DRAFT" as const }], relations: [{ sourceSlug: pointSlug, targetSlug: relatedSlug, relationType: RelationType.RELATED, description: "验证关系" }] });

function assert(condition: boolean, message: string): asserts condition { if (!condition) throw new Error(message); }

async function cleanup() {
  await prisma.knowledgePoint.deleteMany({ where: { slug: { in: [pointSlug, relatedSlug] } } });
  await prisma.course.deleteMany({ where: { slug: courseSlug } });
  await prisma.subjectArea.deleteMany({ where: { slug: areaSlug } });
}

async function main() {
  await cleanup();
  try {
    const first = await importKnowledgeBundle(bundle()); assert(first.ok, "第一次导入失败");
    const firstCounts = await counts();
    assert(firstCounts.points === 2 && firstCounts.formulas === 1 && firstCounts.examples === 1 && firstCounts.relations === 1, "第一次导入数据不完整");
    const point = await prisma.knowledgePoint.findUniqueOrThrow({ where: { slug: pointSlug } });
    await prisma.note.create({ data: { knowledgePointId: point.id, content: "用户笔记保护测试" } });
    await prisma.studyProgress.create({ data: { knowledgePointId: point.id, status: StudyStatus.LEARNING, studyCount: 1 } });
    const second = await importKnowledgeBundle(bundle()); assert(second.ok, "第二次导入失败");
    const secondCounts = await counts(); assert(JSON.stringify(firstCounts) === JSON.stringify(secondCounts), "重复导入产生了重复数据");
    const updated = await importKnowledgeBundle(bundle("更新后的验证内容")); assert(updated.ok, "更新导入失败");
    const saved = await prisma.knowledgePoint.findUniqueOrThrow({ where: { slug: pointSlug }, include: { notes: true, studyProgress: true } });
    assert(saved.summary === "更新后的验证内容" && saved.notes.length === 1 && saved.studyProgress?.status === StudyStatus.LEARNING, "导入覆盖了用户数据或未更新内容");
    const exported = await exportKnowledgeBundle(courseSlug);
    const serialized = JSON.stringify(exported); assert(!serialized.includes("notes") && !serialized.includes("favorite") && !serialized.includes("studyProgress") && !serialized.includes("reviewRecords"), "导出包含用户学习数据");
    assert(exported.knowledgePoints.length === 2 && exported.relations.length === 1, "导出内容不完整");
    console.log("Content transfer verification passed", { firstCounts, secondCounts, exportedPoints: exported.knowledgePoints.length, exportedRelations: exported.relations.length });
  } finally { await cleanup(); }
}

async function counts() { const [points, formulas, examples, relations] = await Promise.all([prisma.knowledgePoint.count({ where: { slug: { in: [pointSlug, relatedSlug] } } }), prisma.formula.count({ where: { knowledgePoint: { slug: pointSlug } } }), prisma.example.count({ where: { knowledgePoint: { slug: pointSlug } } }), prisma.knowledgeRelation.count({ where: { source: { slug: pointSlug }, target: { slug: relatedSlug } } })]); return { points, formulas, examples, relations }; }

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
