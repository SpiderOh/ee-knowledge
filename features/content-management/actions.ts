"use server";

import { Prisma, RelationType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { chapterLinkInputSchema, exampleInputSchema, formulaInputSchema, knowledgePointInputSchema, relationInputSchema, type KnowledgePointInput } from "./schemas";

const symmetricTypes = new Set<RelationType>([RelationType.RELATED, RelationType.SIMILAR, RelationType.DIFFERENT]);
const firstError = (error: unknown, fallback: string) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" ? "该 slug 已存在。" : fallback;
const revalidateKnowledge = (oldSlug?: string, newSlug?: string) => { if (oldSlug) revalidatePath(`/knowledge/${oldSlug}`); if (newSlug) revalidatePath(`/knowledge/${newSlug}`); revalidatePath("/courses"); revalidatePath("/search"); revalidatePath("/admin"); revalidatePath("/admin/knowledge"); };

export async function createKnowledgePoint(input: KnowledgePointInput) {
  const parsed = knowledgePointInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "知识点参数无效。" } as const;
  try {
    const point = await prisma.knowledgePoint.create({ data: parsed.data });
    revalidateKnowledge(undefined, point.slug);
    return { ok: true, id: point.id, slug: point.slug } as const;
  } catch (error) { return { ok: false, error: firstError(error, "知识点创建失败，请稍后重试。") } as const; }
}

export async function updateKnowledgePoint(input: KnowledgePointInput & { id: string; oldSlug: string }) {
  const parsed = knowledgePointInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "知识点参数无效。" } as const;
  const existing = await prisma.knowledgePoint.findUnique({ where: { id: input.id }, select: { id: true } });
  if (!existing) return { ok: false, error: "知识点不存在。" } as const;
  try {
    const point = await prisma.knowledgePoint.update({ where: { id: input.id }, data: parsed.data });
    revalidateKnowledge(input.oldSlug, point.slug);
    return { ok: true, id: point.id, slug: point.slug } as const;
  } catch (error) { return { ok: false, error: firstError(error, "知识点更新失败，请稍后重试。") } as const; }
}

export async function deleteKnowledgePoint(input: { id: string }) {
  if (!input.id?.trim()) return { ok: false, error: "知识点参数无效。" } as const;
  const point = await prisma.knowledgePoint.findUnique({ where: { id: input.id }, select: { slug: true, _count: { select: { formulas: true, examples: true, outgoingRelations: true, incomingRelations: true, chapters: true, notes: true, reviewRecords: true } }, studyProgress: { select: { id: true } }, favorite: { select: { id: true } } } });
  if (!point) return { ok: true } as const;
  if (point.studyProgress || point.favorite || point._count.notes > 0 || point._count.reviewRecords > 0) return { ok: false, error: "该知识点存在学习记录、收藏、笔记或复习记录，不能直接删除。" } as const;
  try { await prisma.knowledgePoint.delete({ where: { id: input.id } }); } catch { return { ok: false, error: "知识点删除失败，请稍后重试。" } as const; }
  revalidateKnowledge(point.slug); return { ok: true } as const;
}

export async function saveFormula(input: z.infer<typeof formulaInputSchema>) {
  const parsed = formulaInputSchema.safeParse(input); if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "公式参数无效。" } as const;
  const point = await prisma.knowledgePoint.findUnique({ where: { id: parsed.data.knowledgePointId }, select: { slug: true } }); if (!point) return { ok: false, error: "知识点不存在。" } as const;
  try { if (parsed.data.id) await prisma.formula.update({ where: { id: parsed.data.id }, data: { name: parsed.data.name, latex: parsed.data.latex, description: parsed.data.description, conditions: parsed.data.conditions, sortOrder: parsed.data.sortOrder } }); else await prisma.formula.create({ data: parsed.data }); } catch { return { ok: false, error: "公式保存失败，请稍后重试。" } as const; }
  revalidateKnowledge(point.slug); return { ok: true } as const;
}

export async function deleteFormula(input: { id: string; knowledgePointId: string }) {
  const point = await prisma.knowledgePoint.findUnique({ where: { id: input.knowledgePointId }, select: { slug: true } }); if (!point) return { ok: true } as const;
  try { await prisma.formula.delete({ where: { id: input.id } }); } catch { return { ok: false, error: "公式删除失败，请稍后重试。" } as const; }
  revalidateKnowledge(point.slug); return { ok: true } as const;
}

