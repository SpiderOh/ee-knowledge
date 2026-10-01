import type { ReviewStatus } from "@prisma/client";

export const reviewStatusLabels: Record<ReviewStatus, string> = {
  AI_DRAFT: "AI 草稿",
  REVIEWED: "已审核",
  VERIFIED: "已确认",
};
