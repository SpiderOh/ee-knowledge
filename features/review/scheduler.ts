import { REVIEW_INTERVAL_DAYS, type ReviewResult } from "./constants";

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
    nextReviewAt: new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000),
    successStreak: result >= 2 ? previousStreak + 1 : 0,
  };
}
