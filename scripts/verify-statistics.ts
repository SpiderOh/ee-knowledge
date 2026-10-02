import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { repoRoot, resolveSqlitePath, sidecarPaths } from "./lib/sqlite-path";
import { runNpmScript } from "./lib/run-command";

const verifyPath = path.join(repoRoot, "prisma", `verify-statistics-${Date.now()}.db`);
const verifyUrl = `file:./${path.basename(verifyPath)}`;
const isCase = process.argv.includes("--case");
const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => { if (!condition) throw new Error(message); };

function removeDatabase() { for (const filePath of [verifyPath, ...sidecarPaths(verifyPath)]) if (fs.existsSync(filePath)) fs.rmSync(filePath, { force: true }); }

async function runCase() {
  const { prisma } = await import("@/lib/db");
  const { getLearningStatistics } = await import("@/features/statistics/queries");
  const { buildStatusDistribution } = await import("@/features/statistics/aggregate");
  const { getReviewOverview, getReviewPoint } = await import("@/features/review/queries");
  const { calculateProgress } = await import("@/features/courses/queries");
  const now = new Date("2026-01-20T12:00:00.000Z");
  const before = await getLearningStatistics(now);
  assert(before.totalReviewRecords === 0 && before.totalPracticeAttempts === 0, "空数据库不应有学习历史。");
  assert(before.reviewSuccessRate === null && before.practiceAccuracy === null, "零分母比例必须为 null。");
  assert(before.statusDistribution.every((item) => Number.isFinite(item.percentage)), "状态比例不应出现 NaN 或 Infinity。");
  assert(buildStatusDistribution({ notStarted: 0, learning: 0, mastered: 0, review: 0 }, 0).every((item) => item.percentage === 0), "零分母状态比例必须为 0。");

  const suffix = Date.now().toString();
  const courseA = await prisma.course.create({ data: { slug: `verify-statistics-a-${suffix}`, name: "统计验证课程 A", sortOrder: 900 } });
  const courseB = await prisma.course.create({ data: { slug: `verify-statistics-b-${suffix}`, name: "统计验证课程 B", sortOrder: 901 } });
  const pointA = await prisma.knowledgePoint.create({ data: { courseId: courseA.id, slug: `verify-statistics-point-a-${suffix}`, title: "统计验证知识点 A", category: "CONCEPT" } });
  const pointB = await prisma.knowledgePoint.create({ data: { courseId: courseA.id, slug: `verify-statistics-point-b-${suffix}`, title: "统计验证知识点 B", category: "CONCEPT" } });
  const pointC = await prisma.knowledgePoint.create({ data: { courseId: courseB.id, slug: `verify-statistics-point-c-${suffix}`, title: "统计验证知识点 C", category: "CONCEPT" } });
  const pointD = await prisma.knowledgePoint.create({ data: { courseId: courseB.id, slug: `verify-statistics-point-d-${suffix}`, title: "统计验证知识点 D", category: "CONCEPT" } });
  try {
    await prisma.studyProgress.createMany({ data: [{ knowledgePointId: pointA.id, status: "LEARNING" }, { knowledgePointId: pointB.id, status: "MASTERED" }, { knowledgePointId: pointC.id, status: "REVIEW" }] });
    const questionA = await prisma.practiceQuestion.create({ data: { knowledgePointId: pointA.id, type: "TRUE_FALSE", question: "统计题 A", answer: "TRUE" } });
    const questionB = await prisma.practiceQuestion.create({ data: { knowledgePointId: pointC.id, type: "TRUE_FALSE", question: "统计题 B", answer: "TRUE" } });
    await prisma.practiceAttempt.createMany({ data: [
      { practiceQuestionId: questionA.id, submittedAnswer: "FALSE", isCorrect: false, attemptedAt: new Date("2026-01-20T08:00:00.000Z") },
      { practiceQuestionId: questionA.id, submittedAnswer: "TRUE", isCorrect: true, attemptedAt: new Date("2026-01-20T09:00:00.000Z") },
      { practiceQuestionId: questionA.id, submittedAnswer: "FALSE", isCorrect: false, attemptedAt: new Date("2026-01-20T10:00:00.000Z") },
      { practiceQuestionId: questionB.id, submittedAnswer: "TRUE", isCorrect: true, attemptedAt: new Date("2026-01-19T10:00:00.000Z") },
      { practiceQuestionId: questionB.id, submittedAnswer: "FALSE", isCorrect: false, attemptedAt: new Date("2026-01-20T11:00:00.000Z") },
    ] });
    await prisma.reviewRecord.createMany({ data: [
      { knowledgePointId: pointA.id, result: 0, reviewedAt: new Date("2026-01-20T07:00:00.000Z"), nextReviewAt: new Date("2026-01-20T11:00:00.000Z") },
      { knowledgePointId: pointA.id, result: 1, reviewedAt: new Date("2026-01-20T07:30:00.000Z"), nextReviewAt: new Date("2026-01-20T11:30:00.000Z") },
      { knowledgePointId: pointA.id, result: 2, reviewedAt: new Date("2026-01-19T07:00:00.000Z"), nextReviewAt: new Date("2026-01-21T12:00:00.000Z") },
      { knowledgePointId: pointA.id, result: 3, reviewedAt: new Date("2026-01-05T07:00:00.000Z"), nextReviewAt: null },
      { knowledgePointId: pointD.id, result: 2, reviewedAt: new Date("2026-01-20T06:00:00.000Z"), nextReviewAt: new Date("2026-01-19T12:00:00.000Z") },
    ] });
    const statistics = await getLearningStatistics(now);
    assert(statistics.startedKnowledgePoints - before.startedKnowledgePoints === 3, "已开始知识点应只统计三种非 NOT_STARTED 状态。");
    assert(statistics.totalReviewRecords === 5 && statistics.successfulReviewRecords === 3 && statistics.reviewSuccessRate === 60, "复习次数或成功率错误。");
    assert(statistics.totalPracticeAttempts === 5 && statistics.correctPracticeAttempts === 2 && statistics.practiceAccuracy === 40, "练习次数或正确率错误。");
    assert(statistics.currentWrongCount - before.currentWrongCount === 2, "当前错题必须按每道题最新作答计算。");
    const overview = await getReviewOverview(now);
    assert(statistics.dueReviewCount === overview.dueCount && statistics.overdueReviewCount === overview.overdueCount, "统计页到期复习必须复用复习中心语义。");
    const activityToday = statistics.activity.find((day) => day.date === "2026-01-20");
    const activityYesterday = statistics.activity.find((day) => day.date === "2026-01-19");
    assert(activityToday?.reviewCount === 3 && activityToday.practiceCount === 4, "今日活动统计错误。");
    assert(activityYesterday?.reviewCount === 1 && activityYesterday.practiceCount === 1, "昨日活动统计错误。");
    assert(!statistics.activity.some((day) => day.date === "2026-01-05"), "14 天活动不应包含窗口外记录。");
    const courseStatsA = statistics.courses.find((course) => course.id === courseA.id);
    const courseStatsB = statistics.courses.find((course) => course.id === courseB.id);
    assert(courseStatsA?.totalKnowledgePoints === 2 && courseStatsA.startedKnowledgePoints === 2 && courseStatsA.masteredKnowledgePoints === 1, "课程 A 状态或进度错误。");
    assert(courseStatsB?.totalKnowledgePoints === 2 && courseStatsB.startedKnowledgePoints === 1 && courseStatsB.masteredKnowledgePoints === 0, "课程 B 状态或进度错误。");
    assert(courseStatsA.reviewRecordCount === 4 && courseStatsB.reviewRecordCount === 1, "课程复习统计串课。");
    assert(courseStatsA.practiceAttemptCount === 3 && courseStatsB.practiceAttemptCount === 2, "课程练习统计串课。");
    assert(courseStatsA.progressPercent === calculateProgress([{ studyProgress: { status: "LEARNING" as const } }, { studyProgress: { status: "MASTERED" as const } }]), "课程进度未沿用课程页算法。");
    assert(courseStatsA.reviewRecordCount > 0 && courseStatsB.reviewRecordCount > 0, "课程复习数据缺失。");
    const pointView = await getReviewPoint(pointA.slug);
    assert(pointView?._count.practiceQuestions === 1, "知识点复习页未返回练习题数量。");
    console.log("Statistics verification passed (zero denominators, status distribution, review/practice rates, latest wrong, due semantics, 14-day activity, course isolation, review integration)");
  } finally {
    await prisma.knowledgePoint.deleteMany({ where: { id: { in: [pointA.id, pointB.id, pointC.id, pointD.id] } } });
    await prisma.course.deleteMany({ where: { id: { in: [courseA.id, courseB.id] } } });
    await prisma.$disconnect();
  }
}

function runIsolated() {
  if (path.resolve(resolveSqlitePath()) === path.resolve(verifyPath)) throw new Error("验证数据库不能与真实数据库相同。");
  removeDatabase();
  fs.closeSync(fs.openSync(verifyPath, "w"));
  const env = { ...process.env, DATABASE_URL: verifyUrl };
  try {
    for (const step of ["db", "db:seed"]) {
      const result = runNpmScript(step, env);
      if (result.error || result.status !== 0) throw new Error(`${step} 失败。`);
    }
    const tsxCli = path.join(repoRoot, "node_modules", "tsx", "dist", "cli.mjs");
    const result = spawnSync(process.execPath, [tsxCli, __filename, "--case"], { cwd: repoRoot, env, stdio: "inherit" });
    if (result.error || result.status !== 0) throw new Error(`statistics case 失败${result.error ? `：${result.error.message}` : "。"}`);
  } finally {
    if (process.env.KEEP_VERIFY_DB === "1") console.log(`保留验证数据库：${verifyPath}`); else removeDatabase();
  }
}

if (isCase) runCase().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
else runIsolated();
