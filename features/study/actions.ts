"use server";

import { StudyStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";

const updateStudyStatusSchema = z.object({ knowledgePointId: z.string().trim().min(1), status: z.nativeEnum(StudyStatus) });

export async function updateStudyStatus(input: { knowledgePointId: string; status: StudyStatus }) {
  const parsed = updateStudyStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "学习状态参数无效。" } as const;
  const point = await prisma.knowledgePoint.findUnique({ where: { id: parsed.data.knowledgePointId }, select: { id: true, slug: true, course: { select: { slug: true } } } });
  if (!point) return { ok: false, error: "知识点不存在。" } as const;

  try {
    const current = await prisma.studyProgress.findUnique({ where: { knowledgePointId: point.id } });
    const now = new Date();
    if (!current) {
      if (parsed.data.status !== StudyStatus.NOT_STARTED) {
        await prisma.studyProgress.create({ data: { knowledgePointId: point.id, status: parsed.data.status, lastStudiedAt: now, studyCount: 1 } });
      }
    } else if (current.status !== parsed.data.status) {
      await prisma.studyProgress.update({ where: { knowledgePointId: point.id }, data: { status: parsed.data.status, lastStudiedAt: parsed.data.status === StudyStatus.NOT_STARTED ? current.lastStudiedAt : now, studyCount: parsed.data.status === StudyStatus.NOT_STARTED ? current.studyCount : { increment: 1 } } });
    }
  } catch {
    return { ok: false, error: "学习状态更新失败，请稍后重试。" } as const;
  }
  revalidatePath(`/knowledge/${point.slug}`);
  revalidatePath(`/courses/${point.course.slug}`);
  revalidatePath("/courses");
  revalidatePath("/");
  return { ok: true, status: parsed.data.status } as const;
}
