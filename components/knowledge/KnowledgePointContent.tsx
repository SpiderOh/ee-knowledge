import type { KnowledgePoint, RelationType } from "@prisma/client";
import { MarkdownRenderer } from "@/components/content/MarkdownRenderer";
import { ExampleSection } from "./ExampleSection";
import { FormulaSection } from "./FormulaSection";
import { KnowledgeRelations } from "./KnowledgeRelations";

type KnowledgePointContentData = Pick<KnowledgePoint, "definition" | "plainExplanation" | "principle" | "physicalMeaning" | "engineeringMeaning"> & {
  formulas: Parameters<typeof FormulaSection>[0]["formulas"];
  examples: Parameters<typeof ExampleSection>[0]["examples"];
  outgoingRelations: Array<{ id: string; relationType: RelationType; description: string | null; target: { id: string; title: string; slug: string; course: { name: string } } }>;
  incomingRelations: Array<{ id: string; relationType: RelationType; description: string | null; source: { id: string; title: string; slug: string; course: { name: string } } }>;
};
const sections = [["definition", "标准定义"], ["plainExplanation", "通俗理解"], ["principle", "核心原理"], ["physicalMeaning", "物理意义"], ["engineeringMeaning", "工程意义"]] as const;

export function KnowledgePointContent({ point }: { point: KnowledgePointContentData }) {
  const relations = [
    ...point.outgoingRelations.map((relation) => ({ id: relation.id, relationType: relation.relationType, description: relation.description, direction: "outgoing" as const, knowledgePoint: relation.target })),
    ...point.incomingRelations.map((relation) => ({ id: relation.id, relationType: relation.relationType, description: relation.description, direction: "incoming" as const, knowledgePoint: relation.source })),
  ];
  return <div className="knowledge-content">{sections.map(([field, title]) => point[field] ? <section key={field}><h2>{title}</h2><MarkdownRenderer content={point[field]} /></section> : null)}<FormulaSection formulas={point.formulas} /><ExampleSection examples={point.examples} /><KnowledgeRelations relations={relations} /></div>;
}
