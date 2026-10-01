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
  const course = await prisma.course.findFirst({ select: { id: true } });
  assert(course, "seed 未创建课程。");
  const point = await prisma.knowledgePoint.create({ data: { courseId: course.id, slug: `verify-review-${Date.now()}`, title: "Review verification point", category: "CONCEPT", importance: 3, interviewImportance: 3, difficulty: 3, confidence: 1, reviewStatus: "VERIFIED" } });
  try {
    await prisma.studyProgress.create({ data: { knowledgePointId: point.id, status: "REVIEW", lastStudiedAt: new Date(), studyCount: 1 } });
    let overview = await getReviewOverview();
    assert(overview.dueItems.some((item) => item.slug === point.slug && item.source === "manual"), "手动复习点未进入待复习队列。");
    for (const [result, expectedDays] of [[2, 1], [2, 3], [2, 7], [3, 30]] as const) {
      const response = await recordReviewResult({ knowledgePointId: point.id, result });
      assert(response.ok, `结果 ${result} 保存失败：${response.error}`);
      assert(response.intervalDays === expectedDays, `结果 ${result} 的间隔应为 ${expectedDays} 天，实际为 ${response.intervalDays}。`);
      const active = await prisma.reviewRecord.count({ where: { knowledgePointId: point.id, nextReviewAt: { not: null } } });
      assert(active === 1, "同一知识点必须只有一个有效复习计划。");
    }
    const again = await recordReviewResult({ knowledgePointId: point.id, result: 0 });
    assert(again.ok && again.intervalDays === 1, `忘记后应重置为 1 天间隔：${again.ok ? again.intervalDays : again.error}。`);
    const progress = await prisma.studyProgress.findUnique({ where: { knowledgePointId: point.id }, select: { status: true } });
    assert(progress?.status === "REVIEW", "忘记后学习状态应为 REVIEW。");
    await prisma.reviewRecord.updateMany({ where: { knowledgePointId: point.id, nextReviewAt: { not: null } }, data: { nextReviewAt: new Date(Date.now() - 60_000) } });
    overview = await getReviewOverview();
    assert(overview.dueItems.some((item) => item.slug === point.slug), "到期复习点未回到待复习队列。");
    console.log("Review verification passed (manual queue, scheduler, active schedule, history)");
  } finally {
    await prisma.knowledgePoint.delete({ where: { id: point.id } });
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
