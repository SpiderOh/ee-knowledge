import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { repoRoot, sidecarPaths } from "./lib/sqlite-path";
import { runNpmScript } from "./lib/run-command";

const verifyPath = path.join(repoRoot, "prisma", `verify-review-${Date.now()}.db`);
const verifyUrl = `file:./${path.basename(verifyPath)}`;
const isCase = process.argv.includes("--case");

function removeDatabase() {
  for (const filePath of [verifyPath, ...sidecarPaths(verifyPath)]) if (fs.existsSync(filePath)) fs.rmSync(filePath, { force: true });
}

function fail(message: string): never { throw new Error(message); }
function assert(condition: unknown, message: string): asserts condition { if (!condition) fail(message); }

async function runCase() {
  const { prisma } = await import("@/lib/db");
  const { recordReviewResult } = await import("@/features/review/actions");
  const { getReviewOverview } = await import("@/features/review/queries");
  const { addLocalDays, calculateNextReview } = await import("@/features/review/scheduler");
  const course = await prisma.course.findFirst({ select: { id: true } });
  assert(course, "seed 未创建课程。");
  const courseId = course.id;
  const createdPointIds: string[] = [];
  async function createPoint(slug: string, title: string, importance = 3) {
    const point = await prisma.knowledgePoint.create({ data: { courseId, slug, title, category: "CONCEPT", importance, interviewImportance: 3, difficulty: 3, confidence: 1, reviewStatus: "VERIFIED" } });
    createdPointIds.push(point.id);
    return point;
  }
  const runId = Date.now();
  const point = await createPoint(`verify-review-${runId}`, "Review verification point");
  try {
    const localDayStart = new Date("2026-10-01T20:30:00");
    const localDayExpected = new Date(localDayStart); localDayExpected.setDate(localDayExpected.getDate() + 1);
    assert(calculateNextReview({ result: 2, previousResults: [], now: localDayStart }).nextReviewAt.getTime() === localDayExpected.getTime(), "调度必须使用本地自然日。");
    await prisma.studyProgress.create({ data: { knowledgePointId: point.id, status: "REVIEW", lastStudiedAt: new Date(), studyCount: 1 } });
    let overview = await getReviewOverview();
    assert(overview.dueItems.some((item) => item.slug === point.slug && item.source === "manual"), "手动复习点未进入待复习队列。");
    for (const [result, expectedDays] of [[2, 1], [2, 3], [2, 7]] as const) {
      const response = await recordReviewResult({ knowledgePointId: point.id, result });
      assert(response.ok, `结果 ${result} 保存失败：${response.error}`);
      assert(response.intervalDays === expectedDays, `结果 ${result} 的间隔应为 ${expectedDays} 天，实际为 ${response.intervalDays}。`);
      const active = await prisma.reviewRecord.count({ where: { knowledgePointId: point.id, nextReviewAt: { not: null } } });
      assert(active === 1, "同一知识点必须只有一个有效复习计划。");
    }
    const hard = await recordReviewResult({ knowledgePointId: point.id, result: 1 });
    assert(hard.ok && hard.intervalDays === 1, `HARD 应重置为 1 天：${hard.ok ? hard.intervalDays : hard.error}。`);
    const hardProgress = await prisma.studyProgress.findUnique({ where: { knowledgePointId: point.id }, select: { status: true } });
    assert(hardProgress?.status === "REVIEW", "HARD 后学习状态应为 REVIEW。");
    assert(await prisma.reviewRecord.count({ where: { knowledgePointId: point.id, nextReviewAt: { not: null } } }) === 1, "HARD 后有效计划数量应为 1。");
    const goodAfterHard = await recordReviewResult({ knowledgePointId: point.id, result: 2 });
    assert(goodAfterHard.ok && goodAfterHard.intervalDays === 1, "HARD 后 GOOD 必须从第一阶段重新开始。");
    const easyAfterHard = await recordReviewResult({ knowledgePointId: point.id, result: 3 });
    assert(easyAfterHard.ok && easyAfterHard.intervalDays === 7, "EASY 应比 GOOD 快一阶段推进。");
    const again = await recordReviewResult({ knowledgePointId: point.id, result: 0 });
    assert(again.ok && again.intervalDays === 1, `忘记后应重置为 1 天间隔：${again.ok ? again.intervalDays : again.error}。`);
    const progress = await prisma.studyProgress.findUnique({ where: { knowledgePointId: point.id }, select: { status: true } });
    assert(progress?.status === "REVIEW", "忘记后学习状态应为 REVIEW。");
    await prisma.reviewRecord.updateMany({ where: { knowledgePointId: point.id, nextReviewAt: { not: null } }, data: { nextReviewAt: new Date(Date.now() - 60_000) } });
    overview = await getReviewOverview();
    assert(overview.dueItems.some((item) => item.slug === point.slug), "到期复习点未回到待复习队列。");
    const now = new Date();
    await prisma.reviewRecord.updateMany({ where: { knowledgePointId: point.id, nextReviewAt: { not: null } }, data: { nextReviewAt: null } });
    await prisma.studyProgress.update({ where: { knowledgePointId: point.id }, data: { status: "MASTERED" } });
    const scheduledA = await createPoint(`verify-review-${runId}-scheduled-a`, "Scheduled A", 1);
    const scheduledB = await createPoint(`verify-review-${runId}-scheduled-b`, "Scheduled B", 5);
    const manualC = await createPoint(`verify-review-${runId}-manual-c`, "Manual C", 4);
    await prisma.reviewRecord.createMany({ data: [
      { knowledgePointId: scheduledA.id, result: 2, reviewedAt: addLocalDays(now, -3), nextReviewAt: addLocalDays(now, -3) },
      { knowledgePointId: scheduledB.id, result: 2, reviewedAt: addLocalDays(now, -1), nextReviewAt: addLocalDays(now, -1) },
    ] });
    await prisma.studyProgress.create({ data: { knowledgePointId: manualC.id, status: "REVIEW", lastStudiedAt: now, studyCount: 1 } });
    overview = await getReviewOverview(now);
    const queueSlugs = overview.dueItems.slice(0, 3).map((item) => item.slug);
    assert(JSON.stringify(queueSlugs) === JSON.stringify([scheduledA.slug, scheduledB.slug, manualC.slug]), `复习队列排序错误：${queueSlugs.join(", ")}`);
    const upcomingPoints = await Promise.all(Array.from({ length: 21 }, (_, index) => createPoint(`verify-review-${runId}-upcoming-${index}`, `Upcoming ${index}`)));
    await prisma.reviewRecord.createMany({ data: upcomingPoints.map((upcomingPoint, index) => ({ knowledgePointId: upcomingPoint.id, result: 2, reviewedAt: now, nextReviewAt: new Date(now.getTime() + (index + 1) * 60 * 60 * 1000) })) });
    overview = await getReviewOverview(now);
    assert(overview.upcoming7DaysCount === 21, `未来 7 天完整数量应为 21，实际为 ${overview.upcoming7DaysCount}。`);
    assert(overview.upcomingItems.length === 20, `未来 7 天展示列表应限制为 20，实际为 ${overview.upcomingItems.length}。`);
    console.log("Review verification passed (recall scheduler, HARD/AGAIN reset, queue sorting, upcoming count, active schedule)");
  } finally {
    for (const id of createdPointIds) await prisma.knowledgePoint.delete({ where: { id } });
    await prisma.$disconnect();
  }
}

function runIsolated() {
  removeDatabase();
  fs.closeSync(fs.openSync(verifyPath, "w"));
  const env = { ...process.env, DATABASE_URL: verifyUrl };
  try {
    for (const step of ["db", "db:seed"]) {
      const result = runNpmScript(step, env);
      if (result.error || result.status !== 0) fail(`${step} 失败。`);
    }
    const tsxCli = path.join(repoRoot, "node_modules", "tsx", "dist", "cli.mjs");
    const result = spawnSync(process.execPath, [tsxCli, __filename, "--case"], { cwd: repoRoot, env, stdio: "inherit" });
    if (result.error || result.status !== 0) fail(`review case 失败${result.error ? `：${result.error.message}` : "。"}`);
  } finally {
    if (process.env.KEEP_VERIFY_DB === "1") console.log(`保留验证数据库：${verifyPath}`); else removeDatabase();
  }
}

if (isCase) runCase().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
else runIsolated();
