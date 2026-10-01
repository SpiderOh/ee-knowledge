import { PracticeQuestionType } from "@prisma/client";

export const objectiveQuestionTypes = [PracticeQuestionType.SINGLE_CHOICE, PracticeQuestionType.MULTIPLE_CHOICE, PracticeQuestionType.TRUE_FALSE] as const;
export const subjectiveQuestionTypes = [PracticeQuestionType.FILL, PracticeQuestionType.SHORT_ANSWER, PracticeQuestionType.CALCULATION, PracticeQuestionType.COMPREHENSIVE] as const;

export const practiceQuestionTypeLabels: Record<PracticeQuestionType, string> = {
  SINGLE_CHOICE: "单选题",
  MULTIPLE_CHOICE: "多选题",
  TRUE_FALSE: "判断题",
  FILL: "填空题",
  SHORT_ANSWER: "简答题",
  CALCULATION: "计算题",
  COMPREHENSIVE: "综合题",
};

export function isObjectiveQuestionType(type: PracticeQuestionType) { return objectiveQuestionTypes.includes(type as typeof objectiveQuestionTypes[number]); }
export function isSubjectiveQuestionType(type: PracticeQuestionType) { return subjectiveQuestionTypes.includes(type as typeof subjectiveQuestionTypes[number]); }
