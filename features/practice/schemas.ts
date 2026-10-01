import { PracticeQuestionType } from "@prisma/client";
import { z } from "zod";

export const practiceQuerySchema = z.object({
  course: z.string().trim().max(100).optional().default(""),
  type: z.nativeEnum(PracticeQuestionType).optional(),
  difficulty: z.coerce.number().int().min(1).max(5).optional(),
  knowledgePoint: z.string().trim().max(100).optional().default(""),
});

export function parsePracticeQueryParams(input: Record<string, string | undefined>) {
  const parsed = practiceQuerySchema.safeParse(input);
  if (!parsed.success) return { course: "", type: undefined, difficulty: undefined, knowledgePoint: "" };
  return parsed.data;
}

export const practiceAttemptInputSchema = z.object({
  practiceQuestionId: z.string().trim().min(1),
  submittedAnswer: z.string().trim().min(1, "请先提交答案。"),
  subjectiveAssessment: z.boolean().optional(),
}).refine((value) => value.submittedAnswer.length <= 10000, { message: "答案不能超过 10000 个字符。", path: ["submittedAnswer"] });

export const practiceQuestionInputSchema = z.object({
  id: z.string().trim().min(1).optional(),
  knowledgePointId: z.string().trim().min(1),
  type: z.nativeEnum(PracticeQuestionType),
  question: z.string().trim().min(1, "题干不能为空。").max(50000),
  answer: z.string().trim().min(1, "标准答案不能为空。").max(50000),
  explanation: z.string().trim().max(50000).nullable().optional(),
  difficulty: z.number().int().min(1).max(5),
  optionsText: z.string().max(50000).optional().default(""),
});

export type PracticeQuestionInput = z.infer<typeof practiceQuestionInputSchema>;
