import type { KnowledgeCategory } from "@prisma/client";

export const knowledgeCategoryLabels: Record<KnowledgeCategory, string> = {
  CONCEPT: "概念",
  THEOREM: "定理",
  FORMULA: "公式",
  ALGORITHM: "算法",
  CIRCUIT: "电路",
  SYSTEM: "系统",
  PROTOCOL: "协议",
  DEVICE: "器件",
  METHOD: "方法",
  EXPERIMENT: "实验",
  OTHER: "其他",
};
