import { StudyStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { calculateProgress } from "@/features/courses/queries";
import { getReviewOverview } from "@/features/review/queries";
import { buildDailyActivity, buildStatusDistribution, percentage } from "./aggregate";
import { type CourseStatistics } from "./types";

function sortAttempts<T extends { attemptedAt: Date; id: string }>(items: T[]) {
  return [...items].sort((a, b) => b.attemptedAt.getTime() - a.attemptedAt.getTime() || b.id.localeCompare(a.id));
}

export async function getLearningStatistics(now = new Date()) {
  const [courses, points, reviewRecords, questions, attempts, reviewOverview] = await Promise.all([
    prisma.course.findMany({ orderBy: [{ sortOrder: "asc" }, { slug: "asc" }], select: { id: true, slug: true, name: true } }),
    prisma.knowledgePoint.findMany({ select: { id: true, title: true, slug: true, courseId: true, studyProgress: { select: { status: true, studyCount: true, lastStudiedAt: true } } } }),
    prisma.reviewRecord.findMany({ orderBy: [{ reviewedAt: "desc" }, { id: "desc" }], select: { id: true, result: true, reviewedAt: true, nextReviewAt: true, knowledgePoint: { select: { id: true, title: true, slug: true, course: { select: { id: true, name: true } } } } } }),
    prisma.practiceQuestion.findMany({ select: { id: true, question: true, type: true, knowledgePoint: { select: { id: true, title: true, slug: true, course: { select: { id: true, name: true } } } } } }),
    prisma.practiceAttempt.findMany({ orderBy: [{ attemptedAt: "desc" }, { id: "desc" }], select: { id: true, isCorrect: true, attemptedAt: true, practiceQuestionId: true, question: { select: { id: true, question: true, type: true, knowledgePoint: { select: { id: true, title: true, slug: true, course: { select: { id: true, name: true } } } } } } } }),
    getReviewOverview(now),
  ]);
  const statusCounts = { notStarted: 0, learning: 0, mastered: 0, review: 0 };
  for (const point of points) {
    switch (point.studyProgress?.status ?? StudyStatus.NOT_STARTED) {
      case StudyStatus.LEARNING: statusCounts.learning += 1; break;
      case StudyStatus.MASTERED: statusCounts.mastered += 1; break;
      case StudyStatus.REVIEW: statusCounts.review += 1; break;
      default: statusCounts.notStarted += 1;
    }
  }
  const latestAttemptByQuestion = new Map<string, (typeof attempts)[number]>();
  for (const attempt of sortAttempts(attempts)) if (!latestAttemptByQuestion.has(attempt.practiceQuestionId)) latestAttemptByQuestion.set(attempt.practiceQuestionId, attempt);
  const successfulReviewCount = reviewRecords.filter((record) => record.result >= 2).length;
  const correctPracticeAttempts = attempts.filter((attempt) => attempt.isCorrect).length;
  const startedKnowledgePoints = statusCounts.learning + statusCounts.mastered + statusCounts.review;
  const courseStats = buildCourseStatistics(courses, points, reviewRecords, questions, attempts, latestAttemptByQuestion);
  return {
    totalKnowledgePoints: points.length,
    startedKnowledgePoints,
    masteredKnowledgePoints: statusCounts.mastered,
    learningKnowledgePoints: statusCounts.learning,
    reviewStatusKnowledgePoints: statusCounts.review,
    notStartedKnowledgePoints: statusCounts.notStarted,
    dueReviewCount: reviewOverview.dueCount,
    overdueReviewCount: reviewOverview.overdueCount,
    totalReviewRecords: reviewRecords.length,
    successfulReviewRecords: successfulReviewCount,
    reviewSuccessRate: percentage(successfulReviewCount, reviewRecords.length),
    totalPracticeQuestions: questions.length,
    attemptedPracticeQuestions: new Set(attempts.map((attempt) => attempt.practiceQuestionId)).size,
    totalPracticeAttempts: attempts.length,
    correctPracticeAttempts,
    practiceAccuracy: percentage(correctPracticeAttempts, attempts.length),
    currentWrongCount: [...latestAttemptByQuestion.values()].filter((attempt) => !attempt.isCorrect).length,
    statusDistribution: buildStatusDistribution(statusCounts, points.length),
    activity: buildDailyActivity(reviewRecords.map((record) => ({ occurredAt: record.reviewedAt })), attempts.map((attempt) => ({ occurredAt: attempt.attemptedAt })), now),
    courses: courseStats,
    hasStudyHistory: points.some((point) => (point.studyProgress?.studyCount ?? 0) > 0 || point.studyProgress !== null && point.studyProgress.lastStudiedAt !== null),
    recentReviews: reviewRecords.slice(0, 5),
    recentPractice: attempts.slice(0, 5),
  };
}

function buildCourseStatistics(courses: Array<{ id: string; slug: string; name: string }>, points: Array<{ id: string; courseId: string; studyProgress: { status: StudyStatus } | null }>, reviews: Array<{ result: number; knowledgePoint: { course: { id: string } } }>, questions: Array<{ id: string; knowledgePoint: { course: { id: string } } }>, attempts: Array<{ practiceQuestionId: string; isCorrect: boolean }>, latestAttempts: Map<string, { isCorrect: boolean }>) {
  return courses.map((course): CourseStatistics => {
    const coursePoints = points.filter((point) => point.courseId === course.id);
    const started = coursePoints.filter((point) => point.studyProgress?.status !== undefined && point.studyProgress.status !== StudyStatus.NOT_STARTED).length;
    const courseReviews = reviews.filter((review) => review.knowledgePoint.course.id === course.id);
    const courseQuestions = questions.filter((question) => question.knowledgePoint.course.id === course.id);
    const courseQuestionIds = new Set(courseQuestions.map((question) => question.id));
    const courseAttempts = attempts.filter((attempt) => courseQuestionIds.has(attempt.practiceQuestionId));
    const currentWrongCount = courseQuestions.filter((question) => latestAttempts.get(question.id)?.isCorrect === false).length;
    return { id: course.id, slug: course.slug, name: course.name, totalKnowledgePoints: coursePoints.length, startedKnowledgePoints: started, masteredKnowledgePoints: coursePoints.filter((point) => point.studyProgress?.status === StudyStatus.MASTERED).length, progressPercent: calculateProgress(coursePoints.map((point) => ({ studyProgress: point.studyProgress ? { status: point.studyProgress.status } : null }))), reviewRecordCount: courseReviews.length, successfulReviewCount: courseReviews.filter((review) => review.result >= 2).length, practiceQuestionCount: courseQuestions.length, practiceAttemptCount: courseAttempts.length, correctPracticeAttemptCount: courseAttempts.filter((attempt) => attempt.isCorrect).length, currentWrongCount };
  });
}
