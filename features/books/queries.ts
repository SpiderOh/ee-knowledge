import { prisma } from "@/lib/db";

export async function getBookById(id: string) {
  return prisma.book.findUnique({
    where: { id },
    include: {
      course: true,
      chapters: {
        orderBy: [{ level: "asc" }, { sortOrder: "asc" }],
        include: {
          knowledgePoints: { orderBy: { sortOrder: "asc" }, include: { knowledgePoint: true } },
        },
      },
      _count: { select: { chapters: true } },
    },
  });
}
