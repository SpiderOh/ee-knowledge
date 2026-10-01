"use server";

import { PracticeQuestionType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isObjectiveQuestionType, isSubjectiveQuestionType } from "./constants";
import { gradeObjectiveAnswer, normalizeMultipleChoice, normalizeSingleChoice, normalizeTrueFalse } from "./grading";
import { practiceAttemptInputSchema, practiceQuestionInputSchema, type PracticeQuestionInput } from "./schemas";

function safeRevalidate(paths: string[]) { for (const path of paths) { try { revalidatePath(path); } catch { /* standalone verification has no Next request context */ } } }

function parseOptions(optionsText: string) {
  const options: Array<{ key: string; content: string; sortOrder: number }> = [];
  for (const [index, line] of optionsText.split(/\r?\n/).map((item) => item.trim()).filter(Boolean).entries()) {
    const separator = line.indexOf("|");
    if (separator < 1) return { ok: false as const, error: "选项格式应为 KEY|选项内容。" };
    const key = line.slice(0, separator).trim().toUpperCase();
    const content = line.slice(separator + 1).trim();
    if (!key || !content) return { ok: false as const, error: "选项 key 和内容不能为空。" };
    if (!/^[A-Z0-9]+$/.test(key)) return { ok: false as const, error: "选项 key 只能使用大写字母或数字。" };
    if (options.some((option) => option.key === key)) return { ok: false as const, error: `选项 key 重复：${key}。` };
    options.push({ key, content, sortOrder: index });
  }
  return { ok: true as const, options };
}

function normalizeQuestionAnswer(type: PracticeQuestionType, answer: string) {
  if (type === PracticeQuestionType.SINGLE_CHOICE) return normalizeSingleChoice(answer);
  if (type === PracticeQuestionType.MULTIPLE_CHOICE) return normalizeMultipleChoice(answer);
  if (type === PracticeQuestionType.TRUE_FALSE) return normalizeTrueFalse(answer) ?? "";
  return answer.trim();
}

function validateQuestionContent(type: PracticeQuestionType, answer: string, options: Array<{ key: string; content: string; sortOrder: number }>) {
  if (type === PracticeQuestionType.SINGLE_CHOICE || type === PracticeQuestionType.MULTIPLE_CHOICE) {
    if (options.length < 2) return "单选题和多选题至少需要 2 个选项。";
    const keys = new Set(options.map((option) => option.key));
    const normalizedAnswer = normalizeQuestionAnswer(type, answer);
    const answerKeys = normalizedAnswer ? normalizedAnswer.split(",") : [];
    if (type === PracticeQuestionType.SINGLE_CHOICE && answerKeys.length !== 1) return "单选题标准答案必须且只能包含一个选项。";
    if (answerKeys.length === 0 || answerKeys.some((key) => !keys.has(key))) return "标准答案必须指向已有选项。";
  }
  if (type === PracticeQuestionType.TRUE_FALSE && !normalizeTrueFalse(answer)) return "判断题标准答案只能是正确或错误。";
  if (type === PracticeQuestionType.TRUE_FALSE && options.length > 0) return "判断题不能包含选项记录。";
  if (isSubjectiveQuestionType(type) && options.length > 0) return "主观题不能包含选择题选项。";
  return null;
}

export async function recordPracticeAttempt(input: { practiceQuestionId: string; submittedAnswer: string; subjectiveAssessment?: boolean }) {
  const parsed = practiceAttemptInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "作答参数无效。" } as const;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const question = await tx.practiceQuestion.findUnique({ where: { id: parsed.data.practiceQuestionId }, select: { id: true, type: true, answer: true, options: { select: { key: true } }, knowledgePoint: { select: { slug: true } } } });
      if (!question) return { ok: false as const, error: "练习题不存在。" };
      let isCorrect: boolean;
      const submittedAnswer = parsed.data.submittedAnswer.trim();
      let normalizedSubmittedAnswer = submittedAnswer;
      if (question.type === PracticeQuestionType.SINGLE_CHOICE) {
        normalizedSubmittedAnswer = normalizeSingleChoice(submittedAnswer);
        if (!normalizedSubmittedAnswer || normalizedSubmittedAnswer.includes(",") || !question.options.some((option) => option.key === normalizedSubmittedAnswer)) return { ok: false as const, error: "提交的选项无效。" };
      } else if (question.type === PracticeQuestionType.MULTIPLE_CHOICE) {
        normalizedSubmittedAnswer = normalizeMultipleChoice(submittedAnswer);
        const keys = normalizedSubmittedAnswer ? normalizedSubmittedAnswer.split(",") : [];
        if (!keys.length || keys.some((key) => !question.options.some((option) => option.key === key))) return { ok: false as const, error: "提交的选项无效。" };
      } else if (question.type === PracticeQuestionType.TRUE_FALSE) {
        const normalized = normalizeTrueFalse(submittedAnswer);
        if (!normalized) return { ok: false as const, error: "提交的选项无效。" };
        normalizedSubmittedAnswer = normalized;
      }
      if (isObjectiveQuestionType(question.type)) isCorrect = gradeObjectiveAnswer(question.type, normalizedSubmittedAnswer, question.answer);
      else {
        if (typeof parsed.data.subjectiveAssessment !== "boolean") return { ok: false as const, error: "请先完成自评。" };
        isCorrect = parsed.data.subjectiveAssessment;
      }
      const attemptedAt = new Date();
      const attempt = await tx.practiceAttempt.create({ data: { practiceQuestionId: question.id, submittedAnswer: normalizedSubmittedAnswer, isCorrect, attemptedAt } });
      return { ok: true as const, attemptId: attempt.id, isCorrect: attempt.isCorrect, attemptedAt: attempt.attemptedAt.toISOString(), questionId: question.id, knowledgePointSlug: question.knowledgePoint.slug };
    });
    if (!result.ok) return result;
    safeRevalidate(["/practice", `/practice/${result.questionId}`, "/wrong-answers", `/knowledge/${result.knowledgePointSlug}`]);
    return { ok: true, attemptId: result.attemptId, isCorrect: result.isCorrect, attemptedAt: result.attemptedAt } as const;
  } catch { return { ok: false, error: "作答记录保存失败。" } as const; }
}

