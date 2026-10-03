import { ChapterTree, type ChapterNode } from "@/components/book/ChapterTree";

export function MobileBookContext({ bookTitle, chapters, bookId, currentSlug }: { bookTitle: string; chapters: ChapterNode[]; bookId: string; currentSlug: string }) {
  return <details className="knowledge-mobile-book-context">
    <summary>教材目录 · {bookTitle}</summary>
    <div className="knowledge-mobile-book-tree"><ChapterTree chapters={chapters} bookId={bookId} currentSlug={currentSlug} /></div>
  </details>;
}
