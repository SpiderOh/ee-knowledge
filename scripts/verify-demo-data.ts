import { PrismaClient } from "@prisma/client";
import { getOrderedBookKnowledgePoints } from "@/features/books/queries";

const prisma = new PrismaClient();
const demoKnowledgePointSlugs = ["circuit-model", "electric-current", "electric-voltage", "electric-power", "kirchhoff-current-law", "kirchhoff-voltage-law", "resistor-equivalent", "superposition-theorem", "thevenin-theorem", "norton-theorem"];
const expectedOrder = ["电路模型", "电流", "电压", "电功率", "基尔霍夫电流定律", "基尔霍夫电压定律", "电阻电路等效变换", "叠加定理", "戴维南定理", "诺顿定理"];

async function main() {
  const [subjectAreaCount, courseCount, bookCount, knowledgePointCount, chapterCount, demoBook] = await Promise.all([
    prisma.subjectArea.count(), prisma.course.count(), prisma.book.count(), prisma.knowledgePoint.count(), prisma.chapter.count(), prisma.book.findUnique({ where: { id: "demo-circuit-book" }, select: { id: true } }),
  ]);
  if (!demoBook) throw new Error("demo-circuit-book 不存在");
  const [relationCount, demoPoints, kclFormula, kvlFormula, kclExample, relationCurrentKcl, relationKclKvl, relationKvlKcl] = await Promise.all([
    prisma.chapterKnowledgePoint.count({ where: { chapter: { bookId: demoBook.id } } }),
    prisma.knowledgePoint.findMany({ where: { slug: { in: demoKnowledgePointSlugs } }, select: { slug: true } }),
    prisma.formula.findUnique({ where: { id: "demo-formula-kcl-1" }, select: { id: true } }),
    prisma.formula.findUnique({ where: { id: "demo-formula-kvl-1" }, select: { id: true } }),
    prisma.example.findUnique({ where: { id: "demo-example-kcl-1" }, select: { id: true } }),
    prisma.knowledgeRelation.findUnique({ where: { sourceKnowledgePointId_targetKnowledgePointId_relationType: { sourceKnowledgePointId: (await prisma.knowledgePoint.findUniqueOrThrow({ where: { slug: "electric-current" } })).id, targetKnowledgePointId: (await prisma.knowledgePoint.findUniqueOrThrow({ where: { slug: "kirchhoff-current-law" } })).id, relationType: "PREREQUISITE" } }, select: { id: true } }),
    prisma.knowledgeRelation.count({ where: { source: { slug: "kirchhoff-current-law" }, target: { slug: "kirchhoff-voltage-law" }, relationType: "RELATED" } }),
    prisma.knowledgeRelation.count({ where: { source: { slug: "kirchhoff-voltage-law" }, target: { slug: "kirchhoff-current-law" }, relationType: "RELATED" } }),
  ]);
  const missingSlugs = demoKnowledgePointSlugs.filter((slug) => !demoPoints.some((point) => point.slug === slug));
  const ordered = await getOrderedBookKnowledgePoints(demoBook.id);
  const names = ordered.map((point) => point.title);
  console.log(`SubjectArea: ${subjectAreaCount}`);
  console.log(`Course: ${courseCount}`);
  console.log(`Book: ${bookCount}`);
  console.log(`KnowledgePoint: ${knowledgePointCount}`);
  console.log(`Chapter: ${chapterCount}`);
  console.log(`demo-circuit-book ChapterKnowledgePoint: ${relationCount}`);
  console.log(`阅读顺序: ${names.join(" → ")}`);
  if (missingSlugs.length > 0 || relationCount !== 10 || ordered.length !== 10 || names.join("|") !== expectedOrder.join("|") || !kclFormula || !kvlFormula || !kclExample || !relationCurrentKcl || relationKclKvl !== 1 || relationKvlKcl !== 0) throw new Error(`Demo 数据或教材阅读顺序不符合预期，缺少：${missingSlugs.join(", ")}`);
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(() => prisma.$disconnect());
