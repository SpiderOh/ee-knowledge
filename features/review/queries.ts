import { StudyStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { addLocalDays } from "./date";

export type ReviewQueueItem = {
  id: string;
  slug: string;
  title: string;
  category: string;
  importance: number;
  course: { name: string };
  nextReviewAt: Date | null;
  source: "scheduled" | "manual";
};

function startOfToday(now: Date) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return start;
}

async function getReviewCandidates() {
  return prisma.knowledgePoint.findMany({
    where: { OR: [{ reviewRecords: { some: { nextReviewAt: { not: null } } } }, { studyProgress: { status: StudyStatus.REVIEW } }] },
    orderBy: [{ importance: "desc" }, { title: "asc" }],
    select: {
      id: true, slug: true, title: true, category: true, importance: true,
      course: { select: { name: true } },
      studyProgress: { select: { status: true, lastStudiedAt: true } },
      reviewRecords: { where: { nextReviewAt: { not: null } }, orderBy: { reviewedAt: "desc" }, take: 1, select: { nextReviewAt: true } },
    },
  });
}

function toQueueItem(candidate: Awaited<ReturnType<typeof getReviewCandidates>>[number]): ReviewQueueItem {
  const active = candidate.reviewRecords[0]?.nextReviewAt ?? null;
  return { id: candidate.id, slug: candidate.slug, title: candidate.title, category: candidate.category, importance: candidate.importance, course: candidate.course, nextReviewAt: active, source: active ? "scheduled" : "manual" };
}

export function compareReviewQueueItems(a: ReviewQueueItem, b: ReviewQueueItem) {
  if (a.source !== b.source) return a.source === "scheduled" ? -1 : 1;
  if (a.source === "scheduled" && b.source === "scheduled") {
    const dateDifference = (a.nextReviewAt?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.nextReviewAt?.getTime() ?? Number.MAX_SAFE_INTEGER);
    if (dateDifference !== 0) return dateDifference;
  }
  const importanceDifference = b.importance - a.importance;
  return importanceDifference !== 0 ? importanceDifference : a.title.localeCompare(b.title, "zh-CN");
}

export async function getReviewOverview(now = new Date()) {
  const candidates = (await getReviewCandidates()).map(toQueueItem);
  const dueItems = candidates.filter((item) => item.nextReviewAt ? item.nextReviewAt <= now : item.source === "manual").sort(compareReviewQueueItems);
  const upcomingAll = candidates.filter((item) => item.nextReviewAt && item.nextReviewAt > now && item.nextReviewAt <= addLocalDays(now, 7)).sort((a, b) => a.nextReviewAt!.getTime() - b.nextReviewAt!.getTime());
  const upcomingItems = upcomingAll.slice(0, 20);
  const today = startOfToday(now);
  const overdueCount = dueItems.filter((item) => item.nextReviewAt && item.nextReviewAt < today).length;
  const manualCount = dueItems.filter((item) => item.source === "manual").length;
  return { dueItems, dueCount: dueItems.length, overdueCount, upcoming7DaysCount: upcomingAll.length, manualCount, upcomingItems };
}

export async function getKnowledgeReviewHistory(slug: string) {
  const point = await prisma.knowledgePoint.findUnique({ where: { slug }, select: { id: true, title: true, slug: true, reviewRecords: { orderBy: { reviewedAt: "desc" }, take: 10, select: { id: true, reviewedAt: true, result: true, nextReviewAt: true } } } });
  return point;
}

export async function getReviewPoint(slug: string) {
  return prisma.knowledgePoint.findUnique({
    where: { slug },
    select: {
      id: true, slug: true, title: true, summary: true, definition: true, plainExplanation: true, principle: true, physicalMeaning: true, engineeringMeaning: true,
      category: true, importance: true, interviewImportance: true,
      course: { select: { name: true } },
      _count: { select: { practiceQuestions: true } },
      formulas: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true, latex: true, description: true, conditions: true } },
      reviewRecords: { orderBy: { reviewedAt: "desc" }, take: 10, select: { id: true, reviewedAt: true, result: true, nextReviewAt: true } },
    },
  });
}
