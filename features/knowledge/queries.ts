import { prisma } from "@/lib/db";
import { getOrderedBookKnowledgePoints } from "@/features/books/queries";

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
      favorite: true,
      notes: { orderBy: { updatedAt: "desc" } },
    },
  });
}

export async function getBookContext(bookId: string, knowledgePointId: string) {
  const ordered = await getOrderedBookKnowledgePoints(bookId);
  const currentIndex = ordered.findIndex((point) => point.knowledgePointId === knowledgePointId);
  if (currentIndex < 0) return null;
  return { current: ordered[currentIndex], previous: currentIndex > 0 ? ordered[currentIndex - 1] : null, next: currentIndex < ordered.length - 1 ? ordered[currentIndex + 1] : null };
}
