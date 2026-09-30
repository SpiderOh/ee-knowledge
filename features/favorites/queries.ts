import { prisma } from "@/lib/db";

export async function getFavoriteKnowledgePoints() {
  return prisma.favorite.findMany({
    orderBy: { createdAt: "desc" },
    select: { createdAt: true, knowledgePoint: { select: { title: true, slug: true, summary: true, importance: true, interviewImportance: true, category: true, course: { select: { name: true } } } } },
  });
}
