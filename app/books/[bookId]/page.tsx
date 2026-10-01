import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { ChapterTree } from "@/components/book/ChapterTree";
import { getBookById, getBookKnowledgePointCount } from "@/features/books/queries";

export const dynamic = "force-dynamic";

export default async function BookPage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params;
  const book = await getBookById(bookId);
  if (!book) notFound();
  const knowledgePointCount = await getBookKnowledgePointCount(book.id);
  const emptyMessage = book.chapters.length === 0 ? "该教材还没有章节目录。" : knowledgePointCount === 0 ? "目录已建立，但还没有关联知识点。" : "选择目录中的知识点开始学习。";
  return <AppShell active="课程"><div className="breadcrumb"><Link href="/courses">课程</Link><span>›</span><Link href={`/courses/${book.course.slug}`}>{book.course.name}</Link><span>›</span><strong>{book.title}</strong></div><div className="book-hero"><div className="book-icon large">书</div><div><div className="eyebrow">教材阅读</div><h1>{book.title}</h1><p className="subtitle">{[book.author, book.publisher, book.edition].filter(Boolean).join(" · ") || "暂无出版信息"}</p>{book.description && <p className="book-description">{book.description}</p>}</div></div><div className="book-layout"><aside className="card book-sidebar"><h2 className="section-title">目录</h2>{book.chapters.length ? <ChapterTree chapters={book.chapters} bookId={book.id} /> : <div className="empty book-empty">{emptyMessage}</div>}</aside><section className="card book-intro"><div className="eyebrow">{book.course.name}</div><h2>从目录开始学习</h2><p>{emptyMessage}</p><div className="book-summary"><span><strong>{book._count.chapters}</strong> 个章节</span><span><strong>{knowledgePointCount}</strong> 个知识点</span></div></section></div></AppShell>;
}
