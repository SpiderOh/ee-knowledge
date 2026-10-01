import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { repoRoot, resolveSqlitePath, sidecarPaths } from "./lib/sqlite-path";
import { runNpmScript } from "./lib/run-command";

const verifyPath = path.join(repoRoot, "prisma", `verify-practice-${Date.now()}.db`);
const verifyUrl = `file:./${path.basename(verifyPath)}`;
const isCase = process.argv.includes("--case");
const assert = (condition: unknown, message: string): asserts condition => { if (!condition) throw new Error(message); };

function removeDatabase() {
  for (const filePath of [verifyPath, ...sidecarPaths(verifyPath)]) if (fs.existsSync(filePath)) fs.rmSync(filePath, { force: true });
}

async function runCase() {
  const { prisma } = await import("@/lib/db");
  const { recordPracticeAttempt, savePracticeQuestion, deletePracticeQuestion } = await import("@/features/practice/actions");
  const { getPracticeOverview, getPracticeQuestion, getWrongAnswerQuestions } = await import("@/features/practice/queries");
  const { deleteKnowledgePoint } = await import("@/features/content-management/actions");
  const course = await prisma.course.findFirst({ select: { id: true } });
  if (!course) throw new Error("Seed 未创建课程。");
  const point = await prisma.knowledgePoint.create({ data: { courseId: course.id, slug: `verify-practice-${Date.now()}`, title: "练习验证知识点", category: "CONCEPT" } });
  const other = await prisma.knowledgePoint.create({ data: { courseId: course.id, slug: `verify-practice-other-${Date.now()}`, title: "其他知识点", category: "CONCEPT" } });
  const input = { knowledgePointId: point.id, type: "SINGLE_CHOICE" as const, question: "单选验证", answer: "B", explanation: "解析", difficulty: 2, optionsText: "A|错误\nB|正确" };
  try {
    for (const id of ["demo-practice-kcl-true-false", "demo-practice-kvl-single", "demo-practice-kvl-multiple", "demo-practice-current-short", "demo-practice-power-calc"]) {
      const demo = await getPracticeQuestion(id);
      if (!demo) throw new Error(`缺少 Demo 题 ${id}。`);
    }
    const demoCount = await prisma.practiceQuestion.count({ where: { id: { startsWith: "demo-practice-" } } });
    if (demoCount !== 5) throw new Error(`Demo 题数量错误：${demoCount}。`);
    const overview = await getPracticeOverview();
    if (overview.totalQuestions < 5) throw new Error("练习概览未包含 Demo 题。");
    const filteredOverview = await getPracticeOverview({ course: "circuit-theory" });
    if (!filteredOverview.questions.every((item) => item.knowledgePoint.course.slug === "circuit-theory")) throw new Error("课程筛选未生效。");
    if (filteredOverview.totalQuestions !== overview.totalQuestions || filteredOverview.currentWrongCount !== overview.currentWrongCount) throw new Error("顶部统计不应随筛选变化。");

    const invalidOptions = await savePracticeQuestion({ ...input, optionsText: "A|一\nA|二" });
    if (invalidOptions.ok) throw new Error("重复选项 key 应拒绝。");
    const missingKey = await savePracticeQuestion({ ...input, answer: "C" });
    if (missingKey.ok) throw new Error("缺失答案 key 应拒绝。");
    const tooFew = await savePracticeQuestion({ ...input, optionsText: "A|一" });
    if (tooFew.ok) throw new Error("单选少于两项应拒绝。");
    const beforeInvalidSingle = await prisma.practiceQuestion.count({ where: { knowledgePointId: point.id } });
    const multiAnswerSingle = await savePracticeQuestion({ ...input, optionsText: "A|一\nB|二\nC|三", answer: "A,B" });
    if (multiAnswerSingle.ok || (await prisma.practiceQuestion.count({ where: { knowledgePointId: point.id } })) !== beforeInvalidSingle) throw new Error("单选题多标准答案必须拒绝且不写题目。");
    const invalidKey = await savePracticeQuestion({ ...input, optionsText: "A,B|一\nC|二" });
    if (invalidKey.ok) throw new Error("非法选项 key 应拒绝。");
    const trueFalseWithOptions = await savePracticeQuestion({ ...input, type: "TRUE_FALSE", answer: "TRUE", optionsText: "A|一\nB|二" });
    if (trueFalseWithOptions.ok) throw new Error("判断题不能保存选项。");
    const subjectiveWithOptions = await savePracticeQuestion({ ...input, type: "SHORT_ANSWER", answer: "参考", optionsText: "A|一\nB|二" });
    if (subjectiveWithOptions.ok) throw new Error("主观题不能保存选项。");

    const created = await savePracticeQuestion(input);
    if (!created.ok) throw new Error(`创建题失败：${created.error}`);
    const id = created.id;
    const canonical = await savePracticeQuestion({ ...input, question: "选项规范化验证", answer: "a", optionsText: "a|一\nb|二" });
    if (!canonical.ok) throw new Error(`小写选项保存失败：${canonical.error}`);
    const canonicalOptions = await prisma.practiceQuestionOption.findMany({ where: { practiceQuestionId: canonical.id }, select: { key: true } });
    if (canonicalOptions.some((option) => !["A", "B"].includes(option.key))) throw new Error("选项 key 未规范化为大写。");
    if ((await savePracticeQuestion({ ...input, id, knowledgePointId: other.id })).ok) throw new Error("跨知识点修改应拒绝。");
    if ((await deletePracticeQuestion({ id, knowledgePointId: other.id })).ok) throw new Error("跨知识点删除应拒绝。");
    const wrong = await recordPracticeAttempt({ practiceQuestionId: id, submittedAnswer: "A" });
    if (!wrong.ok || wrong.isCorrect) throw new Error("单选错答判分失败。");
    if (!(await getWrongAnswerQuestions()).some((item) => item.id === id)) throw new Error("最近错答未进入错题本。");
    const right = await recordPracticeAttempt({ practiceQuestionId: id, submittedAnswer: "b" });
    if (!right.ok || !right.isCorrect) throw new Error("单选大小写归一化判分失败。");
    if ((await getWrongAnswerQuestions()).some((item) => item.id === id)) throw new Error("最近答对后错题本未移除。");
    if ((await prisma.practiceAttempt.count({ where: { practiceQuestionId: id } })) !== 2) throw new Error("历史作答被覆盖。");
    const attemptsAfterRight = await prisma.practiceAttempt.findMany({ where: { practiceQuestionId: id }, orderBy: [{ attemptedAt: "desc" }, { id: "desc" }] });
    if (!attemptsAfterRight[0]?.attemptedAt || !attemptsAfterRight[0]?.submittedAnswer) throw new Error("作答时间或答案未保存。");
    const wrongAgain = await recordPracticeAttempt({ practiceQuestionId: id, submittedAnswer: "A" });
    if (!wrongAgain.ok || wrongAgain.isCorrect) throw new Error("重新答错失败。");
    if (!(await getWrongAnswerQuestions()).some((item) => item.id === id)) throw new Error("答对后再次答错未回到错题本。");
    if ((await prisma.practiceAttempt.count({ where: { practiceQuestionId: id } })) !== 3) throw new Error("再次作答历史未追加。");
    if ((await getPracticeQuestion(id))?.attempts.length !== 3) throw new Error("题目页历史作答缺失。");
    if ((await savePracticeQuestion({ ...input, id, question: "篡改题干" })).ok) throw new Error("有作答后修改题干应拒绝。");
    if ((await savePracticeQuestion({ ...input, id, optionsText: "A|更改\nB|正确" })).ok) throw new Error("有作答后修改选项应拒绝。");
    if ((await savePracticeQuestion({ ...input, id, answer: "A" })).ok) throw new Error("有作答后修改标准答案应拒绝。");
    if (!(await savePracticeQuestion({ ...input, id, explanation: "新解析", difficulty: 3 })).ok) throw new Error("解析和难度应允许修改。");
    if ((await deletePracticeQuestion({ id, knowledgePointId: point.id })).ok) throw new Error("有作答题删除应拒绝。");
    if ((await deleteKnowledgePoint({ id: point.id })).ok) throw new Error("有练习记录知识点删除应拒绝。");

    const multi = await savePracticeQuestion({ ...input, type: "MULTIPLE_CHOICE", question: "多选验证", answer: "A,C", optionsText: "A|一\nB|二\nC|三" });
    if (!multi.ok) throw new Error(`多选题创建失败：${multi.error}`);
    const multiCount = await prisma.practiceAttempt.count({ where: { practiceQuestionId: multi.id } });
    const invalidMulti = await recordPracticeAttempt({ practiceQuestionId: multi.id, submittedAnswer: "A,Z" });
    if (invalidMulti.ok || (await prisma.practiceAttempt.count({ where: { practiceQuestionId: multi.id } })) !== multiCount) throw new Error("多选非法 key 应拒绝且不写 Attempt。");
    if (!(await recordPracticeAttempt({ practiceQuestionId: multi.id, submittedAnswer: "c,a,a" })).isCorrect) throw new Error("多选顺序和重复归一化失败。");
    if ((await recordPracticeAttempt({ practiceQuestionId: multi.id, submittedAnswer: "A" })).isCorrect) throw new Error("多选漏选应判错。");

    const tf = await savePracticeQuestion({ ...input, type: "TRUE_FALSE", question: "判断验证", answer: "TRUE", optionsText: "" });
    if (!tf.ok) throw new Error(`判断题创建失败：${tf.error}`);
    const invalidTfCount = await prisma.practiceAttempt.count({ where: { practiceQuestionId: tf.id } });
    const invalidTf = await recordPracticeAttempt({ practiceQuestionId: tf.id, submittedAnswer: "abc" });
    if (invalidTf.ok || (await prisma.practiceAttempt.count({ where: { practiceQuestionId: tf.id } })) !== invalidTfCount) throw new Error("判断题非法答案应拒绝且不写 Attempt。");
    if (!(await recordPracticeAttempt({ practiceQuestionId: tf.id, submittedAnswer: "TRUE" })).isCorrect) throw new Error("判断正确应判对。");
    if ((await recordPracticeAttempt({ practiceQuestionId: tf.id, submittedAnswer: "FALSE" })).isCorrect) throw new Error("判断错误应判错。");

    const subjective = await savePracticeQuestion({ ...input, type: "SHORT_ANSWER", question: "主观验证", answer: "参考答案", optionsText: "" });
    if (!subjective.ok) throw new Error(`主观题创建失败：${subjective.error}`);
    if ((await recordPracticeAttempt({ practiceQuestionId: subjective.id, submittedAnswer: "我的答案" })).ok) throw new Error("主观题缺少自评应拒绝。");
    if (!(await recordPracticeAttempt({ practiceQuestionId: subjective.id, submittedAnswer: "我的答案", subjectiveAssessment: true })).isCorrect) throw new Error("主观题自评正确失败。");
    if ((await recordPracticeAttempt({ practiceQuestionId: subjective.id, submittedAnswer: "再答", subjectiveAssessment: false })).isCorrect) throw new Error("主观题自评错误失败。");
    if ((await prisma.practiceAttempt.findMany({ where: { submittedAnswer: "" } })).length !== 0) throw new Error("不应存在空 submittedAnswer。");
    if ((await prisma.studyProgress.count({ where: { knowledgePointId: point.id } })) !== 0) throw new Error("练习不应修改学习状态。");
    if ((await prisma.reviewRecord.count({ where: { knowledgePointId: point.id } })) !== 0) throw new Error("练习不应创建复习记录。");
    console.log("Practice verification passed (grading, latest wrong, history, ownership, semantic lock, deletion guards, demo data)");
  } finally {
    await prisma.knowledgePoint.delete({ where: { id: point.id } });
    await prisma.knowledgePoint.delete({ where: { id: other.id } });
    await prisma.$disconnect();
  }
}

function runIsolated() {
  if (path.resolve(resolveSqlitePath()) === path.resolve(verifyPath)) throw new Error("验证数据库不能与真实数据库相同。");
  removeDatabase();
  fs.closeSync(fs.openSync(verifyPath, "w"));
  const env = { ...process.env, DATABASE_URL: verifyUrl };
  try {
    for (const step of ["db", "db:seed", "db:seed"]) {
      const result = runNpmScript(step, env);
      if (result.error || result.status !== 0) throw new Error(`${step} 失败。`);
    }
    const tsxCli = path.join(repoRoot, "node_modules", "tsx", "dist", "cli.mjs");
    const result = spawnSync(process.execPath, [tsxCli, __filename, "--case"], { cwd: repoRoot, env, stdio: "inherit" });
    if (result.error || result.status !== 0) throw new Error(`practice case 失败${result.error ? `：${result.error.message}` : "。"}`);
  } finally {
    if (process.env.KEEP_VERIFY_DB === "1") console.log(`保留验证数据库：${verifyPath}`); else removeDatabase();
  }
}

if (isCase) runCase().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
else runIsolated();
