import { Prisma, PracticeQuestionType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { parsePracticeQueryParams } from "./schemas";

export type PracticeQuestionListItem = {
  id: string;
  type: PracticeQuestionType;
  question: string;
  difficulty: number;
  knowledgePoint: { slug: string; title: string; course: { name: string; slug: string } };
  latestAttempt: { isCorrect: boolean; attemptedAt: Date; submittedAnswer: string } | null;
  attemptCount: number;
  wrongCount: number;
};

function buildWhere(input: Record<string, string | undefined>): Prisma.PracticeQuestionWhereInput {
  const params = parsePracticeQueryParams(input);
  return {
    ...(params.course || params.knowledgePoint
      ? {
          knowledgePoint: {
            ...(params.course ? { course: { slug: params.course } } : {}),
            ...(params.knowledgePoint ? { slug: params.knowledgePoint } : {}),
          },
        }
      : {}),
    ...(params.type ? { type: params.type } : {}),
    ...(params.difficulty ? { difficulty: params.difficulty } : {}),
  };
}

async function getQuestionRows(where: Prisma.PracticeQuestionWhereInput) {
  const questions = await prisma.practiceQuestion.findMany({ where, orderBy: [{ difficulty: "asc" }, { id: "asc" }], select: { id: true, type: true, question: true, difficulty: true, knowledgePoint: { select: { slug: true, title: true, course: { select: { name: true, slug: true } } } }, attempts: { orderBy: [{ attemptedAt: "desc" }, { id: "desc" }], take: 1, select: { id: true, isCorrect: true, attemptedAt: true, submittedAnswer: true } }, _count: { select: { attempts: true } } } });
  const ids = questions.map((question) => question.id);
  const wrongCounts = ids.length ? await prisma.practiceAttempt.groupBy({ by: ["practiceQuestionId"], where: { practiceQuestionId: { in: ids }, isCorrect: false }, _count: { _all: true } }) : [];
  const wrongCountMap = new Map(wrongCounts.map((item) => [item.practiceQuestionId, item._count._all]));
  return questions.map((question): PracticeQuestionListItem => ({ id: question.id, type: question.type, question: question.question, difficulty: question.difficulty, knowledgePoint: question.knowledgePoint, latestAttempt: question.attempts[0] ?? null, attemptCount: question._count.attempts, wrongCount: wrongCountMap.get(question.id) ?? 0 }));
}

export async function getPracticeOverview(input: Record<string, string | undefined> = {}) {
  const where = buildWhere(input);
  const [questions, allQuestions, courses, knowledgePoints] = await Promise.all([getQuestionRows(where), getQuestionRows({}), prisma.course.findMany({ orderBy: [{ sortOrder: "asc" }, { slug: "asc" }], select: { name: true, slug: true } }), prisma.knowledgePoint.findMany({ orderBy: { title: "asc" }, select: { title: true, slug: true } })]);
  return { questions, totalQuestions: allQuestions.length, attemptedQuestionCount: allQuestions.filter((question) => question.latestAttempt).length, currentWrongCount: allQuestions.filter((question) => question.latestAttempt?.isCorrect === false).length, courses, knowledgePoints, params: parsePracticeQueryParams(input) };
}

export async function getPracticeQuestion(id: string) {
  return prisma.practiceQuestion.findUnique({ where: { id }, select: { id: true, type: true, question: true, answer: true, explanation: true, difficulty: true, knowledgePoint: { select: { id: true, slug: true, title: true, course: { select: { name: true, slug: true } } } }, options: { orderBy: { sortOrder: "asc" }, select: { id: true, key: true, content: true, sortOrder: true } }, attempts: { orderBy: [{ attemptedAt: "desc" }, { id: "desc" }], take: 10, select: { id: true, submittedAnswer: true, isCorrect: true, attemptedAt: true } } } });
}

export async function getWrongAnswerQuestions() {
  const questions = await getQuestionRows({});
  return questions.filter((question) => question.latestAttempt?.isCorrect === false);
}
