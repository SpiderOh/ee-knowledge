import type { InterviewAnswerType, KnowledgePoint, RelationType } from "@prisma/client";
import { MarkdownRenderer } from "@/components/content/MarkdownRenderer";
import { ExampleSection } from "./ExampleSection";
import { FormulaSection } from "./FormulaSection";
import { KnowledgeRelations } from "./KnowledgeRelations";
import { KnowledgeQuestionSection } from "./KnowledgeQuestionSection";

type KnowledgePointContentData = Pick<KnowledgePoint, "definition" | "plainExplanation" | "principle" | "physicalMeaning" | "engineeringMeaning" | "commonMistakes" | "masteryCriteria"> & {
  formulas: Parameters<typeof FormulaSection>[0]["formulas"];
  examples: Parameters<typeof ExampleSection>[0]["examples"];
  outgoingRelations: Array<{ id: string; relationType: RelationType; description: string | null; target: { id: string; title: string; slug: string; course: { name: string } } }>;
  incomingRelations: Array<{ id: string; relationType: RelationType; description: string | null; source: { id: string; title: string; slug: string; course: { name: string } } }>;
  interviewQuestions: Array<{ id: string; question: string; level: number; frequency: number; source: string | null; answers: Array<{ answerType: InterviewAnswerType; content: string }> }>;
};
const symmetricRelationTypes = new Set<RelationType>(["RELATED", "SIMILAR", "DIFFERENT"]);

export function KnowledgePointContent({ point }: { point: KnowledgePointContentData }) {
  const allRelations = [
    ...point.outgoingRelations.map((relation) => ({ id: relation.id, relationType: relation.relationType, description: relation.description, direction: "outgoing" as const, knowledgePoint: relation.target })),
    ...point.incomingRelations.map((relation) => ({ id: relation.id, relationType: relation.relationType, description: relation.description, direction: "incoming" as const, knowledgePoint: relation.source })),
  ];
  const relations = allRelations.filter((relation, index, list) => !symmetricRelationTypes.has(relation.relationType) || list.findIndex((candidate) => candidate.relationType === relation.relationType && candidate.knowledgePoint.id === relation.knowledgePoint.id) === index);
  const section = (field: keyof Pick<KnowledgePoint, "definition" | "plainExplanation" | "principle" | "physicalMeaning" | "engineeringMeaning" | "commonMistakes" | "masteryCriteria">, title: string) => point[field] ? <section key={field}><h2>{title}</h2><MarkdownRenderer content={point[field]} /></section> : null;
  return <div className="knowledge-content">
    {section("definition", "标准定义")}
    {section("plainExplanation", "通俗理解")}
    {section("principle", "核心原理")}
    <FormulaSection formulas={point.formulas} />
    {section("physicalMeaning", "物理意义")}
    {section("engineeringMeaning", "工程意义")}
    {section("commonMistakes", "易错点")}
    {section("masteryCriteria", "掌握标准")}
    <KnowledgeQuestionSection questions={point.interviewQuestions} />
    <ExampleSection examples={point.examples} />
    <KnowledgeRelations relations={relations} />
  </div>;
}
