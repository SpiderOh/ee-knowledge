"use server";

import { InterviewAnswerType, Prisma, RelationType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { chapterLinkDeleteSchema, chapterLinkInputSchema, exampleDeleteSchema, exampleInputSchema, formulaDeleteSchema, formulaInputSchema, knowledgePointInputSchema, knowledgeQuestionDeleteSchema, knowledgeQuestionInputSchema, relationDeleteSchema, relationInputSchema, type KnowledgePointInput } from "./schemas";
import { validateKnowledgePointCourseChange } from "@/features/structure-management/consistency";

const symmetricTypes = new Set<RelationType>([RelationType.RELATED, RelationType.SIMILAR, RelationType.DIFFERENT]);
const firstError = (error: unknown, fallback: string) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" ? "该 slug 已存在。" : fallback;
const revalidateKnowledge = (oldSlug?: string, newSlug?: string, courseSlugs: string[] = [], id?: string) => { for (const path of [...(oldSlug ? [`/knowledge/${oldSlug}`] : []), ...(newSlug ? [`/knowledge/${newSlug}`] : []), ...(id ? [`/admin/knowledge/${id}/edit`] : []), ...courseSlugs.map((slug) => `/courses/${slug}`), "/courses", "/search", "/admin", "/admin/knowledge"]) { try { revalidatePath(path); } catch { /* Server Action tests may run without a request context. */ } } };

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
  const existing = await prisma.knowledgePoint.findUnique({ where: { id: input.id }, select: { id: true, courseId: true, course: { select: { slug: true } } } });
  if (!existing) return { ok: false, error: "知识点不存在。" } as const;
  if (existing.courseId !== parsed.data.courseId && !await validateKnowledgePointCourseChange(prisma, existing.id, parsed.data.courseId)) return { ok: false, error: "该知识点仍关联到其他课程教材的章节，请先解除或调整教材章节关联后再更换课程。" } as const;
  try {
    const point = await prisma.knowledgePoint.update({ where: { id: input.id }, data: parsed.data });
    const newCourse = await prisma.course.findUnique({ where: { id: point.courseId }, select: { slug: true } });
    revalidateKnowledge(input.oldSlug, point.slug, [existing.course.slug, ...(newCourse ? [newCourse.slug] : [])], point.id);
    return { ok: true, id: point.id, slug: point.slug } as const;
  } catch (error) { return { ok: false, error: firstError(error, "知识点更新失败，请稍后重试。") } as const; }
}

export async function deleteKnowledgePoint(input: { id: string }) {
  if (!input.id?.trim()) return { ok: false, error: "知识点参数无效。" } as const;
  const point = await prisma.knowledgePoint.findUnique({ where: { id: input.id }, select: { slug: true, _count: { select: { formulas: true, examples: true, outgoingRelations: true, incomingRelations: true, chapters: true, notes: true, reviewRecords: true } }, practiceQuestions: { select: { _count: { select: { attempts: true } } } }, studyProgress: { select: { id: true } }, favorite: { select: { id: true } } } });
  if (!point) return { ok: true } as const;
  if (point.studyProgress || point.favorite || point._count.notes > 0 || point._count.reviewRecords > 0 || point.practiceQuestions.some((question) => question._count.attempts > 0)) return { ok: false, error: "该知识点存在学习记录、收藏、笔记、复习记录或练习作答记录，不能直接删除。" } as const;
  try { await prisma.knowledgePoint.delete({ where: { id: input.id } }); } catch { return { ok: false, error: "知识点删除失败，请稍后重试。" } as const; }
  revalidateKnowledge(point.slug); return { ok: true } as const;
}

const answerFields: Array<{ field: "shortAnswer" | "standardAnswer" | "deepAnswer"; type: InterviewAnswerType }> = [
  { field: "shortAnswer", type: InterviewAnswerType.SHORT_30S },
  { field: "standardAnswer", type: InterviewAnswerType.MEDIUM_1MIN },
  { field: "deepAnswer", type: InterviewAnswerType.DEEP },
];

