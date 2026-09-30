import { prisma } from "@/lib/db";

export async function getCourseList() {
  return prisma.subjectArea.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      courses: {
        orderBy: { sortOrder: "asc" },
        include: {
          _count: { select: { books: true, knowledgePoints: true } },
          knowledgePoints: { select: { studyProgress: { select: { status: true } } } },
        },
      },
    },
  });
}

export async function getCourseBySlug(slug: string) {
  return prisma.course.findUnique({
    where: { slug },
    include: {
      subjectArea: true,
      books: { orderBy: { sortOrder: "asc" }, include: { _count: { select: { chapters: true } } } },
      knowledgePoints: { select: { studyProgress: { select: { status: true } } } },
      _count: { select: { books: true, knowledgePoints: true } },
    },
  });
}

export function calculateProgress(points: { studyProgress: { status: string } | null }[]) {
  if (!points.length) return 0;
  return Math.round(points.filter((point) => point.studyProgress !== null && point.studyProgress.status !== "NOT_STARTED").length / points.length * 100);
}
