import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import { importKnowledgeBundle, previewKnowledgeBundle } from "@/features/content-transfer/service";
import { knowledgeBundleSchema, type KnowledgeBundle } from "@/features/content-transfer/schema";
import { materialDraftSchema, type MaterialDraft } from "./schema";

export type MaterialDraftValidation = { ok: true; draft: MaterialDraft } | { ok: false; errors: string[] };

export function parseMaterialDraft(input: unknown): MaterialDraftValidation {
  const parsed = materialDraftSchema.safeParse(input);
  return parsed.success ? { ok: true, draft: parsed.data } : { ok: false, errors: parsed.error.issues.map((issue) => (issue.path.join(".") || "draft") + ": " + issue.message) };
}
export function materialDraftSnapshot(draft: MaterialDraft) {
  return createHash("sha256").update(JSON.stringify(draft)).digest("hex");
}
export function buildMaterialKnowledgeBundle(draft: MaterialDraft): KnowledgeBundle {
  return knowledgeBundleSchema.parse({
    kind: "ee-knowledge-content", schemaVersion: "1.0", exportedAt: new Date().toISOString(), subjectAreas: [], courses: [], relations: [],
    knowledgePoints: [{ slug: draft.slug, courseSlug: draft.courseSlug, title: draft.title, category: draft.category, definition: draft.content, source: draft.source, ...(draft.sourceBook ? { sourceBook: draft.sourceBook } : {}), ...(draft.sourceChapter ? { sourceChapter: draft.sourceChapter } : {}), ...(draft.sourcePage ? { sourcePage: draft.sourcePage } : {}) }],
  });
}
export async function previewMaterialDraft(input: unknown) {
  const parsed = parseMaterialDraft(input); if (!parsed.ok) return parsed;
  const { draft } = parsed;
  const course = await prisma.course.findUnique({ where: { slug: draft.courseSlug }, select: { id: true } });
  if (!course) return { ok: false as const, errors: ["课程不存在，请先选择已有课程。"] };
  const bundle = buildMaterialKnowledgeBundle(draft);
  const preview = await previewKnowledgeBundle(bundle);
  if (!preview.ok) return preview;
  if (preview.summary.knowledgePoints.update > 0) return { ok: false as const, errors: ["该 slug 已存在，个人资料导入只允许创建新的知识点。"] };
  return { ok: true as const, snapshot: materialDraftSnapshot(draft), summary: preview.summary, title: draft.title, slug: draft.slug, source: draft.source };
}
export async function importMaterialDraft(input: unknown, expectedSnapshot: string) {
  const parsed = parseMaterialDraft(input); if (!parsed.ok) return parsed;
  const { draft } = parsed;
  if (materialDraftSnapshot(draft) !== expectedSnapshot) return { ok: false as const, errors: ["预览已过期，请重新预览当前资料草稿。"] };
  const course = await prisma.course.findUnique({ where: { slug: draft.courseSlug }, select: { id: true } });
  if (!course) return { ok: false as const, errors: ["课程不存在，请先选择已有课程。"] };
  const bundle = buildMaterialKnowledgeBundle(draft);
  const imported = await importKnowledgeBundle(bundle, { knowledgePointMode: "create-only" });
  if (!imported.ok) return imported;
  if (imported.result.updatedKnowledgePoints > 0) return { ok: false as const, errors: ["该 slug 已存在，个人资料导入只允许创建新的知识点。"] };
  const created = await prisma.knowledgePoint.findUnique({ where: { slug: draft.slug }, select: { id: true, slug: true, title: true, source: true } });
  if (!created) return { ok: false as const, errors: ["知识点创建后无法读取，请稍后检查。"] };
  return { ok: true as const, created };
}
