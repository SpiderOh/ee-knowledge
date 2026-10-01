"use server";

import { StudyStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { calculateNextReview } from "./scheduler";

const reviewResultSchema = z.object({ knowledgePointId: z.string().trim().min(1), result: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]) });

export async function recordReviewResult(input: { knowledgePointId: string; result: number }) {
  const parsed = reviewResultSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "复习结果无效。" } as const;
  const now = new Date();
  try {
    const result = await prisma.$transaction(async (tx) => {
      const point = await tx.knowledgePoint.findUnique({ where: { id: parsed.data.knowledgePointId }, select: { id: true, slug: true, course: { select: { slug: true } } } });
      if (!point) return { ok: false, error: "知识点不存在。" } as const;
      const history = await tx.reviewRecord.findMany({ where: { knowledgePointId: point.id }, orderBy: { reviewedAt: "desc" }, select: { result: true } });
      const schedule = calculateNextReview({ result: parsed.data.result, previousResults: history.map((record) => record.result), now });
      await tx.reviewRecord.updateMany({ where: { knowledgePointId: point.id, nextReviewAt: { not: null } }, data: { nextReviewAt: null } });
      const record = await tx.reviewRecord.create({ data: { knowledgePointId: point.id, reviewedAt: now, result: parsed.data.result, nextReviewAt: schedule.nextReviewAt } });
      const status = parsed.data.result >= 2 ? StudyStatus.MASTERED : StudyStatus.REVIEW;
      await tx.studyProgress.upsert({ where: { knowledgePointId: point.id }, create: { knowledgePointId: point.id, status, lastStudiedAt: now, studyCount: 1 }, update: { status, lastStudiedAt: now, studyCount: { increment: 1 } } });
      return { ok: true, recordId: record.id, result: parsed.data.result, nextReviewAt: schedule.nextReviewAt.toISOString(), intervalDays: schedule.intervalDays, slug: point.slug, courseSlug: point.course.slug } as const;
    });
    if (!result.ok) return result;
    try { revalidatePath("/review"); revalidatePath(`/review/${result.slug}`); revalidatePath(`/knowledge/${result.slug}`); revalidatePath(`/courses/${result.courseSlug}`); revalidatePath("/courses"); revalidatePath("/"); } catch { /* standalone verification has no Next request context */ }
    return result;
  } catch {
    return { ok: false, error: "复习记录保存失败。" } as const;
  }
}
