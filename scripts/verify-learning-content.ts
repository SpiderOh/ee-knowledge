import { KnowledgeCategory, PrismaClient, ReviewStatus } from "@prisma/client";
import { getKnowledgePointBySlug } from "@/features/knowledge/queries";
import { getSearchResults } from "@/features/search/queries";
import { createKnowledgePoint, deleteKnowledgeQuestion, saveKnowledgeQuestion, updateKnowledgePoint } from "@/features/content-management/actions";

const prisma = new PrismaClient();
const slug = "verify-learning-content-point";
const textFields = { definition: null, plainExplanation: null, principle: null, physicalMeaning: null, engineeringMeaning: null, source: null, sourceBook: null, sourceChapter: null, sourcePage: null, confidence: null } as const;

async function main() {
  const demo = await prisma.knowledgePoint.findUniqueOrThrow({ where: { slug: "kirchhoff-current-law" } });
  if (!demo.commonMistakes || !demo.masteryCriteria) throw new Error("KCL learning content is missing");
  const before = await Promise.all([prisma.studyProgress.count(), prisma.reviewRecord.count(), prisma.practiceAttempt.count()]);
  const loaded = await getKnowledgePointBySlug(demo.slug);
  const after = await Promise.all([prisma.studyProgress.count(), prisma.reviewRecord.count(), prisma.practiceAttempt.count()]);
  if (!loaded || loaded.interviewQuestions.length < 1 || loaded.interviewQuestions[0].answers.length < 2) throw new Error("KnowledgePoint query did not return learning questions and answers");
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error("KnowledgePoint learning read changed study side effects");

  const course = await prisma.course.findUniqueOrThrow({ where: { slug: "circuit-theory" } });
  await prisma.knowledgePoint.deleteMany({ where: { slug } });
  const created = await createKnowledgePoint({ title: "验证学习内容", slug, courseId: course.id, category: KnowledgeCategory.CONCEPT, summary: "验证摘要", commonMistakes: "verify-mistake-token", masteryCriteria: "verify-mastery-token", ...textFields, importance: 3, interviewImportance: 3, difficulty: 2, reviewStatus: ReviewStatus.AI_DRAFT });
  if (!created.ok) throw new Error(created.error);
  const point = await prisma.knowledgePoint.findUniqueOrThrow({ where: { slug } });
  const updated = await updateKnowledgePoint({ id: point.id, oldSlug: slug, title: point.title, slug, courseId: course.id, category: KnowledgeCategory.CONCEPT, summary: point.summary, commonMistakes: "verify-mistake-token-updated", masteryCriteria: "verify-mastery-token-updated", ...textFields, importance: 3, interviewImportance: 3, difficulty: 2, reviewStatus: ReviewStatus.AI_DRAFT });
  if (!updated.ok) throw new Error(updated.error);
  const cleared = await updateKnowledgePoint({ id: point.id, oldSlug: slug, title: point.title, slug, courseId: course.id, category: KnowledgeCategory.CONCEPT, summary: point.summary, commonMistakes: "", masteryCriteria: "", ...textFields, importance: 3, interviewImportance: 3, difficulty: 2, reviewStatus: ReviewStatus.AI_DRAFT });
  if (!cleared.ok) throw new Error(cleared.error);
  const clearedPoint = await prisma.knowledgePoint.findUniqueOrThrow({ where: { id: point.id } });
  if (clearedPoint.commonMistakes !== null || clearedPoint.masteryCriteria !== null) throw new Error("Blank learning fields were not normalized to null");
  const restored = await updateKnowledgePoint({ id: point.id, oldSlug: slug, title: point.title, slug, courseId: course.id, category: KnowledgeCategory.CONCEPT, summary: point.summary, commonMistakes: "verify-mistake-token", masteryCriteria: "verify-mastery-token", ...textFields, importance: 3, interviewImportance: 3, difficulty: 2, reviewStatus: ReviewStatus.AI_DRAFT });
  if (!restored.ok) throw new Error(restored.error);

  const qA = await saveKnowledgeQuestion({ knowledgePointId: point.id, question: "verify question A", level: 3, frequency: 3, source: "verify", shortAnswer: "A short", standardAnswer: "A standard", deepAnswer: "A deep" });
  const qB = await saveKnowledgeQuestion({ knowledgePointId: point.id, question: "verify question B", level: 4, frequency: 5, source: "verify", shortAnswer: "B short", standardAnswer: "B standard", deepAnswer: "B deep" });
  const qC = await saveKnowledgeQuestion({ knowledgePointId: point.id, question: "verify question C", level: 1, frequency: 5, source: "verify", shortAnswer: "C short", standardAnswer: "C standard", deepAnswer: "C deep" });
  if (!qA.ok || !qB.ok || !qC.ok) throw new Error("Question CRUD setup failed");
  const ordered = await getKnowledgePointBySlug(slug);
  if (!ordered || ordered.interviewQuestions.slice(0, 3).map((question) => question.question).join("|") !== "verify question C|verify question B|verify question A") throw new Error("Question ordering is not frequency DESC / level ASC");
  const searchMistake = await getSearchResults({ q: "verify-mistake-token" });
  const searchMastery = await getSearchResults({ q: "verify-mastery-token" });
  const searchQuestion = await getSearchResults({ q: "verify question B" });
  const searchAnswer = await getSearchResults({ q: "B standard" });
  if (!searchMistake.knowledgePoints.some((item) => item.slug === slug) || !searchMastery.knowledgePoints.some((item) => item.slug === slug) || !searchQuestion.knowledgePoints.some((item) => item.slug === slug) || searchAnswer.knowledgePoints.some((item) => item.slug === slug)) throw new Error("Learning content search field boundaries failed");

  const foreignQuestion = await prisma.interviewQuestion.create({ data: { knowledgePointId: point.id, question: "foreign owner original" } });
  const foreignAttempt = await saveKnowledgeQuestion({ id: foreignQuestion.id, knowledgePointId: demo.id, question: "should reject", level: 1, frequency: 1, source: null });
  if (foreignAttempt.ok) throw new Error("Existing foreign question edit was accepted");
  const foreignUnchanged = await prisma.interviewQuestion.findUniqueOrThrow({ where: { id: foreignQuestion.id } });
  if (foreignUnchanged.knowledgePointId !== point.id || foreignUnchanged.question !== "foreign owner original") throw new Error("Foreign question ownership changed original record");
  const cascadeQuestion = await saveKnowledgeQuestion({ knowledgePointId: point.id, question: "cascade question", level: 1, frequency: 1, source: null, shortAnswer: "cascade short", standardAnswer: "cascade standard", deepAnswer: null });
  if (!cascadeQuestion.ok) throw new Error(cascadeQuestion.error);
  const cascadeRecord = await prisma.interviewQuestion.findFirstOrThrow({ where: { knowledgePointId: point.id, question: "cascade question" } });
  if (!(await deleteKnowledgeQuestion({ id: cascadeRecord.id, knowledgePointId: point.id })).ok) throw new Error("Question delete failed");
  if (await prisma.interviewQuestion.findUnique({ where: { id: cascadeRecord.id } }) || await prisma.interviewAnswer.count({ where: { interviewQuestionId: cascadeRecord.id } })) throw new Error("Question answer cascade delete failed");
  await prisma.knowledgePoint.delete({ where: { id: point.id } });
  console.log("Learning content verification passed", { fieldCrud: true, blankToNull: true, questionOrdering: true, searchBoundaries: true, foreignOwnership: true, deleteCascade: true, readSideEffects: "none" });
}
main().catch((error) => { console.error(error); process.exit(1); }).finally(() => prisma.$disconnect());
