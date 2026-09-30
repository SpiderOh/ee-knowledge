import { StudyStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function getDashboardStats() {
  const [courses, pointCount, bookCount, learnedPointCount, reviewCount, recentStudy] = await Promise.all([
    prisma.course.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { knowledgePoints: true, books: true } } } }),
    prisma.knowledgePoint.count(),
    prisma.book.count(),
    prisma.studyProgress.count({ where: { status: { in: [StudyStatus.LEARNING, StudyStatus.MASTERED, StudyStatus.REVIEW] } } }),
    prisma.studyProgress.count({ where: { status: StudyStatus.REVIEW } }),
    prisma.studyProgress.findMany({ where: { lastStudiedAt: { not: null }, status: { not: StudyStatus.NOT_STARTED } }, orderBy: { lastStudiedAt: "desc" }, take: 5, select: { lastStudiedAt: true, knowledgePoint: { select: { title: true, slug: true, course: { select: { name: true } } } } } }),
  ]);
  return { courses, pointCount, bookCount, learnedPointCount, reviewCount, recentStudy };
}
