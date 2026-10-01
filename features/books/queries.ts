import { prisma } from "@/lib/db";

export type OrderedBookKnowledgePoint = {
  knowledgePointId: string;
  title: string;
  slug: string;
  chapterId: string;
  chapterTitle: string;
};

export async function getBookById(id: string) {
  return prisma.book.findUnique({
    where: { id },
    include: {
      course: true,
      chapters: {
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        include: {
          knowledgePoints: { orderBy: { sortOrder: "asc" }, include: { knowledgePoint: true } },
        },
      },
      _count: { select: { chapters: true } },
    },
  });
}

export async function getOrderedBookKnowledgePoints(bookId: string): Promise<OrderedBookKnowledgePoint[]> {
  const chapters = await prisma.chapter.findMany({
    where: { bookId },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    select: {
      id: true,
      title: true,
      parentId: true,
      sortOrder: true,
      knowledgePoints: {
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        select: { sortOrder: true, knowledgePoint: { select: { id: true, title: true, slug: true } } },
      },
    },
  });
  const children = new Map<string | null, typeof chapters>();
  for (const chapter of chapters) {
    const siblings = children.get(chapter.parentId) ?? [];
    siblings.push(chapter);
    children.set(chapter.parentId, siblings);
  }
  for (const siblings of children.values()) siblings.sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));

  const parentById = new Map(chapters.map((chapter) => [chapter.id, chapter.parentId]));
  for (const chapter of chapters) { const chain = new Set<string>(); let current: string | null = chapter.id; while (current) { if (chain.has(current)) throw new Error("章节树数据存在循环，请先修复结构。"); chain.add(current); current = parentById.get(current) ?? null; } }

  const ordered: OrderedBookKnowledgePoint[] = [];
  const seen = new Set<string>();
  const visiting = new Set<string>();
  const visit = (parentId: string | null) => {
    for (const chapter of children.get(parentId) ?? []) {
      if (visiting.has(chapter.id)) throw new Error("章节树数据存在循环，请先修复结构。");
      visiting.add(chapter.id);
      for (const link of chapter.knowledgePoints) {
        // 同一知识点在同一本教材重复出现时，MVP 使用它的第一次出现位置导航。
        if (!seen.has(link.knowledgePoint.id)) {
          seen.add(link.knowledgePoint.id);
          ordered.push({ knowledgePointId: link.knowledgePoint.id, title: link.knowledgePoint.title, slug: link.knowledgePoint.slug, chapterId: chapter.id, chapterTitle: chapter.title });
        }
      }
      visit(chapter.id);
      visiting.delete(chapter.id);
    }
  };
  visit(null);
  return ordered;
}

export async function getBookKnowledgePointCount(bookId: string) {
  const points = await prisma.chapterKnowledgePoint.findMany({ where: { chapter: { bookId } }, distinct: ["knowledgePointId"], select: { knowledgePointId: true } });
  return points.length;
}