export async function saveKnowledgeQuestion(input: z.infer<typeof knowledgeQuestionInputSchema>) {
  const parsed = knowledgeQuestionInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "常见问法参数无效。" } as const;
  const point = await prisma.knowledgePoint.findUnique({ where: { id: parsed.data.knowledgePointId }, select: { id: true, slug: true } });
  if (!point) return { ok: false, error: "知识点不存在。" } as const;
  try {
    await prisma.$transaction(async (tx) => {
      let questionId = parsed.data.id;
      if (questionId) {
        const existing = await tx.interviewQuestion.findUnique({ where: { id: questionId }, select: { knowledgePointId: true } });
        if (!existing) throw new Error("常见问法不存在。");
        if (existing.knowledgePointId !== parsed.data.knowledgePointId) throw new Error("常见问法不属于当前知识点。");
        await tx.interviewQuestion.update({ where: { id: questionId }, data: { question: parsed.data.question, level: parsed.data.level, frequency: parsed.data.frequency, source: parsed.data.source ?? null } });
      } else {
        const created = await tx.interviewQuestion.create({ data: { knowledgePointId: parsed.data.knowledgePointId, question: parsed.data.question, level: parsed.data.level, frequency: parsed.data.frequency, source: parsed.data.source ?? null } });
        questionId = created.id;
      }
      for (const answer of answerFields) {
        const value = parsed.data[answer.field];
        if (value === undefined) continue;
        if (value === null || value === "") await tx.interviewAnswer.deleteMany({ where: { interviewQuestionId: questionId, answerType: answer.type } });
        else await tx.interviewAnswer.upsert({ where: { interviewQuestionId_answerType: { interviewQuestionId: questionId, answerType: answer.type } }, update: { content: value }, create: { interviewQuestionId: questionId, answerType: answer.type, content: value } });
      }
    });
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "常见问法保存失败，请稍后重试。" } as const; }
  revalidateKnowledge(point.slug, undefined, [], point.id); return { ok: true } as const;
}

export async function deleteKnowledgeQuestion(input: { id: string; knowledgePointId: string }) {
  const parsed = knowledgeQuestionDeleteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "常见问法删除参数无效。" } as const;
  const point = await prisma.knowledgePoint.findUnique({ where: { id: parsed.data.knowledgePointId }, select: { id: true, slug: true } });
  if (!point) return { ok: false, error: "知识点不存在。" } as const;
  const question = await prisma.interviewQuestion.findUnique({ where: { id: parsed.data.id }, select: { knowledgePointId: true } });
  if (!question) return { ok: false, error: "常见问法不存在。" } as const;
  if (question.knowledgePointId !== parsed.data.knowledgePointId) return { ok: false, error: "常见问法不属于当前知识点。" } as const;
  try { await prisma.interviewQuestion.delete({ where: { id: parsed.data.id } }); } catch { return { ok: false, error: "常见问法删除失败，请稍后重试。" } as const; }
  revalidateKnowledge(point.slug, undefined, [], point.id); return { ok: true } as const;
}

export async function saveFormula(input: z.infer<typeof formulaInputSchema>) {
  const parsed = formulaInputSchema.safeParse(input); if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "公式参数无效。" } as const;
  const point = await prisma.knowledgePoint.findUnique({ where: { id: parsed.data.knowledgePointId }, select: { slug: true } }); if (!point) return { ok: false, error: "知识点不存在。" } as const;
  try { if (parsed.data.id) { const existing = await prisma.formula.findUnique({ where: { id: parsed.data.id }, select: { knowledgePointId: true } }); if (!existing) return { ok: false, error: "公式不存在。" } as const; if (existing.knowledgePointId !== parsed.data.knowledgePointId) return { ok: false, error: "公式不属于当前知识点。" } as const; await prisma.formula.update({ where: { id: parsed.data.id }, data: { name: parsed.data.name, latex: parsed.data.latex, description: parsed.data.description, conditions: parsed.data.conditions, sortOrder: parsed.data.sortOrder } }); } else await prisma.formula.create({ data: parsed.data }); } catch { return { ok: false, error: "公式保存失败，请稍后重试。" } as const; }
  revalidateKnowledge(point.slug); return { ok: true } as const;
}

