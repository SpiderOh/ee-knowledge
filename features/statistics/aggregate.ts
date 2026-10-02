import { addLocalDays, startOfLocalDay, toLocalDateKey } from "./date";

export type ActivityEvent = { occurredAt: Date };

export function percentage(numerator: number, denominator: number) {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : null;
}

export function buildStatusDistribution(counts: { notStarted: number; learning: number; mastered: number; review: number }, total: number) {
  return [
    { key: "NOT_STARTED", label: "未学习", count: counts.notStarted },
    { key: "LEARNING", label: "学习中", count: counts.learning },
    { key: "MASTERED", label: "已掌握", count: counts.mastered },
    { key: "REVIEW", label: "需要复习", count: counts.review },
  ].map((item) => ({ ...item, percentage: total > 0 ? Math.round((item.count / total) * 100) : 0 }));
}

export function buildDailyActivity(reviews: ActivityEvent[], practices: ActivityEvent[], now = new Date()) {
  const today = startOfLocalDay(now);
  const firstDay = addLocalDays(today, -13);
  const days = Array.from({ length: 14 }, (_, index) => {
    const date = addLocalDays(firstDay, index);
    return { date: toLocalDateKey(date), reviewCount: 0, practiceCount: 0, totalCount: 0 };
  });
  const byDate = new Map(days.map((day) => [day.date, day]));
  for (const event of reviews) { if (event.occurredAt > now || event.occurredAt < firstDay) continue; const day = byDate.get(toLocalDateKey(event.occurredAt)); if (day) day.reviewCount += 1; }
  for (const event of practices) { if (event.occurredAt > now || event.occurredAt < firstDay) continue; const day = byDate.get(toLocalDateKey(event.occurredAt)); if (day) day.practiceCount += 1; }
  return days.map((day) => ({ ...day, totalCount: day.reviewCount + day.practiceCount }));
}
