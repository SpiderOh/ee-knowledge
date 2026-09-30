import type { RelationType } from "@prisma/client";

export type RelationDirection = "outgoing" | "incoming";

const labels: Record<RelationType, { outgoing: string; incoming: string }> = {
  PREREQUISITE: { outgoing: "后续学习", incoming: "前置知识" },
  RELATED: { outgoing: "相关知识", incoming: "相关知识" },
  EXTENSION: { outgoing: "扩展知识", incoming: "扩展来源" },
  SIMILAR: { outgoing: "相似概念", incoming: "相似概念" },
  DIFFERENT: { outgoing: "易混淆 / 区别", incoming: "易混淆 / 区别" },
  APPLICATION: { outgoing: "应用", incoming: "应用来源" },
  DERIVED_FROM: { outgoing: "推导来源", incoming: "推导结果" },
};

export function getRelationLabel(type: RelationType, direction: RelationDirection) {
  return labels[type][direction];
}
