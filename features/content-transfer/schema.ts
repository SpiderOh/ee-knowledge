import { KnowledgeCategory, RelationType, ReviewStatus } from "@prisma/client";
import { z } from "zod";

const nullableText = z.string().max(50000).nullable().optional();
const boundedInt = (min: number, max: number) => z.number().int().min(min).max(max).optional();

export const subjectAreaSchema = z.object({ slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), name: z.string().trim().min(1).max(200), description: nullableText, sortOrder: z.number().int().min(0).optional() });
export const courseSchema = z.object({ slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), name: z.string().trim().min(1).max(200), description: nullableText, sortOrder: z.number().int().min(0).optional(), subjectAreaSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).nullable().optional() });
export const formulaSchema = z.object({ key: z.string().trim().min(1).max(200), name: nullableText, latex: z.string().trim().min(1).max(20000), description: nullableText, conditions: nullableText, sortOrder: z.number().int().min(0).optional() });
export const exampleSchema = z.object({ key: z.string().trim().min(1).max(200), title: nullableText, type: nullableText, content: z.string().trim().min(1).max(50000), solution: nullableText, sortOrder: z.number().int().min(0).optional() });
export const questionSchema = z.object({ key: z.string().trim().min(1).max(200), question: z.string().trim().min(1).max(5000), level: boundedInt(1, 5), frequency: boundedInt(1, 5), source: nullableText, shortAnswer: nullableText, standardAnswer: nullableText, deepAnswer: nullableText });
export const knowledgePointSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), courseSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), title: z.string().trim().min(1).max(200), category: z.nativeEnum(KnowledgeCategory).optional(), summary: nullableText, commonMistakes: nullableText, masteryCriteria: nullableText, definition: nullableText, plainExplanation: nullableText, principle: nullableText, physicalMeaning: nullableText, engineeringMeaning: nullableText, importance: boundedInt(1, 5), interviewImportance: boundedInt(1, 5), difficulty: boundedInt(1, 5), reviewStatus: z.nativeEnum(ReviewStatus).optional(), source: nullableText, sourceBook: nullableText, sourceChapter: nullableText, sourcePage: nullableText, confidence: z.number().min(0).max(1).nullable().optional(), formulas: z.array(formulaSchema).optional(), examples: z.array(exampleSchema).optional(), questions: z.array(questionSchema).optional(),
});
export const relationSchema = z.object({ sourceSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), targetSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), relationType: z.nativeEnum(RelationType), description: nullableText });
export const knowledgeBundleSchema = z.object({ kind: z.literal("ee-knowledge-content"), schemaVersion: z.literal("1.0"), exportedAt: z.string().datetime().optional(), subjectAreas: z.array(subjectAreaSchema).default([]), courses: z.array(courseSchema).default([]), knowledgePoints: z.array(knowledgePointSchema).default([]), relations: z.array(relationSchema).default([]) });

export type KnowledgeBundle = z.infer<typeof knowledgeBundleSchema>;
