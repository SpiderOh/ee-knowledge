import { prisma } from "@/lib/db";

export async function getKnowledgePointBySlug(slug: string) {
  return prisma.knowledgePoint.findUnique({
    where: { slug },
    include: {
      course: true,
      formulas: { orderBy: { sortOrder: "asc" } },
      chapters: {
        orderBy: { sortOrder: "asc" },
        include: {
          chapter: { include: { book: true } },
        },
      },
      studyProgress: true,
    },
  });
}

export async function getBookContext(bookId: string, knowledgePointId: string) {
  const links = await prisma.chapterKnowledgePoint.findMany({
    where: { chapter: { bookId }, knowledgePointId },
    orderBy: { sortOrder: "asc" },
    include: { chapter: { include: { book: true } }, knowledgePoint: true },
  });
  const chapterIds = links.map((link) => link.chapterId);
  if (!chapterIds.length) return null;
  const all = await prisma.chapterKnowledgePoint.findMany({
    where: { chapterId: { in: chapterIds } },
    orderBy: { sortOrder: "asc" },
    include: { knowledgePoint: true },
  });
  const currentIndex = all.findIndex((link) => link.knowledgePointId === knowledgePointId);
  return { current: links[0], previous: currentIndex > 0 ? all[currentIndex - 1].knowledgePoint : null, next: currentIndex >= 0 && currentIndex < all.length - 1 ? all[currentIndex + 1].knowledgePoint : null };
}
