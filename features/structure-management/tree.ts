export type ChapterRecord = { id: string; bookId: string; parentId: string | null; level: number; sortOrder: number };

export function isDescendant(chapters: ChapterRecord[], chapterId: string, candidateParentId: string) {
  const children = new Map<string, string[]>();
  for (const chapter of chapters) if (chapter.parentId) children.set(chapter.parentId, [...(children.get(chapter.parentId) ?? []), chapter.id]);
  const visited = new Set<string>();
  const visit = (id: string): boolean => {
    if (visited.has(id)) throw new Error("章节树数据存在循环，请先修复结构。");
    visited.add(id);
    if (id === candidateParentId) return true;
    return (children.get(id) ?? []).some(visit);
  };
  return visit(chapterId);
}

export function chapterLevel(parent: ChapterRecord | null) { return parent ? parent.level + 1 : 1; }
