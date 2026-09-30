import { KnowledgeCategory, RelationType, ReviewStatus } from "@prisma/client";
import { z } from "zod";

const optionalText = z.string().trim().max(50000).nullable().optional();
const optionalNumber = (min: number, max: number) => z.preprocess((value) => value === "" || value === null || value === undefined ? undefined : typeof value === "string" ? Number(value) : value, z.number().int().min(min).max(max).optional());

export const knowledgePointInputSchema = z.object({
  id: z.preprocess((value) => value === "" ? undefined : value, z.string().trim().min(1).optional()),
  title: z.string().trim().min(1, "标题不能为空。").max(200),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug 只能使用小写英文、数字和连字符。"),
  courseId: z.string().trim().min(1, "请选择课程。"),
  category: z.nativeEnum(KnowledgeCategory),
  summary: optionalText,
  definition: optionalText,
  plainExplanation: optionalText,
  principle: optionalText,
  physicalMeaning: optionalText,
  engineeringMeaning: optionalText,
  importance: optionalNumber(1, 5).default(3),
  interviewImportance: optionalNumber(1, 5).default(3),
  difficulty: optionalNumber(1, 5).default(3),
  reviewStatus: z.nativeEnum(ReviewStatus).default(ReviewStatus.AI_DRAFT),
  source: optionalText,
  sourceBook: optionalText,
  sourceChapter: optionalText,
  sourcePage: optionalText,
  confidence: z.preprocess((value) => value === "" || value === null || value === undefined ? null : typeof value === "string" ? Number(value) : value, z.number().min(0).max(1).nullable().optional()),
});

export const formulaInputSchema = z.object({
  id: z.preprocess((value) => value === "" ? undefined : value, z.string().trim().min(1).optional()),
  knowledgePointId: z.string().trim().min(1),
  name: optionalText,
  latex: z.string().trim().min(1, "LaTeX 不能为空。").max(20000),
  description: optionalText,
  conditions: optionalText,
  sortOrder: z.preprocess((value) => typeof value === "string" ? Number(value) : value, z.number().int().min(0)),
});

export const exampleInputSchema = z.object({
  id: z.preprocess((value) => value === "" ? undefined : value, z.string().trim().min(1).optional()),
  knowledgePointId: z.string().trim().min(1),
  title: optionalText,
  content: z.string().trim().min(1, "案例内容不能为空。").max(50000),
  solution: optionalText,
  type: optionalText,
  sortOrder: z.preprocess((value) => typeof value === "string" ? Number(value) : value, z.number().int().min(0)),
});

export const relationInputSchema = z.object({
  id: z.preprocess((value) => value === "" ? undefined : value, z.string().trim().min(1).optional()),
  sourceKnowledgePointId: z.string().trim().min(1),
  targetKnowledgePointSlug: z.string().trim().min(1),
  relationType: z.nativeEnum(RelationType),
  description: optionalText,
});

export const chapterLinkInputSchema = z.object({
  knowledgePointId: z.string().trim().min(1),
  chapterId: z.string().trim().min(1),
  sortOrder: z.preprocess((value) => typeof value === "string" ? Number(value) : value, z.number().int().min(0)),
});

export const adminKnowledgeQuerySchema = z.object({
  q: z.string().trim().max(100).optional().default(""),
  course: z.string().trim().max(100).optional().default(""),
  reviewStatus: z.nativeEnum(ReviewStatus).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
});

export type KnowledgePointInput = z.infer<typeof knowledgePointInputSchema>;