export async function savePracticeQuestion(input: PracticeQuestionInput) {
  const parsed = practiceQuestionInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "练习题参数无效。" } as const;
  const optionsResult = parseOptions(parsed.data.optionsText);
  if (!optionsResult.ok) return optionsResult;
  const contentError = validateQuestionContent(parsed.data.type, parsed.data.answer, optionsResult.options);
  if (contentError) return { ok: false, error: contentError } as const;
  const normalizedAnswer = normalizeQuestionAnswer(parsed.data.type, parsed.data.answer);
  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = parsed.data.id ? await tx.practiceQuestion.findUnique({ where: { id: parsed.data.id }, select: { id: true, knowledgePointId: true, type: true, question: true, answer: true, options: { orderBy: { sortOrder: "asc" }, select: { key: true, content: true, sortOrder: true } }, _count: { select: { attempts: true } } } }) : null;
      if (parsed.data.id && !existing) return { ok: false as const, error: "练习题不存在。" };
      if (existing && existing.knowledgePointId !== parsed.data.knowledgePointId) return { ok: false as const, error: "练习题不属于当前知识点。" };
      if (existing && existing._count.attempts > 0) {
        const oldOptions = existing.options.map((option) => `${option.key}|${option.content}|${option.sortOrder}`).join("\n");
        const newOptions = optionsResult.options.map((option) => `${option.key}|${option.content}|${option.sortOrder}`).join("\n");
        if (existing.type !== parsed.data.type || existing.question !== parsed.data.question || existing.answer !== normalizedAnswer || oldOptions !== newOptions) return { ok: false as const, error: "该练习题已有作答记录，为保护历史记录，不能修改题干、题型、标准答案或选项。可以调整解析和难度。" };
      }
      const saved = existing ? await tx.practiceQuestion.update({ where: { id: existing.id }, data: { type: parsed.data.type, question: parsed.data.question, answer: normalizedAnswer, explanation: parsed.data.explanation || null, difficulty: parsed.data.difficulty } }) : await tx.practiceQuestion.create({ data: { knowledgePointId: parsed.data.knowledgePointId, type: parsed.data.type, question: parsed.data.question, answer: normalizedAnswer, explanation: parsed.data.explanation || null, difficulty: parsed.data.difficulty } });
      if (!existing || existing._count.attempts === 0) { await tx.practiceQuestionOption.deleteMany({ where: { practiceQuestionId: saved.id } }); if (optionsResult.options.length) await tx.practiceQuestionOption.createMany({ data: optionsResult.options.map((option) => ({ ...option, practiceQuestionId: saved.id })) }); }
      return { ok: true as const, id: saved.id, knowledgePointId: saved.knowledgePointId };
    });
    if (!result.ok) return result;
    const point = await prisma.knowledgePoint.findUnique({ where: { id: result.knowledgePointId }, select: { slug: true } });
    safeRevalidate(["/admin", ...(point ? [`/knowledge/${point.slug}`] : []), "/practice"]);
    return { ok: true, id: result.id } as const;
  } catch { return { ok: false, error: "练习题保存失败。" } as const; }
}

export async function deletePracticeQuestion(input: { id: string; knowledgePointId: string }) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const question = await tx.practiceQuestion.findUnique({ where: { id: input.id }, select: { id: true, knowledgePointId: true, _count: { select: { attempts: true } } } });
      if (!question) return { ok: true as const };
      if (question.knowledgePointId !== input.knowledgePointId) return { ok: false as const, error: "练习题不属于当前知识点。" };
      if (question._count.attempts > 0) return { ok: false as const, error: "该练习题已有作答记录，不能删除。" };
      await tx.practiceQuestion.delete({ where: { id: question.id } });
      return { ok: true as const };
    });
    if (result.ok) safeRevalidate(["/admin", "/practice"]);
    return result;
  } catch { return { ok: false, error: "练习题删除失败。" } as const; }
}
