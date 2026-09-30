import type { RelationType } from "@prisma/client";
import Link from "next/link";
import { getRelationLabel, type RelationDirection } from "@/features/knowledge/relation-labels";

type RelatedPoint = { id: string; title: string; slug: string; course: { name: string } };
type RelationView = { id: string; relationType: RelationType; description: string | null; direction: RelationDirection; knowledgePoint: RelatedPoint };

export function KnowledgeRelations({ relations }: { relations: RelationView[] }) {
  if (relations.length === 0) return null;
  return <section className="knowledge-relations"><h2>相关知识</h2><div className="relation-list">{relations.map((relation) => <Link className="relation-card" href={`/knowledge/${relation.knowledgePoint.slug}`} key={`${relation.direction}-${relation.id}`}>
    <div><span className="relation-label">{getRelationLabel(relation.relationType, relation.direction)}</span><h3>{relation.knowledgePoint.title}</h3><small>{relation.knowledgePoint.course.name}</small>{relation.description && <p>{relation.description}</p>}</div><span className="arrow">›</span>
  </Link>)}</div></section>;
}
