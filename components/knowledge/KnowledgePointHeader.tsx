import Link from "next/link";

const categoryNames: Record<string, string> = { CONCEPT: "概念", THEOREM: "定理", FORMULA: "公式", ALGORITHM: "算法", CIRCUIT: "电路", SYSTEM: "系统", PROTOCOL: "协议", DEVICE: "器件", METHOD: "方法", EXPERIMENT: "实验", OTHER: "其他" };

export function KnowledgePointHeader({ point }: { point: { title: string; summary: string | null; category: string; importance: number; interviewImportance: number; reviewStatus: string; course: { name: string } } }) {
  return <><div className="breadcrumb"><Link href="/courses">知识库</Link><span>›</span><span>{point.course.name}</span><span>›</span><strong>{point.title}</strong></div><div className="knowledge-heading"><div><div className="eyebrow">{categoryNames[point.category] || point.category}</div><h1>{point.title}</h1><p className="subtitle">{point.summary || "暂无摘要"}</p></div><div className="knowledge-badges"><span>审核状态：{point.reviewStatus}</span><span>知识类别：{categoryNames[point.category] || point.category}</span></div></div></>;
}
