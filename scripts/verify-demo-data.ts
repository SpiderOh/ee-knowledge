import { PrismaClient } from "@prisma/client";
import { getOrderedBookKnowledgePoints } from "@/features/books/queries";

const prisma = new PrismaClient();
const expectedOrder = ["电路模型", "电流", "电压", "电功率", "基尔霍夫电流定律", "基尔霍夫电压定律", "电阻电路等效变换", "叠加定理", "戴维南定理", "诺顿定理"];

async function main() {
  const [subjectAreaCount, courseCount, bookCount, knowledgePointCount, chapterCount, demoBook] = await Promise.all([
    prisma.subjectArea.count(), prisma.course.count(), prisma.book.count(), prisma.knowledgePoint.count(), prisma.chapter.count(), prisma.book.findUnique({ where: { id: "demo-circuit-book" }, select: { id: true } }),
  ]);
  if (!demoBook) throw new Error("demo-circuit-book 不存在");
  const relationCount = await prisma.chapterKnowledgePoint.count({ where: { chapter: { bookId: demoBook.id } } });
  const ordered = await getOrderedBookKnowledgePoints(demoBook.id);
  const names = ordered.map((point) => point.title);
  console.log(`SubjectArea: ${subjectAreaCount}`);
  console.log(`Course: ${courseCount}`);
  console.log(`Book: ${bookCount}`);
  console.log(`KnowledgePoint: ${knowledgePointCount}`);
  console.log(`Chapter: ${chapterCount}`);
  console.log(`demo-circuit-book ChapterKnowledgePoint: ${relationCount}`);
  console.log(`阅读顺序: ${names.join(" → ")}`);
  if (knowledgePointCount !== 10 || relationCount !== 10 || ordered.length !== 10 || names.join("|") !== expectedOrder.join("|")) throw new Error("Demo 数据或教材阅读顺序不符合预期");
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(() => prisma.$disconnect());
