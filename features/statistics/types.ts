export type ActivityDay = { date: string; reviewCount: number; practiceCount: number; totalCount: number };

export type CourseStatistics = {
  id: string;
  slug: string;
  name: string;
  totalKnowledgePoints: number;
  startedKnowledgePoints: number;
  masteredKnowledgePoints: number;
  progressPercent: number;
  reviewRecordCount: number;
  successfulReviewCount: number;
  practiceQuestionCount: number;
  practiceAttemptCount: number;
  correctPracticeAttemptCount: number;
  currentWrongCount: number;
};
