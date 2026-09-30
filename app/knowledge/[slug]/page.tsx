import Link from "next/link";
import { notFound } from "next/navigation";
import { ChapterTree, type ChapterNode } from "@/components/book/ChapterTree";
import { KnowledgePointContent } from "@/components/knowledge/KnowledgePointContent";
import { KnowledgePointHeader } from "@/components/knowledge/KnowledgePointHeader";
import { getBookContext, getKnowledgePointBySlug } from "@/features/knowledge/queries";
import { getBookById } from "@/features/books/queries";

export const dynamic = "force-dynamic";

export default async function KnowledgePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ bookId?: string }> }) {
  const { slug } = await params;
  const { bookId } = await searchParams;
  const point = await getKnowledgePointBySlug(slug);
  if (!point) notFound();
  const context = bookId ? await getBookContext(bookId, point.id) : null;
  const book = bookId ? await getBookById(bookId) : null;
  return <div className="knowledge-shell"><aside className="sidebar knowledge-sidebar"><Link className="brand" href="/">研电 <span>·</span> EE Knowledge</Link>{book ? <><div className="sidebar-back"><Link href={`/books/${book.id}`}>‹ 返回 {book.title}</Link></div><ChapterTree chapters={book.chapters as unknown as ChapterNode[]} bookId={book.id} currentSlug={point.slug} /></> : <div className="sidebar-empty">从教材目录进入，可查看上下文。</div>}</aside><main className="knowledge-main"><KnowledgePointHeader point={point} /><div className="knowledge-layout"><article><KnowledgePointContent point={point as unknown as Record<string, unknown>} />{context && <div className="knowledge-nav"><div>{context.previous ? <Link href={`/knowledge/${context.previous.slug}?bookId=${bookId}`}>← {context.previous.title}</Link> : <span>没有上一知识点</span>}</div><div>{context.next ? <Link href={`/knowledge/${context.next.slug}?bookId=${bookId}`}>{context.next.title} →</Link> : <span>没有下一知识点</span>}</div></div>}</article><aside className="knowledge-aside card"><h2>学习信息</h2><div className="info-row"><span>重要程度</span><strong>{"★".repeat(point.importance)}{"☆".repeat(5 - point.importance)}</strong></div><div className="info-row"><span>复试重要度</span><strong>{"★".repeat(point.interviewImportance)}{"☆".repeat(5 - point.interviewImportance)}</strong></div><div className="info-row"><span>学习状态</span><span className="pill">{point.studyProgress?.status || "NOT_STARTED"}</span></div><div className="aside-divider" /><h3>出现于教材</h3>{point.chapters.map(({ chapter }) => <Link className="context-book" href={`/books/${chapter.book.id}`} key={chapter.id}><strong>{chapter.book.title}</strong><span>{chapter.number ? `${chapter.number} ` : ""}{chapter.title}</span></Link>)}</aside></div></main></div>;
}