export async function deleteFormula(input: { id: string; knowledgePointId: string }) {
  const parsed = formulaDeleteSchema.safeParse(input); if (!parsed.success) return { ok: false, error: "公式删除参数无效。" } as const;
  const point = await prisma.knowledgePoint.findUnique({ where: { id: parsed.data.knowledgePointId }, select: { slug: true } }); if (!point) return { ok: false, error: "知识点不存在。" } as const;
  const formula = await prisma.formula.findUnique({ where: { id: parsed.data.id }, select: { knowledgePointId: true } }); if (!formula) return { ok: false, error: "公式不存在。" } as const; if (formula.knowledgePointId !== parsed.data.knowledgePointId) return { ok: false, error: "公式不属于当前知识点。" } as const;
  try { await prisma.formula.delete({ where: { id: parsed.data.id } }); } catch { return { ok: false, error: "公式删除失败，请稍后重试。" } as const; }
  revalidateKnowledge(point.slug); return { ok: true } as const;
}

export async function saveExample(input: z.infer<typeof exampleInputSchema>) {
  const parsed = exampleInputSchema.safeParse(input); if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "案例参数无效。" } as const;
  const point = await prisma.knowledgePoint.findUnique({ where: { id: parsed.data.knowledgePointId }, select: { slug: true } }); if (!point) return { ok: false, error: "知识点不存在。" } as const;
  try { if (parsed.data.id) { const existing = await prisma.example.findUnique({ where: { id: parsed.data.id }, select: { knowledgePointId: true } }); if (!existing) return { ok: false, error: "案例不存在。" } as const; if (existing.knowledgePointId !== parsed.data.knowledgePointId) return { ok: false, error: "案例不属于当前知识点。" } as const; await prisma.example.update({ where: { id: parsed.data.id }, data: { title: parsed.data.title, content: parsed.data.content, solution: parsed.data.solution, type: parsed.data.type, sortOrder: parsed.data.sortOrder } }); } else await prisma.example.create({ data: parsed.data }); } catch { return { ok: false, error: "案例保存失败，请稍后重试。" } as const; }
  revalidateKnowledge(point.slug); return { ok: true } as const;
}

export async function deleteExample(input: { id: string; knowledgePointId: string }) {
  const parsed = exampleDeleteSchema.safeParse(input); if (!parsed.success) return { ok: false, error: "案例删除参数无效。" } as const;
  const point = await prisma.knowledgePoint.findUnique({ where: { id: parsed.data.knowledgePointId }, select: { slug: true } }); if (!point) return { ok: false, error: "知识点不存在。" } as const;
  const example = await prisma.example.findUnique({ where: { id: parsed.data.id }, select: { knowledgePointId: true } }); if (!example) return { ok: false, error: "案例不存在。" } as const; if (example.knowledgePointId !== parsed.data.knowledgePointId) return { ok: false, error: "案例不属于当前知识点。" } as const;
  try { await prisma.example.delete({ where: { id: parsed.data.id } }); } catch { return { ok: false, error: "案例删除失败，请稍后重试。" } as const; }
  revalidateKnowledge(point.slug); return { ok: true } as const;
}

export async function saveRelation(input: z.infer<typeof relationInputSchema>) {
  const parsed = relationInputSchema.safeParse(input); if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "关系参数无效。" } as const;
  const source = await prisma.knowledgePoint.findUnique({ where: { id: parsed.data.sourceKnowledgePointId }, select: { id: true, slug: true } });
  const target = await prisma.knowledgePoint.findUnique({ where: { slug: parsed.data.targetKnowledgePointSlug }, select: { id: true, slug: true } });
  if (!source || !target) return { ok: false, error: "目标知识点不存在。" } as const;
  if (source.id === target.id) return { ok: false, error: "知识点不能关联自身。" } as const;
  try {
    if (parsed.data.id) { const existing = await prisma.knowledgeRelation.findUnique({ where: { id: parsed.data.id }, select: { sourceKnowledgePointId: true, targetKnowledgePointId: true } }); if (!existing) return { ok: false, error: "关系不存在。" } as const; if (existing.sourceKnowledgePointId !== source.id && existing.targetKnowledgePointId !== source.id) return { ok: false, error: "关系不属于当前知识点。" } as const; await prisma.knowledgeRelation.update({ where: { id: parsed.data.id }, data: { description: parsed.data.description } }); }
    else {
      const reverse = symmetricTypes.has(parsed.data.relationType) ? await prisma.knowledgeRelation.findUnique({ where: { sourceKnowledgePointId_targetKnowledgePointId_relationType: { sourceKnowledgePointId: target.id, targetKnowledgePointId: source.id, relationType: parsed.data.relationType } } }) : null;
      if (reverse) return { ok: false, error: "该对称关系已存在，不能创建镜像记录。" } as const;
      await prisma.knowledgeRelation.upsert({ where: { sourceKnowledgePointId_targetKnowledgePointId_relationType: { sourceKnowledgePointId: source.id, targetKnowledgePointId: target.id, relationType: parsed.data.relationType } }, update: { description: parsed.data.description }, create: { sourceKnowledgePointId: source.id, targetKnowledgePointId: target.id, relationType: parsed.data.relationType, description: parsed.data.description } });
    }
  } catch { return { ok: false, error: "关系保存失败，请稍后重试。" } as const; }
  revalidateKnowledge(source.slug, target.slug); return { ok: true } as const;
}

