import { PrismaClient } from "@prisma/client";
import { getKnowledgePointBySlug } from "@/features/knowledge/queries";
import { getSearchResults } from "@/features/search/queries";
import { saveKnowledgeQuestion, deleteKnowledgeQuestion } from "@/features/content-management/actions";

const prisma = new PrismaClient();
async function main() {
  const point = await prisma.knowledgePoint.findUniqueOrThrow({ where: { slug: "kirchhoff-current-law" } });
  if (!point.commonMistakes || !point.masteryCriteria) throw new Error("KCL learning content is missing");
  const loaded = await getKnowledgePointBySlug(point.slug);
  if (!loaded || loaded.interviewQuestions.length < 1 || loaded.interviewQuestions[0].answers.length < 2) throw new Error("KnowledgePoint query did not return learning questions and answers");
  const searchMistakes = await getSearchResults({ q: "节点电流" });
  if (!searchMistakes.knowledgePoints.some((item) => item.slug === point.slug)) throw new Error("Learning content search failed");
  const searchQuestion = await getSearchResults({ q: "什么是基尔霍夫电流定律" });
  if (!searchQuestion.knowledgePoints.some((item) => item.slug === point.slug)) throw new Error("Question search failed");
  const created = await saveKnowledgeQuestion({ knowledgePointId: point.id, question: "verify temporary question", level: 1, frequency: 1, source: "verify", shortAnswer: "short", standardAnswer: "standard", deepAnswer: null });
  if (!created.ok) throw new Error(created.error);
  const question = await prisma.interviewQuestion.findFirstOrThrow({ where: { knowledgePointId: point.id, question: "verify temporary question" } });
  const updated = await saveKnowledgeQuestion({ id: question.id, knowledgePointId: point.id, question: "verify updated question", level: 2, frequency: 4, source: null, shortAnswer: null, standardAnswer: "updated", deepAnswer: undefined });
  if (!updated.ok) throw new Error(updated.error);
  const answers = await prisma.interviewAnswer.findMany({ where: { interviewQuestionId: question.id } });
  if (answers.length !== 1 || answers[0].content !== "updated") throw new Error("Question answer null/undefined semantics failed");
  const deleted = await deleteKnowledgeQuestion({ id: question.id, knowledgePointId: point.id });
  if (!deleted.ok || await prisma.interviewQuestion.findUnique({ where: { id: question.id } })) throw new Error("Question delete failed");
  const foreign = await saveKnowledgeQuestion({ id: "missing-question", knowledgePointId: point.id, question: "x", level: 1, frequency: 1, source: null });
  if (foreign.ok) throw new Error("Foreign or missing question ownership check failed");
  console.log("Learning content verification passed");
}
main().catch((error) => { console.error(error); process.exit(1); }).finally(() => prisma.$disconnect());
