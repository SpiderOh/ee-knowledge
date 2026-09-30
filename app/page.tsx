import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { SearchForm } from "@/components/search/SearchForm";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [courses, pointCount, bookCount, reviewCount] = await Promise.all([
    prisma.course.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { knowledgePoints: true, books: true } } } }),
    prisma.knowledgePoint.count(), prisma.book.count(), prisma.studyProgress.count({ where: { status: "REVIEW" } }),
  ]);
  return <AppShell active="首页"><div className="topbar"><div><div className="eyebrow">学习工作台</div><h1>你好，开始今天的学习</h1><p className="subtitle">从一个知识点开始，持续构建你的专业体系。</p></div><SearchForm /></div><div className="grid stats"><div className="card"><div className="stat-label">知识点</div><div className="stat-value">{pointCount}</div></div><div className="card"><div className="stat-label">教材</div><div className="stat-value">{bookCount}</div></div><div className="card"><div className="stat-label">待复习</div><div className="stat-value">{reviewCount}</div></div><div className="card"><div className="stat-label">本周学习</div><div className="stat-value">0<span className="stat-unit"> 分钟</span></div></div></div><div className="grid content-grid"><section className="card"><div className="section-heading"><h2 className="section-title">课程分类</h2><Link href="/courses">查看全部 ›</Link></div><div className="course-list">{courses.map(course => <Link className="course" href={`/courses/${course.slug}`} key={course.id}><div><div className="course-name">{course.name}</div><div className="course-meta">{course._count.books} 本教材 · {course._count.knowledgePoints} 个知识点</div></div><span className="arrow">›</span></Link>)}{courses.length === 0 && <div className="empty">还没有课程，请先在内容管理中导入课程。</div>}</div></section><section className="card"><h2 className="section-title">最近学习</h2><div className="review-item"><span>今日待复习</span><span className="pill">{reviewCount} 个知识点</span></div><div className="review-item"><span>学习进度</span><Link href="/courses">开始学习 ›</Link></div><div className="empty">完成知识点学习后，这里会显示最近记录。</div></section></div></AppShell>;
}
