import { StudyStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getReviewOverview } from "@/features/review/queries";
import { getLearningStatistics } from "@/features/statistics/queries";

export async function getDashboardStats() {
  const [courses, pointCount, bookCount, learnedPointCount, recentStudy, reviewOverview, statistics] = await Promise.all([
    prisma.course.findMany({ orderBy: [{ sortOrder: "asc" }, { slug: "asc" }], include: { _count: { select: { knowledgePoints: true, books: true } } } }),
    prisma.knowledgePoint.count(),
    prisma.book.count(),
    prisma.studyProgress.count({ where: { status: { in: [StudyStatus.LEARNING, StudyStatus.MASTERED, StudyStatus.REVIEW] } } }),
    prisma.studyProgress.findMany({ where: { lastStudiedAt: { not: null }, status: { not: StudyStatus.NOT_STARTED } }, orderBy: { lastStudiedAt: "desc" }, take: 5, select: { lastStudiedAt: true, knowledgePoint: { select: { title: true, slug: true, course: { select: { name: true } } } } } }),
    getReviewOverview(),
    getLearningStatistics(),
  ]);
  return { courses, pointCount, bookCount, learnedPointCount, reviewCount: reviewOverview.dueCount, currentWrongCount: statistics.currentWrongCount, recentStudy };
}
