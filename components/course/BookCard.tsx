import Link from "next/link";

export function BookCard({ book }: { book: { id: string; title: string; author: string | null; publisher: string | null; edition: string | null; _count: { chapters: number } } }) {
  return <Link className="book-card" href={`/books/${book.id}`}><div className="book-icon">书</div><div><h3>{book.title}</h3><p>{[book.author, book.publisher, book.edition].filter(Boolean).join(" · ") || "暂无出版信息"}</p><span>{book._count.chapters} 个章节 · 浏览教材</span></div><b>›</b></Link>;
}
