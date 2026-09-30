import type { KnowledgePoint } from "@prisma/client";

type KnowledgePointContentData = Pick<KnowledgePoint, "definition" | "plainExplanation" | "principle" | "physicalMeaning" | "engineeringMeaning">;
const sections = [["definition", "标准定义"], ["plainExplanation", "通俗理解"], ["principle", "核心原理"], ["physicalMeaning", "物理意义"], ["engineeringMeaning", "工程意义"]] as const;

export function KnowledgePointContent({ point }: { point: KnowledgePointContentData }) {
  return <div className="knowledge-content">{sections.map(([field, title]) => point[field] ? <section key={field}><h2>{title}</h2><p>{point[field]}</p></section> : null)}</div>;
}
