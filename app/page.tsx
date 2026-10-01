import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { SearchForm } from "@/components/search/SearchForm";
import { getDashboardStats } from "@/features/dashboard/queries";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { courses, pointCount, bookCount, learnedPointCount, reviewCount, recentStudy } = await getDashboardStats();
  return <AppShell active="首页"><div className="topbar"><div><div className="eyebrow">学习工作台</div><h1>你好，开始今天的学习</h1><p className="subtitle">从一个知识点开始，持续构建你的专业体系。</p></div><SearchForm /></div><div className="grid stats"><div className="card"><div className="stat-label">知识点</div><div className="stat-value">{pointCount}</div></div><div className="card"><div className="stat-label">教材</div><div className="stat-value">{bookCount}</div></div><Link className="card dashboard-stat-link" href="/review"><div className="stat-label">需要复习</div><div className="stat-value">{reviewCount}</div></Link><div className="card"><div className="stat-label">已学习知识点</div><div className="stat-value">{learnedPointCount}</div></div></div><div className="grid content-grid"><section className="card"><div className="section-heading"><h2 className="section-title">课程分类</h2><Link href="/courses">查看全部 ›</Link></div><div className="course-list">{courses.map(course => <Link className="course" href={`/courses/${course.slug}`} key={course.id}><div><div className="course-name">{course.name}</div><div className="course-meta">{course._count.books} 本教材 · {course._count.knowledgePoints} 个知识点</div></div><span className="arrow">›</span></Link>)}{courses.length === 0 && <div className="empty">还没有课程，请先在内容管理中导入课程。</div>}</div></section><section className="card"><h2 className="section-title">最近学习</h2>{recentStudy.length === 0 ? <div className="empty">还没有学习记录，选择一个知识点开始学习。</div> : recentStudy.map((item) => <Link className="recent-study" href={`/knowledge/${item.knowledgePoint.slug}`} key={item.knowledgePoint.slug}><strong>{item.knowledgePoint.title}</strong><span>{item.knowledgePoint.course.name}</span><time>{item.lastStudiedAt?.toLocaleString("zh-CN")}</time></Link>)}</section></div></AppShell>;
}
