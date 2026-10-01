import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { getReviewOverview, type ReviewQueueItem } from "@/features/review/queries";
import { knowledgeCategoryLabels } from "@/features/knowledge/category-labels";

export const dynamic = "force-dynamic";

function dueLabel(item: ReviewQueueItem) {
  if (!item.nextReviewAt) return "手动加入";
  const now = new Date();
  if (item.nextReviewAt <= now) {
    const today = new Date(now); today.setHours(0, 0, 0, 0);
    const due = new Date(item.nextReviewAt); due.setHours(0, 0, 0, 0);
    const days = Math.floor((today.getTime() - due.getTime()) / 86400000);
    return days > 0 ? `已逾期 ${days} 天` : "今天到期";
  }
  return `计划 ${item.nextReviewAt.toLocaleDateString("zh-CN")}`;
}

function stars(importance: number) { return `${"★".repeat(importance)}${"☆".repeat(Math.max(0, 5 - importance))}`; }

function QueueCard({ item }: { item: ReviewQueueItem }) {
  return <article className="review-queue-item"><div><div className="review-item-title"><Link href={`/review/${item.slug}`}>{item.title}</Link><span className="review-importance">{stars(item.importance)}</span></div><p>{item.course.name} · {knowledgeCategoryLabels[item.category as keyof typeof knowledgeCategoryLabels] || item.category}</p></div><div className="review-item-action"><span className={item.nextReviewAt && item.nextReviewAt < new Date() ? "review-overdue" : "review-due-label"}>{dueLabel(item)}</span><Link className="secondary-button" href={`/review/${item.slug}`}>开始复习</Link></div></article>;
}

export default async function ReviewPage() {
  const overview = await getReviewOverview();
  return <AppShell active="复习中心"><div className="page-header"><div><div className="eyebrow">Review Center</div><h1>复习中心</h1><p className="subtitle">按照记忆情况安排下一次复习，保持知识点的长期记忆。</p></div><Link className="secondary-button" href="/courses">浏览课程</Link></div><div className="grid stats review-stats"><div className="card"><div className="stat-label">今日待复习</div><div className="stat-value">{overview.dueCount}</div></div><div className="card"><div className="stat-label">已逾期</div><div className="stat-value">{overview.overdueCount}</div></div><div className="card"><div className="stat-label">未来 7 天</div><div className="stat-value">{overview.upcoming7DaysCount}</div></div><div className="card"><div className="stat-label">手动加入</div><div className="stat-value">{overview.manualCount}</div></div></div><section className="card review-queue"><div className="section-heading"><h2 className="section-title">待复习队列</h2><span className="muted">共 {overview.dueCount} 个</span></div>{overview.dueItems.length === 0 ? <div className="empty">当前没有需要复习的知识点。<p>可以从课程或知识点页面选择“需要复习”，加入复习中心。</p></div> : <div>{overview.dueItems.map((item) => <QueueCard item={item} key={item.id} />)}</div>}</section>{overview.upcomingItems.length > 0 && <section className="card review-queue"><div className="section-heading"><h2 className="section-title">近期安排</h2><span className="muted">未来 7 天</span></div>{overview.upcomingItems.map((item) => <QueueCard item={item} key={item.id} />)}</section>}</AppShell>;
}
