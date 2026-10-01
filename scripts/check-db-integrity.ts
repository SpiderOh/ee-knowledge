import { PrismaClient, PracticeQuestionType } from "@prisma/client";

const prisma = new PrismaClient();
const symmetricRelations = new Set(["RELATED", "SIMILAR", "DIFFERENT"]);

async function main() {
  const errors: string[] = [];
  const tableRows = await prisma.$queryRaw<Array<{ name: string }>>`SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('PracticeQuestionOption', 'PracticeAttempt')`;
  const practiceTablesReady = tableRows.length === 2;
  if (!practiceTablesReady) console.warn("Practice integrity checks skipped: additive practice migration has not been applied to this database.");
  const [chapters, links, relations, points, reviewRecords, practiceQuestions, practiceAttempts] = await Promise.all([
    prisma.chapter.findMany({ select: { id: true, title: true, bookId: true, parentId: true, level: true, parent: { select: { id: true, title: true, bookId: true, level: true } } } }),
    prisma.chapterKnowledgePoint.findMany({ select: { id: true, chapter: { select: { id: true, title: true, book: { select: { courseId: true } } } }, knowledgePoint: { select: { id: true, title: true, courseId: true } } } }),
    prisma.knowledgeRelation.findMany({ select: { sourceKnowledgePointId: true, targetKnowledgePointId: true, relationType: true, source: { select: { slug: true } }, target: { select: { slug: true } } } }),
    prisma.knowledgePoint.findMany({ select: { id: true, title: true, importance: true, interviewImportance: true, difficulty: true, confidence: true } }),
    prisma.reviewRecord.findMany({ select: { id: true, knowledgePointId: true, result: true } }),
    practiceTablesReady ? prisma.practiceQuestion.findMany({ select: { id: true, type: true, answer: true, difficulty: true, options: { select: { key: true, content: true } } } }) : Promise.resolve([]),
    practiceTablesReady ? prisma.practiceAttempt.findMany({ select: { id: true, submittedAnswer: true } }) : Promise.resolve([]),
  ]);
  const byId = new Map(chapters.map((chapter) => [chapter.id, chapter]));
  for (const chapter of chapters) {
    if (chapter.parentId && (!chapter.parent || chapter.parent.bookId !== chapter.bookId)) errors.push(`Chapter ${chapter.id}（${chapter.title}）的 parent 不属于同一本教材。`);
    if (!chapter.parentId && chapter.level !== 1) errors.push(`根 Chapter ${chapter.id}（${chapter.title}）的 level 应为 1，实际为 ${chapter.level}。`);
    if (chapter.parent && chapter.level !== chapter.parent.level + 1) errors.push(`Chapter ${chapter.id}（${chapter.title}）的 level 与 parent 不一致。`);
    const ancestry = new Set<string>(); let current: string | null = chapter.id;
    while (current) {
      if (ancestry.has(current)) { const cycle = byId.get(current); errors.push(`Chapter 循环：${cycle?.id}（${cycle?.title ?? "未知"}）。`); break; }
      ancestry.add(current); current = byId.get(current)?.parentId ?? null;
    }
  }
  for (const link of links) if (link.chapter.book.courseId !== link.knowledgePoint.courseId) errors.push(`ChapterKnowledgePoint ${link.id} 跨课程：${link.chapter.title} 与 ${link.knowledgePoint.title}。`);
  const relationKeys = new Set(relations.map((relation) => `${relation.sourceKnowledgePointId}|${relation.targetKnowledgePointId}|${relation.relationType}`));
  for (const relation of relations) if (symmetricRelations.has(relation.relationType) && relationKeys.has(`${relation.targetKnowledgePointId}|${relation.sourceKnowledgePointId}|${relation.relationType}`) && relation.sourceKnowledgePointId !== relation.targetKnowledgePointId) errors.push(`对称关系重复：${relation.source.slug} ↔ ${relation.target.slug}（${relation.relationType}）。`);
  for (const point of points) for (const [field, value] of [["importance", point.importance], ["interviewImportance", point.interviewImportance], ["difficulty", point.difficulty]] as const) if (value < 1 || value > 5) errors.push(`KnowledgePoint ${point.id}（${point.title}）的 ${field} 超出 1～5。`); else if (field === "difficulty" && !Number.isInteger(value)) errors.push(`KnowledgePoint ${point.id}（${point.title}）的 ${field} 不是整数。`);
  for (const point of points) if (point.confidence !== null && (point.confidence < 0 || point.confidence > 1)) errors.push(`KnowledgePoint ${point.id}（${point.title}）的 confidence 超出 0～1。`);
  for (const record of reviewRecords) if (!Number.isInteger(record.result) || record.result < 0 || record.result > 3) errors.push(`ReviewRecord ${record.id}（KnowledgePoint ${record.knowledgePointId}）的 result 必须为 0～3，实际为 ${record.result}。`);
  for (const question of practiceQuestions) {
    if (!Number.isInteger(question.difficulty) || question.difficulty < 1 || question.difficulty > 5) errors.push(`PracticeQuestion ${question.id} 的 difficulty 必须为 1～5。`);
    const normalizedOptionKeys = question.options.map((option) => option.key.trim().toUpperCase());
    if (question.options.some((option) => !option.key.trim() || !option.content.trim() || !/^[A-Z0-9]+$/.test(option.key.trim().toUpperCase()))) errors.push(`PracticeQuestion ${question.id} 的选项 key 或内容不合法。`);
    if (new Set(normalizedOptionKeys).size !== normalizedOptionKeys.length) errors.push(`PracticeQuestion ${question.id} 的选项 key 规范化后重复。`);
    if (question.type === PracticeQuestionType.SINGLE_CHOICE || question.type === PracticeQuestionType.MULTIPLE_CHOICE) {
      const keys = new Set(normalizedOptionKeys);
      if (keys.size < 2 || question.options.some((option) => !option.key.trim() || !option.content.trim())) errors.push(`PracticeQuestion ${question.id} 的选项不完整。`);
      const answerKeys = question.answer.split(",").map((key) => key.trim().toUpperCase()).filter(Boolean);
      if (!answerKeys.length || answerKeys.some((key) => !keys.has(key))) errors.push(`PracticeQuestion ${question.id} 的标准答案未指向已有选项。`);
      if (question.type === PracticeQuestionType.SINGLE_CHOICE && answerKeys.length !== 1) errors.push(`PracticeQuestion ${question.id} 的单选答案必须只有一个选项。`);
    }
    if ((question.type === PracticeQuestionType.TRUE_FALSE || new Set<string>([PracticeQuestionType.FILL, PracticeQuestionType.SHORT_ANSWER, PracticeQuestionType.CALCULATION, PracticeQuestionType.COMPREHENSIVE]).has(question.type)) && question.options.length > 0) errors.push(`PracticeQuestion ${question.id} 的 ${question.type} 不应有选项记录。`);
    if (question.type === PracticeQuestionType.TRUE_FALSE && !["TRUE", "FALSE"].includes(question.answer)) errors.push(`PracticeQuestion ${question.id} 的判断题答案必须为 TRUE 或 FALSE。`);
  }
  for (const attempt of practiceAttempts) if (!attempt.submittedAnswer.trim()) errors.push(`PracticeAttempt ${attempt.id} 的 submittedAnswer 为空。`);
  const [courses, books, chapterCount, knowledgePoints, relationCount, notes, favorites, studyProgress] = await Promise.all([prisma.course.count(), prisma.book.count(), prisma.chapter.count(), prisma.knowledgePoint.count(), prisma.knowledgeRelation.count(), prisma.note.count(), prisma.favorite.count(), prisma.studyProgress.count()]);
  const activeSchedules = await prisma.reviewRecord.groupBy({ by: ["knowledgePointId"], where: { nextReviewAt: { not: null } }, _count: { _all: true } });
  for (const schedule of activeSchedules) if (schedule._count._all > 1) errors.push(`KnowledgePoint ${schedule.knowledgePointId} 存在多个有效复习计划。`);
  if (errors.length) { console.error("Database integrity check failed"); for (const error of errors) console.error(`- ${error}`); process.exitCode = 1; return; }
  console.log("Database integrity check passed", { courses, books, chapters: chapterCount, knowledgePoints, relations: relationCount, notes, favorites, studyProgress, reviewRecords: reviewRecords.length, activeSchedules: activeSchedules.length, practiceQuestions: practiceQuestions.length, practiceAttempts: practiceAttempts.length });
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
