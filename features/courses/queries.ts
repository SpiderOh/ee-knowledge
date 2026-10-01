import { prisma } from "@/lib/db";

export async function getCourseList() {
  const areas = await prisma.subjectArea.findMany({
    orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
    include: {
      courses: {
        orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
        include: {
          _count: { select: { books: true, knowledgePoints: true } },
          knowledgePoints: { select: { studyProgress: { select: { status: true } } } },
        },
      },
    },
  });
  const ungrouped = await prisma.course.findMany({ where: { subjectAreaId: null }, orderBy: [{ sortOrder: "asc" }, { slug: "asc" }], include: { _count: { select: { books: true, knowledgePoints: true } }, knowledgePoints: { select: { studyProgress: { select: { status: true } } } } } });
  return ungrouped.length ? [...areas, { id: "ungrouped", name: "未分类课程", slug: "", description: null, sortOrder: 0, courses: ungrouped }] : areas;
}

export async function getCourseBySlug(slug: string) {
  return prisma.course.findUnique({
    where: { slug },
    include: {
      subjectArea: true,
      books: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }], include: { _count: { select: { chapters: true } } } },
      knowledgePoints: { select: { studyProgress: { select: { status: true } } } },
      _count: { select: { books: true, knowledgePoints: true } },
    },
  });
}

export function calculateProgress(points: { studyProgress: { status: string } | null }[]) {
  if (!points.length) return 0;
  return Math.round(points.filter((point) => point.studyProgress !== null && point.studyProgress.status !== "NOT_STARTED").length / points.length * 100);
}
