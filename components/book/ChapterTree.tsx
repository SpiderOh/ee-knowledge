"use client";

import Link from "next/link";
import { useState } from "react";

export type ChapterNode = { id: string; title: string; number: string | null; parentId: string | null; sortOrder: number; knowledgePoints: { knowledgePoint: { title: string; slug: string } }[] };

export function ChapterTree({ chapters, bookId, currentSlug }: { chapters: ChapterNode[]; bookId: string; currentSlug?: string }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const render = (parentId: string | null, depth = 0): React.ReactNode => chapters.filter((chapter) => chapter.parentId === parentId).sort((a, b) => a.sortOrder - b.sortOrder).map((chapter) => {
    const children = chapters.some((item) => item.parentId === chapter.id);
    const expanded = open[chapter.id] ?? true;
    return <div key={chapter.id} className="tree-node" style={{ marginLeft: depth * 14 }}><div className="tree-heading">{children ? <button className="tree-toggle" onClick={() => setOpen((value) => ({ ...value, [chapter.id]: !expanded }))}>{expanded ? "⌄" : "›"}</button> : <span className="tree-spacer" />}<span>{chapter.number ? `${chapter.number} ` : ""}{chapter.title}</span></div>{expanded && <>{chapter.knowledgePoints.map(({ knowledgePoint }) => <Link className={`tree-point ${currentSlug === knowledgePoint.slug ? "selected" : ""}`} href={`/knowledge/${knowledgePoint.slug}?bookId=${bookId}`} key={knowledgePoint.slug}>· {knowledgePoint.title}</Link>)}{children && render(chapter.id, depth + 1)}</>}</div>;
  });
  return <nav className="chapter-tree">{render(null)}</nav>;
}
