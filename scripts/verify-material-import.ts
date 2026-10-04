import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { KnowledgeCategory, PrismaClient, ReviewStatus } from "@prisma/client";
import { extractTextMaterial } from "@/features/material-import/extract";
import { importMaterialDraft, materialDraftSnapshot, previewMaterialDraft } from "@/features/material-import/service";
import { repoRoot, resolveSqlitePath, sidecarPaths } from "./lib/sqlite-path";
import { runNpmScript } from "./lib/run-command";

const verifyPath = path.join(repoRoot, "prisma", "verify-material-import-" + Date.now() + ".db");
const verifyUrl = "file:./" + path.basename(verifyPath);
const isCase = process.argv.includes("--case");

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
function expectExtractionError(fileName: string, bytes: Uint8Array, expected: string) {
  try { extractTextMaterial({ fileName, bytes }); throw new Error("extraction accepted invalid input"); } catch (error) { assert(error instanceof Error && error.message.includes(expected), "extraction regression: " + expected); }
}
async function expectDraftBlocked(draft: Record<string, unknown>, label: string) {
  const preview = await previewMaterialDraft(draft);
  assert(!preview.ok, label + " preview was accepted");
  const imported = await importMaterialDraft(draft, materialDraftSnapshot(draft as never));
  assert(!imported.ok, label + " import was accepted");
}
function removeDatabase() {
  for (const filePath of [verifyPath, ...sidecarPaths(verifyPath)]) if (fs.existsSync(filePath)) fs.rmSync(filePath, { force: true });
}

