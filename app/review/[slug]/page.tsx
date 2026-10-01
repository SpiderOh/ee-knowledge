import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { ReviewSession } from "@/components/review/ReviewSession";
import { reviewResultLabels, isReviewResult } from "@/features/review/constants";
import { getReviewPoint } from "@/features/review/queries";
import { knowledgeCategoryLabels } from "@/features/knowledge/category-labels";

export const dynamic = "force-dynamic";

export default async function ReviewPointPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const point = await getReviewPoint(slug);
  if (!point) notFound();
  return <AppShell active="复习中心"><div className="review-breadcrumb"><Link href="/review">复习中心</Link><span>›</span><span>{point.title}</span></div><div className="page-header review-point-header"><div><div className="eyebrow">{point.course.name} · {knowledgeCategoryLabels[point.category as keyof typeof knowledgeCategoryLabels] || point.category}</div><h1>{point.title}</h1><p className="subtitle">重要程度 {"★".repeat(point.importance)}{"☆".repeat(Math.max(0, 5 - point.importance))} · 复试重要度 {"★".repeat(point.interviewImportance)}{"☆".repeat(Math.max(0, 5 - point.interviewImportance))}</p></div></div><ReviewSession point={point} /><section className="card review-history"><h2 className="section-title">复习历史</h2>{point.reviewRecords.length === 0 ? <p className="empty">还没有复习记录。</p> : <div>{point.reviewRecords.map((record) => <div className="review-history-row" key={record.id}><span>{record.reviewedAt.toLocaleString("zh-CN")}</span><strong>{isReviewResult(record.result) ? reviewResultLabels[record.result] : "未知结果"}</strong>{record.nextReviewAt && <small>下次复习：{record.nextReviewAt.toLocaleString("zh-CN")}</small>}</div>)}</div>}</section></AppShell>;
}
