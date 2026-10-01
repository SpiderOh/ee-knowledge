import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { getFavoriteKnowledgePoints } from "@/features/favorites/queries";
import { knowledgeCategoryLabels } from "@/features/knowledge/category-labels";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const favorites = await getFavoriteKnowledgePoints();
  return <AppShell active="收藏"><div className="page-header"><div><div className="eyebrow">学习工具</div><h1>收藏</h1><p className="subtitle">集中查看你标记的重要知识点。</p></div></div>{favorites.length === 0 ? <div className="empty card favorites-empty">还没有收藏知识点。<Link className="primary-button" href="/courses">浏览课程</Link></div> : <div className="favorites-list">{favorites.map(({ knowledgePoint, createdAt }) => <Link className="favorite-card card" href={`/knowledge/${knowledgePoint.slug}`} key={knowledgePoint.slug}><div><h2>{knowledgePoint.title}</h2><p>{knowledgePoint.course.name}{knowledgePoint.summary ? ` · ${knowledgePoint.summary}` : ""}</p><span>{knowledgeCategoryLabels[knowledgePoint.category]}</span></div><div className="result-meta"><strong>{"★".repeat(knowledgePoint.importance)}{"☆".repeat(5 - knowledgePoint.importance)}</strong><small>复试 {knowledgePoint.interviewImportance}/5</small><time>{createdAt.toLocaleDateString("zh-CN")}</time></div></Link>)}</div>}</AppShell>;
}
