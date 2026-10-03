import Link from "next/link";
import { notFound } from "next/navigation";
import { ChapterTree } from "@/components/book/ChapterTree";
import { FavoriteButton } from "@/components/favorite/FavoriteButton";
import { KnowledgePointContent } from "@/components/knowledge/KnowledgePointContent";
import { KnowledgePointHeader } from "@/components/knowledge/KnowledgePointHeader";
import { QuickLearningBar } from "@/components/knowledge/QuickLearningBar";
import { NotesPanel, type NoteView } from "@/components/note/NotesPanel";
import { StudyStatusControl } from "@/components/study/StudyStatusControl";
import { getBookContext, getKnowledgePointBySlug } from "@/features/knowledge/queries";
import { getBookById } from "@/features/books/queries";
import type { QuickLearningBucket } from "@/features/quick-learning/queries";

export const dynamic = "force-dynamic";

type SearchParams = { bookId?: string | string[]; quick?: string | string[]; quickCourse?: string | string[] };

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function quickBucket(status: string | undefined): QuickLearningBucket {
  if (status === "REVIEW") return "review";
  if (status === "LEARNING") return "learning";
  if (status === "MASTERED") return "mastered";
  return "not-started";
}

export default async function KnowledgePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> }) {
  const { slug } = await params;
  const query = await searchParams;
  const bookId = first(query.bookId);
  const quick = first(query.quick) === "1";
  const quickCourse = first(query.quickCourse)?.trim();
  const point = await getKnowledgePointBySlug(slug);
  if (!point) notFound();
  const book = bookId ? await getBookById(bookId) : null;
  const context = book ? await getBookContext(book.id, point.id) : null;
  const validBook = book && context ? book : null;
  const initialStatus = point.studyProgress?.status || "NOT_STARTED";
  const notes: NoteView[] = point.notes.map((note) => ({ id: note.id, content: note.content, createdAt: note.createdAt.toISOString(), updatedAt: note.updatedAt.toISOString() }));
  return <div className="knowledge-shell"><aside className="sidebar knowledge-sidebar"><Link className="brand" href="/">研电 <span>·</span> EE Knowledge</Link>{validBook ? <><div className="sidebar-back"><Link href={`/books/${validBook.id}`}>‹ 返回 {validBook.title}</Link></div><ChapterTree chapters={validBook.chapters} bookId={validBook.id} currentSlug={point.slug} /></> : <div className="sidebar-empty">从教材目录进入，可查看上下文。</div>}</aside><main className="knowledge-main"><nav className="knowledge-mobile-nav" aria-label="知识点导航"><Link href="/">首页</Link><Link href="/courses">课程</Link>{validBook ? <Link href={`/books/${validBook.id}`}>教材</Link> : <Link href="/search">搜索</Link>}<Link href="/favorites">收藏</Link></nav><KnowledgePointHeader point={point} />{quick && <QuickLearningBar slug={point.slug} bucket={quickBucket(point.studyProgress?.status)} courseSlug={quickCourse && quickCourse.length <= 100 ? quickCourse : undefined} />}<div className="knowledge-layout"><article><KnowledgePointContent point={point} /><NotesPanel key={`notes-${point.id}`} knowledgePointId={point.id} initialNotes={notes} />{context && validBook && <div className="knowledge-nav"><div>{context.previous ? <Link href={`/knowledge/${context.previous.slug}?bookId=${validBook.id}`}>← {context.previous.title}</Link> : <span>没有上一知识点</span>}</div><div>{context.next ? <Link href={`/knowledge/${context.next.slug}?bookId=${validBook.id}`}>{context.next.title} →</Link> : <span>没有下一知识点</span>}</div></div>}</article><aside className="knowledge-aside card"><h2>学习信息</h2><div className="info-row"><span>重要程度</span><strong>{"★".repeat(point.importance)}{"☆".repeat(5 - point.importance)}</strong></div><div className="info-row"><span>问答重要度</span><strong>{"★".repeat(point.interviewImportance)}{"☆".repeat(5 - point.interviewImportance)}</strong></div><StudyStatusControl key={`study-${point.id}`} knowledgePointId={point.id} initialStatus={initialStatus} /><Link className="secondary-button" href={`/review/${point.slug}`}>进入复习</Link>{point.practiceQuestions.length > 0 && <Link className="secondary-button" href={`/practice?knowledgePoint=${point.slug}`}>练习题 {point.practiceQuestions.length}</Link>}<FavoriteButton key={`favorite-${point.id}`} knowledgePointId={point.id} initialFavorited={Boolean(point.favorite)} /><div className="aside-divider" />{point.chapters.length > 0 ? <><h3>出现于教材</h3>{point.chapters.map(({ chapter }) => <Link className="context-book" href={`/books/${chapter.book.id}`} key={chapter.id}><strong>{chapter.book.title}</strong><span>{chapter.number ? `${chapter.number} ` : ""}{chapter.title}</span></Link>)}</> : <p className="sidebar-empty">暂未关联教材</p>}</aside></div></main></div>;
}
