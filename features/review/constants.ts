export const REVIEW_INTERVAL_DAYS = [1, 3, 7, 14, 30] as const;

export const reviewResultLabels = {
  0: "忘记",
  1: "模糊",
  2: "记得",
  3: "熟练",
} as const;

export const reviewResultDescriptions = {
  0: "基本无法回忆",
  1: "能想起部分，但不完整",
  2: "基本能够正确回忆",
  3: "可以快速、完整解释",
} as const;

export type ReviewResult = keyof typeof reviewResultLabels;

export function isReviewResult(value: number): value is ReviewResult {
  return Number.isInteger(value) && value >= 0 && value <= 3;
}