async function runCase() {
  const prisma = new PrismaClient();
  const primarySlug = "verify-material-import-point";
  const optionalSlug = "verify-material-import-optional";
  const raceSlug = "verify-material-race";
  try {
    const extracted = extractTextMaterial({ fileName: "folder/sub/ohm-law.md", mimeType: "text/markdown", bytes: new TextEncoder().encode("\uFEFF标题\r\n\r\n正文") });
    assert(extracted.originalFileName === "ohm-law.md" && extracted.text === "标题\n\n正文", "UTF-8/BOM/CRLF or safe filename failed");
    const windowsPath = extractTextMaterial({ fileName: "C:\\\\notes\\\\pll.txt", bytes: new TextEncoder().encode("pll") });
    assert(windowsPath.originalFileName === "pll.txt", "Windows safe filename failed");
    for (const name of ["a.markdown", "a.txt"]) extractTextMaterial({ fileName: name, bytes: new TextEncoder().encode("ok") });
    expectExtractionError("empty.txt", new Uint8Array(), "文件没有可导入的文本内容");
    expectExtractionError("whitespace.txt", new TextEncoder().encode(" \r\n\t "), "文件没有可导入的文本内容");
    for (const name of ["a.pdf", "a.docx", "a.png", "a.json"]) expectExtractionError(name, new TextEncoder().encode("x"), "仅支持");
    expectExtractionError("bad.txt", Uint8Array.from([0xc3, 0x28]), "UTF-8");
    expectExtractionError("bad.txt", Uint8Array.from([1, 0, 2]), "二进制");
    expectExtractionError("bad.txt", new Uint8Array(2 * 1024 * 1024 + 1), "2 MB");

    const course = await prisma.course.findUniqueOrThrow({ where: { slug: "circuit-theory" } });
    await prisma.knowledgePoint.deleteMany({ where: { slug: { in: [primarySlug, optionalSlug, raceSlug] } } });
    const sideEffectsBefore = await Promise.all([prisma.studyProgress.count(), prisma.reviewRecord.count(), prisma.practiceAttempt.count(), prisma.favorite.count(), prisma.note.count()]);
    const extractedDraftText = extractTextMaterial({ fileName: "manual-edit.md", bytes: new TextEncoder().encode("原始提取文本 A") }).text;
    const manuallyConfirmedText = extractedDraftText + "\n人工确认后的正文 B";
    const draft = { courseSlug: course.slug, title: "验证资料导入", slug: primarySlug, category: KnowledgeCategory.CONCEPT, source: "verify-material.md", sourceBook: "电路（第五版）", sourceChapter: "第一章", sourcePage: "12", content: manuallyConfirmedText };
    assert(manuallyConfirmedText !== extractedDraftText, "manual edit fixture did not change extracted text");
    const preview = await previewMaterialDraft(draft);
    assert(preview.ok && preview.summary.knowledgePoints.create === 1 && preview.summary.knowledgePoints.update === 0, "preview create-only summary failed");
    const imported = await importMaterialDraft(draft, preview.ok ? preview.snapshot : "");
    assert(imported.ok, "material import failed");
    const point = await prisma.knowledgePoint.findUniqueOrThrow({ where: { slug: primarySlug } });
    assert(point.definition === manuallyConfirmedText && point.definition !== extractedDraftText && point.source === draft.source && point.sourceBook === draft.sourceBook && point.sourceChapter === draft.sourceChapter && point.sourcePage === draft.sourcePage && point.reviewStatus === ReviewStatus.AI_DRAFT, "manual content or source fields failed");
    const sideEffectsAfter = await Promise.all([prisma.studyProgress.count(), prisma.reviewRecord.count(), prisma.practiceAttempt.count(), prisma.favorite.count(), prisma.note.count()]);
    assert(JSON.stringify(sideEffectsBefore) === JSON.stringify(sideEffectsAfter), "material import changed learning data");

    const missingCourseDraft = { ...draft, slug: "verify-material-missing-course", courseSlug: "non-existing-course" };
    await expectDraftBlocked(missingCourseDraft, "missing course");
    const invalidSlugDraft = { ...draft, slug: "Bad Slug" };
    await expectDraftBlocked(invalidSlugDraft, "invalid slug");
    const oversizedDraft = { ...draft, slug: "verify-material-oversized", content: "A".repeat(50001) };
    await expectDraftBlocked(oversizedDraft, "50001-char");

    const existingBefore = await prisma.knowledgePoint.findUniqueOrThrow({ where: { slug: "kirchhoff-current-law" }, select: { title: true, definition: true, source: true, sourceBook: true, sourceChapter: true, sourcePage: true, reviewStatus: true } });
    const existingDraft = { ...draft, slug: "kirchhoff-current-law", title: "不得覆盖的知识点", content: "不得覆盖的正文" };
    await expectDraftBlocked(existingDraft, "existing slug");
    const existingAfter = await prisma.knowledgePoint.findUniqueOrThrow({ where: { slug: "kirchhoff-current-law" }, select: { title: true, definition: true, source: true, sourceBook: true, sourceChapter: true, sourcePage: true, reviewStatus: true } });
    assert(JSON.stringify(existingBefore) === JSON.stringify(existingAfter), "existing slug data changed");

    const raceDraft = { ...draft, slug: raceSlug, title: "资料导入竞争者测试", content: "资料导入不应覆盖竞争者" };
    const racePreview = await previewMaterialDraft(raceDraft);
    assert(racePreview.ok && racePreview.summary.knowledgePoints.create === 1 && racePreview.summary.knowledgePoints.update === 0, "race preview failed");
    const competitor = await prisma.knowledgePoint.create({ data: { slug: raceSlug, title: "competitor title", courseId: course.id, category: KnowledgeCategory.CONCEPT, definition: "competitor content", source: "competitor source", reviewStatus: ReviewStatus.VERIFIED } });
    const raceResult = await importMaterialDraft(raceDraft, racePreview.ok ? racePreview.snapshot : "");
    assert(!raceResult.ok, "post-preview competing slug was accepted");
    const competitorAfter = await prisma.knowledgePoint.findUniqueOrThrow({ where: { id: competitor.id }, select: { title: true, definition: true, source: true, courseId: true, reviewStatus: true } });
    assert(competitorAfter.title === "competitor title" && competitorAfter.definition === "competitor content" && competitorAfter.source === "competitor source" && competitorAfter.courseId === course.id && competitorAfter.reviewStatus === ReviewStatus.VERIFIED, "competing slug was modified");
    const optionalDraft = { courseSlug: course.slug, title: "验证无来源元数据", slug: optionalSlug, category: KnowledgeCategory.CONCEPT, source: "optional-source.txt", content: "仅保留来源名称" };
    const optionalPreview = await previewMaterialDraft(optionalDraft);
    assert(optionalPreview.ok, "optional source preview failed");
    const optionalImport = await importMaterialDraft(optionalDraft, optionalPreview.ok ? optionalPreview.snapshot : "");
    assert(optionalImport.ok, "optional source import failed");
    const optionalPoint = await prisma.knowledgePoint.findUniqueOrThrow({ where: { slug: optionalSlug } });
    assert(optionalPoint.sourceBook === null && optionalPoint.sourceChapter === null && optionalPoint.sourcePage === null, "omitted source metadata was fabricated");

    const stale = await importMaterialDraft({ ...draft, content: "changed after preview" }, preview.ok ? preview.snapshot : "");
    assert(!stale.ok, "stale snapshot was accepted");
    console.log("Material import verification passed", { extractionBoundaries: true, manualConfirmation: true, createOnly: true, snapshotBinding: true, sideEffects: "none" });
  } finally {
    await prisma.knowledgePoint.deleteMany({ where: { slug: { in: [primarySlug, optionalSlug, raceSlug, "verify-material-missing-course", "verify-material-oversized"] } } });
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
      if (result.error || result.status !== 0) throw new Error(step + " 失败。");
    }
    const tsxCli = path.join(repoRoot, "node_modules", "tsx", "dist", "cli.mjs");
    const result = spawnSync(process.execPath, [tsxCli, __filename, "--case"], { cwd: repoRoot, env, stdio: "inherit" });
    if (result.error || result.status !== 0) throw new Error("material import case 失败。");
  } finally {
    if (process.env.KEEP_VERIFY_DB === "1") console.log("保留验证数据库：" + verifyPath); else removeDatabase();
  }
}

if (isCase) runCase().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
else runIsolated();