export async function saveExample(input: z.infer<typeof exampleInputSchema>) {
  const parsed = exampleInputSchema.safeParse(input); if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "案例参数无效。" } as const;
  const point = await prisma.knowledgePoint.findUnique({ where: { id: parsed.data.knowledgePointId }, select: { slug: true } }); if (!point) return { ok: false, error: "知识点不存在。" } as const;
  try { if (parsed.data.id) await prisma.example.update({ where: { id: parsed.data.id }, data: { title: parsed.data.title, content: parsed.data.content, solution: parsed.data.solution, type: parsed.data.type, sortOrder: parsed.data.sortOrder } }); else await prisma.example.create({ data: parsed.data }); } catch { return { ok: false, error: "案例保存失败，请稍后重试。" } as const; }
  revalidateKnowledge(point.slug); return { ok: true } as const;
}

export async function deleteExample(input: { id: string; knowledgePointId: string }) {
  const point = await prisma.knowledgePoint.findUnique({ where: { id: input.knowledgePointId }, select: { slug: true } }); if (!point) return { ok: true } as const;
  try { await prisma.example.delete({ where: { id: input.id } }); } catch { return { ok: false, error: "案例删除失败，请稍后重试。" } as const; }
  revalidateKnowledge(point.slug); return { ok: true } as const;
}

export async function saveRelation(input: z.infer<typeof relationInputSchema>) {
  const parsed = relationInputSchema.safeParse(input); if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "关系参数无效。" } as const;
  const source = await prisma.knowledgePoint.findUnique({ where: { id: parsed.data.sourceKnowledgePointId }, select: { id: true, slug: true } });
  const target = await prisma.knowledgePoint.findUnique({ where: { slug: parsed.data.targetKnowledgePointSlug }, select: { id: true, slug: true } });
  if (!source || !target) return { ok: false, error: "目标知识点不存在。" } as const;
  if (source.id === target.id) return { ok: false, error: "知识点不能关联自身。" } as const;
  try {
    if (parsed.data.id) await prisma.knowledgeRelation.update({ where: { id: parsed.data.id }, data: { description: parsed.data.description } });
    else {
      const reverse = symmetricTypes.has(parsed.data.relationType) ? await prisma.knowledgeRelation.findUnique({ where: { sourceKnowledgePointId_targetKnowledgePointId_relationType: { sourceKnowledgePointId: target.id, targetKnowledgePointId: source.id, relationType: parsed.data.relationType } } }) : null;
      if (reverse) return { ok: false, error: "该对称关系已存在，不能创建镜像记录。" } as const;
      await prisma.knowledgeRelation.upsert({ where: { sourceKnowledgePointId_targetKnowledgePointId_relationType: { sourceKnowledgePointId: source.id, targetKnowledgePointId: target.id, relationType: parsed.data.relationType } }, update: { description: parsed.data.description }, create: { sourceKnowledgePointId: source.id, targetKnowledgePointId: target.id, relationType: parsed.data.relationType, description: parsed.data.description } });
    }
  } catch { return { ok: false, error: "关系保存失败，请稍后重试。" } as const; }
  revalidateKnowledge(source.slug, target.slug); return { ok: true } as const;
}

export async function deleteRelation(input: { id: string; knowledgePointId: string }) {
  const point = await prisma.knowledgePoint.findUnique({ where: { id: input.knowledgePointId }, select: { slug: true } }); if (!point) return { ok: true } as const;
  try { await prisma.knowledgeRelation.delete({ where: { id: input.id } }); } catch { return { ok: false, error: "关系删除失败，请稍后重试。" } as const; }
  revalidateKnowledge(point.slug); return { ok: true } as const;
}

export async function linkKnowledgePointToChapter(input: z.infer<typeof chapterLinkInputSchema>) {
  const parsed = chapterLinkInputSchema.safeParse(input); if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "章节关联参数无效。" } as const;
  const [point, chapter] = await Promise.all([prisma.knowledgePoint.findUnique({ where: { id: parsed.data.knowledgePointId }, select: { slug: true } }), prisma.chapter.findUnique({ where: { id: parsed.data.chapterId }, select: { id: true } })]);
  if (!point || !chapter) return { ok: false, error: "知识点或章节不存在。" } as const;
  try { await prisma.chapterKnowledgePoint.upsert({ where: { chapterId_knowledgePointId: { chapterId: parsed.data.chapterId, knowledgePointId: parsed.data.knowledgePointId } }, update: { sortOrder: parsed.data.sortOrder }, create: parsed.data }); } catch { return { ok: false, error: "章节关联保存失败，请稍后重试。" } as const; }
  revalidateKnowledge(point.slug); return { ok: true } as const;
}

export async function unlinkKnowledgePointFromChapter(input: { id: string; knowledgePointId: string }) {
  const point = await prisma.knowledgePoint.findUnique({ where: { id: input.knowledgePointId }, select: { slug: true } }); if (!point) return { ok: true } as const;
  try { await prisma.chapterKnowledgePoint.delete({ where: { id: input.id } }); } catch { return { ok: false, error: "章节关联删除失败，请稍后重试。" } as const; }
  revalidateKnowledge(point.slug); return { ok: true } as const;
}
