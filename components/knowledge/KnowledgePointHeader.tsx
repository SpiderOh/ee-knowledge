import Link from "next/link";
import { knowledgeCategoryLabels } from "@/features/knowledge/category-labels";
import { reviewStatusLabels } from "@/features/knowledge/review-status-labels";

export function KnowledgePointHeader({ point }: { point: { title: string; summary: string | null; category: string; importance: number; interviewImportance: number; reviewStatus: string; course: { name: string } } }) {
  const category = knowledgeCategoryLabels[point.category as keyof typeof knowledgeCategoryLabels] || point.category;
  return <><div className="breadcrumb"><Link href="/courses">课程</Link><span>›</span><span>{point.course.name}</span><span>›</span><strong>{point.title}</strong></div><div className="knowledge-heading"><div><div className="eyebrow">{category}</div><h1>{point.title}</h1><p className="subtitle">{point.summary || "暂无摘要"}</p></div><div className="knowledge-badges"><span>审核状态：{reviewStatusLabels[point.reviewStatus as keyof typeof reviewStatusLabels] || point.reviewStatus}</span><span>知识类别：{category}</span></div></div></>;
}
