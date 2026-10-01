import { REVIEW_INTERVAL_DAYS, type ReviewResult } from "./constants";
import { addLocalDays } from "./date";

export { addLocalDays } from "./date";

export function calculateSuccessStreak(previousResults: number[]) {
  let streak = 0;
  for (const result of previousResults) {
    if (result < 2) break;
    streak += 1;
  }
  return streak;
}

export function calculateNextReview({ result, previousResults, now = new Date() }: { result: ReviewResult; previousResults: number[]; now?: Date }) {
  const previousStreak = calculateSuccessStreak(previousResults);
  const intervalIndex = result === 3 ? previousStreak + 1 : result === 2 ? previousStreak : 0;
  const intervalDays = REVIEW_INTERVAL_DAYS[Math.min(intervalIndex, REVIEW_INTERVAL_DAYS.length - 1)];
  return {
    intervalDays,
    nextReviewAt: addLocalDays(now, intervalDays),
    successStreak: result >= 2 ? previousStreak + 1 : 0,
  };
}
