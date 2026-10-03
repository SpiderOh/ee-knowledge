import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { PrismaClient, StudyStatus } from "@prisma/client";
import { pickQuickLearningPoint } from "@/features/quick-learning/queries";
import { repoRoot, resolveSqlitePath, sidecarPaths } from "./lib/sqlite-path";
import { runNpmScript } from "./lib/run-command";

const verifyPath = path.join(repoRoot, "prisma", `verify-quick-learning-${Date.now()}.db`);
const verifyUrl = `file:./${path.basename(verifyPath)}`;
const isCase = process.argv.includes("--case");
const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => { if (!condition) throw new Error(message); };
const courseSlugs = ["verify-quick-course-a", "verify-quick-course-b", "verify-quick-empty-course"];
const pointSlugs = [
  "verify-quick-review-a-1", "verify-quick-review-a-2", "verify-quick-learning-a", "verify-quick-not-started-a", "verify-quick-no-progress-a", "verify-quick-mastered-a", "verify-quick-mastered-a-2", "verify-quick-mastered-a-3", "verify-quick-review-b",
];

function removeDatabase() {
  for (const filePath of [verifyPath, ...sidecarPaths(verifyPath)]) if (fs.existsSync(filePath)) fs.rmSync(filePath, { force: true });
}

async function runCase() {
  const prisma = new PrismaClient();
  try {
    const area = await prisma.subjectArea.findUniqueOrThrow({ where: { slug: "electronics" } });
    await prisma.course.deleteMany({ where: { slug: { in: courseSlugs } } });
    const courses = await Promise.all(courseSlugs.map((slug, index) => prisma.course.create({ data: { name: `快速学习验证${index + 1}`, slug, subjectAreaId: area.id } })));
    const courseA = courses[0];
    const courseB = courses[1];
    const points = [
      ["verify-quick-point-review-a-1", "verify-quick-review-a-1", courseA.id, "快速学习复习一"],
      ["verify-quick-point-review-a-2", "verify-quick-review-a-2", courseA.id, "快速学习复习二"],
      ["verify-quick-point-learning-a", "verify-quick-learning-a", courseA.id, "快速学习学习中"],
      ["verify-quick-point-not-started-a", "verify-quick-not-started-a", courseA.id, "快速学习未学习"],
      ["verify-quick-point-no-progress-a", "verify-quick-no-progress-a", courseA.id, "快速学习无记录"],
      ["verify-quick-point-mastered-a", "verify-quick-mastered-a", courseA.id, "快速学习已掌握一"],
      ["verify-quick-point-mastered-a-2", "verify-quick-mastered-a-2", courseA.id, "快速学习已掌握二"],
      ["verify-quick-point-mastered-a-3", "verify-quick-mastered-a-3", courseA.id, "快速学习已掌握三"],
      ["verify-quick-point-review-b", "verify-quick-review-b", courseB.id, "快速学习课程范围"],
    ] as const;
    await prisma.knowledgePoint.createMany({ data: points.map(([id, slug, courseId, title]) => ({ id, slug, courseId, title, category: "CONCEPT" })) });
    const bySlug = Object.fromEntries(points.map(([id, slug]) => [slug, id]));
    const progressRows: Array<[string, StudyStatus]> = [
      ["verify-quick-review-a-1", StudyStatus.REVIEW], ["verify-quick-review-a-2", StudyStatus.REVIEW], ["verify-quick-learning-a", StudyStatus.LEARNING], ["verify-quick-not-started-a", StudyStatus.NOT_STARTED], ["verify-quick-mastered-a", StudyStatus.MASTERED], ["verify-quick-mastered-a-2", StudyStatus.MASTERED], ["verify-quick-mastered-a-3", StudyStatus.MASTERED], ["verify-quick-review-b", StudyStatus.REVIEW],
    ];
    await prisma.studyProgress.createMany({ data: progressRows.map(([slug, status]) => ({ knowledgePointId: bySlug[slug], status, studyCount: 2 })) });

    const firstReview = await pickQuickLearningPoint({ courseSlug: courseA.slug, random: () => 0 });
    assert(firstReview?.slug === "verify-quick-review-a-1" && firstReview.bucket === "review", "REVIEW 优先级或稳定随机偏移失败。");
    const excluded = await pickQuickLearningPoint({ courseSlug: courseA.slug, excludeSlug: "verify-quick-review-a-1", random: () => 0 });
    assert(excluded?.slug === "verify-quick-review-a-2", "exclude 未在当前优先级内生效。");
    const scoped = await pickQuickLearningPoint({ courseSlug: courseA.slug, random: () => 0.999 });
    assert(scoped?.course.slug === courseA.slug, "课程范围筛选失败。");
    await prisma.studyProgress.deleteMany({ where: { knowledgePointId: { in: [bySlug["verify-quick-review-a-1"], bySlug["verify-quick-review-a-2"]] } } });
    await prisma.knowledgePoint.deleteMany({ where: { slug: { in: ["verify-quick-review-a-1", "verify-quick-review-a-2"] } } });
    const learning = await pickQuickLearningPoint({ courseSlug: courseA.slug, random: () => 0 });
    assert(learning?.slug === "verify-quick-learning-a" && learning.bucket === "learning", "LEARNING 优先级失败。");
    await prisma.studyProgress.delete({ where: { knowledgePointId: bySlug["verify-quick-learning-a"] } });
    await prisma.knowledgePoint.delete({ where: { id: bySlug["verify-quick-learning-a"] } });
    const notStarted = await pickQuickLearningPoint({ courseSlug: courseA.slug, random: () => 0 });
    assert(notStarted?.bucket === "not-started" && ["verify-quick-not-started-a", "verify-quick-no-progress-a"].includes(notStarted.slug), `缺少 StudyProgress 的知识点未按 NOT_STARTED 处理：${JSON.stringify(notStarted)}`);
    await prisma.studyProgress.delete({ where: { knowledgePointId: bySlug["verify-quick-not-started-a"] } });
    await prisma.knowledgePoint.deleteMany({ where: { slug: { in: ["verify-quick-not-started-a", "verify-quick-no-progress-a"] } } });
    const beforeRead = await Promise.all([prisma.studyProgress.count(), prisma.reviewRecord.count(), prisma.practiceAttempt.count(), prisma.studyProgress.findMany({ orderBy: { knowledgePointId: "asc" }, select: { knowledgePointId: true, status: true, studyCount: true, lastStudiedAt: true } })]);
    const masteredLow = await pickQuickLearningPoint({ courseSlug: courseA.slug, random: () => 0 });
    const masteredHigh = await pickQuickLearningPoint({ courseSlug: courseA.slug, random: () => 0.999 });
    assert(masteredLow?.bucket === "mastered" && masteredHigh?.bucket === "mastered" && masteredLow.slug !== masteredHigh.slug, "MASTERED 回顾或随机偏移失败。");
    const singleRetry = await pickQuickLearningPoint({ courseSlug: courseB.slug, excludeSlug: "verify-quick-review-b", random: () => 0 });
    assert(singleRetry?.slug === "verify-quick-review-b", "单候选排除后的重试失败。");
    const empty = await pickQuickLearningPoint({ courseSlug: courses[2].slug, random: () => 0 });
    assert(empty === null, "空课程应返回 null。");

    const afterRead = await Promise.all([prisma.studyProgress.count(), prisma.reviewRecord.count(), prisma.practiceAttempt.count(), prisma.studyProgress.findMany({ orderBy: { knowledgePointId: "asc" }, select: { knowledgePointId: true, status: true, studyCount: true, lastStudiedAt: true } })]);
    assert(JSON.stringify(beforeRead) === JSON.stringify(afterRead), "快速学习查询产生了学习数据副作用。");
    console.log("Quick learning verification passed (priority, scope, exclusion, retry, random offset, missing progress, empty course, read-only)");
  } finally {
    await prisma.course.deleteMany({ where: { slug: { in: courseSlugs } } });
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
    if (result.error || result.status !== 0) throw new Error(`quick learning case 失败${result.error ? `：${result.error.message}` : "。"}`);
  } finally {
    if (process.env.KEEP_VERIFY_DB === "1") console.log(`保留验证数据库：${verifyPath}`); else removeDatabase();
  }
}

if (isCase) runCase().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
else runIsolated();