export async function deleteRelation(input: { id: string; knowledgePointId: string }) {
  const parsed = relationDeleteSchema.safeParse(input); if (!parsed.success) return { ok: false, error: "关系删除参数无效。" } as const;
  const point = await prisma.knowledgePoint.findUnique({ where: { id: parsed.data.knowledgePointId }, select: { slug: true } }); if (!point) return { ok: false, error: "知识点不存在。" } as const;
  const relation = await prisma.knowledgeRelation.findUnique({ where: { id: parsed.data.id }, select: { sourceKnowledgePointId: true, targetKnowledgePointId: true } }); if (!relation) return { ok: false, error: "关系不存在。" } as const; if (relation.sourceKnowledgePointId !== parsed.data.knowledgePointId && relation.targetKnowledgePointId !== parsed.data.knowledgePointId) return { ok: false, error: "关系不属于当前知识点。" } as const;
  try { await prisma.knowledgeRelation.delete({ where: { id: parsed.data.id } }); } catch { return { ok: false, error: "关系删除失败，请稍后重试。" } as const; }
  revalidateKnowledge(point.slug); return { ok: true } as const;
}

export async function linkKnowledgePointToChapter(input: z.infer<typeof chapterLinkInputSchema>) {
  const parsed = chapterLinkInputSchema.safeParse(input); if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "章节关联参数无效。" } as const;
  const [point, chapter] = await Promise.all([prisma.knowledgePoint.findUnique({ where: { id: parsed.data.knowledgePointId }, select: { slug: true, courseId: true } }), prisma.chapter.findUnique({ where: { id: parsed.data.chapterId }, select: { id: true, book: { select: { courseId: true } } } })]);
  if (!point || !chapter) return { ok: false, error: "知识点或章节不存在。" } as const;
  if (point.courseId !== chapter.book.courseId || !await validateKnowledgePointCourseChange(prisma, parsed.data.knowledgePointId, chapter.book.courseId)) return { ok: false, error: "知识点课程与教材课程不一致。" } as const;
  try { await prisma.chapterKnowledgePoint.upsert({ where: { chapterId_knowledgePointId: { chapterId: parsed.data.chapterId, knowledgePointId: parsed.data.knowledgePointId } }, update: { sortOrder: parsed.data.sortOrder }, create: parsed.data }); } catch { return { ok: false, error: "章节关联保存失败，请稍后重试。" } as const; }
  revalidateKnowledge(point.slug); return { ok: true } as const;
}

export async function unlinkKnowledgePointFromChapter(input: { id: string; knowledgePointId: string }) {
  const parsed = chapterLinkDeleteSchema.safeParse(input); if (!parsed.success) return { ok: false, error: "章节关联删除参数无效。" } as const;
  const point = await prisma.knowledgePoint.findUnique({ where: { id: parsed.data.knowledgePointId }, select: { slug: true } }); if (!point) return { ok: false, error: "知识点不存在。" } as const;
  const link = await prisma.chapterKnowledgePoint.findUnique({ where: { id: parsed.data.id }, select: { knowledgePointId: true } }); if (!link) return { ok: false, error: "章节关联不存在。" } as const; if (link.knowledgePointId !== parsed.data.knowledgePointId) return { ok: false, error: "章节关联不属于当前知识点。" } as const;
  try { await prisma.chapterKnowledgePoint.delete({ where: { id: parsed.data.id } }); } catch { return { ok: false, error: "章节关联删除失败，请稍后重试。" } as const; }
  revalidateKnowledge(point.slug); return { ok: true } as const;
}
