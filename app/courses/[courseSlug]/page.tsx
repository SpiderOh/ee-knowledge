import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { BookCard } from "@/components/course/BookCard";
import { calculateProgress, getCourseBySlug } from "@/features/courses/queries";

export const dynamic = "force-dynamic";

export default async function CoursePage({ params }: { params: Promise<{ courseSlug: string }> }) {
  const { courseSlug } = await params;
  const course = await getCourseBySlug(courseSlug);
  if (!course) notFound();
  const progress = calculateProgress(course.knowledgePoints);
  return <AppShell active="课程"><div className="breadcrumb"><Link href="/courses">课程</Link><span>›</span><strong>{course.name}</strong></div><div className="course-hero card"><div><div className="eyebrow">{course.subjectArea?.name || "专业课程"}</div><h1>{course.name}</h1><p className="subtitle">{course.description || "暂无课程简介"}</p></div><div className="hero-progress"><strong>{progress}%</strong><span>学习进度</span><div className="progress"><span style={{ width: `${progress}%` }} /></div></div></div><div className="course-overview"><div className="stat-inline"><strong>{course._count.books}</strong><span>本教材</span></div><div className="stat-inline"><strong>{course._count.knowledgePoints}</strong><span>个知识点</span></div><div className="stat-inline"><strong>{progress}%</strong><span>总体进度</span></div></div><section><div className="section-heading"><h2>相关教材</h2><span>{course.books.length} 本</span></div><div className="book-grid">{course.books.map((book) => <BookCard book={book} key={book.id} />)}</div>{course.books.length === 0 && <div className="empty card">该课程还没有教材。</div>}</section></AppShell>;
}
