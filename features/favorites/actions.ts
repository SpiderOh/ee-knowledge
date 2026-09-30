"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";

const favoriteSchema = z.object({ knowledgePointId: z.string().trim().min(1) });

export async function toggleFavorite(input: { knowledgePointId: string }) {
  const parsed = favoriteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "收藏参数无效。" } as const;
  const point = await prisma.knowledgePoint.findUnique({ where: { id: parsed.data.knowledgePointId }, select: { id: true, slug: true, course: { select: { slug: true } } } });
  if (!point) return { ok: false, error: "知识点不存在。" } as const;
  const current = await prisma.favorite.findUnique({ where: { knowledgePointId: point.id } });
  let favorited = false;
  try {
    if (current) await prisma.favorite.delete({ where: { knowledgePointId: point.id } });
    else { await prisma.favorite.create({ data: { knowledgePointId: point.id } }); favorited = true; }
  } catch {
    return { ok: false, error: "收藏操作失败，请稍后重试。" } as const;
  }
  revalidatePath(`/knowledge/${point.slug}`);
  revalidatePath("/favorites");
  revalidatePath(`/courses/${point.course.slug}`);
  revalidatePath("/");
  return { ok: true, favorited } as const;
}
