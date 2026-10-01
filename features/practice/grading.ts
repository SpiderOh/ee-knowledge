import type { PracticeQuestionType } from "@prisma/client";
import { isObjectiveQuestionType } from "./constants";

export function normalizeSingleChoice(value: string) { return value.trim().toUpperCase(); }

export function normalizeMultipleChoice(value: string) {
  return [...new Set(value.split(/[\s,，、]+/).map((item) => item.trim().toUpperCase()).filter(Boolean))].sort().join(",");
}

export function normalizeTrueFalse(value: string) {
  const normalized = value.trim().toUpperCase();
  return normalized === "TRUE" || normalized === "FALSE" ? normalized : null;
}

export function normalizeObjectiveAnswer(type: PracticeQuestionType, value: string) {
  if (type === "SINGLE_CHOICE") return normalizeSingleChoice(value);
  if (type === "MULTIPLE_CHOICE") return normalizeMultipleChoice(value);
  if (type === "TRUE_FALSE") return normalizeTrueFalse(value) ?? "";
  return value.trim();
}

export function gradeObjectiveAnswer(type: PracticeQuestionType, submittedAnswer: string, answer: string) {
  if (!isObjectiveQuestionType(type)) return false;
  return normalizeObjectiveAnswer(type, submittedAnswer) === normalizeObjectiveAnswer(type, answer);
}
