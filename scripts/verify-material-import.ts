import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { KnowledgeCategory, PrismaClient, ReviewStatus } from "@prisma/client";
import { extractTextMaterial } from "@/features/material-import/extract";
import { importMaterialDraft, previewMaterialDraft } from "@/features/material-import/service";
import { repoRoot, resolveSqlitePath, sidecarPaths } from "./lib/sqlite-path";
import { runNpmScript } from "./lib/run-command";

const verifyPath = path.join(repoRoot, "prisma", "verify-material-import-" + Date.now() + ".db");
const verifyUrl = "file:./" + path.basename(verifyPath);
const isCase = process.argv.includes("--case");

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
function removeDatabase() {
  for (const filePath of [verifyPath, ...sidecarPaths(verifyPath)]) if (fs.existsSync(filePath)) fs.rmSync(filePath, { force: true });
}

async function runCase() {
  const prisma = new PrismaClient();
  try {
    const bytes = new TextEncoder().encode("\uFEFF标题\r\n\r\n正文");
    const extracted = extractTextMaterial({ fileName: "folder/ohm-law.md", mimeType: "text/markdown", bytes });
    assert(extracted.text === "标题\n\n正文", "UTF-8/BOM/CRLF extraction failed");
    for (const name of ["a.markdown", "a.txt"]) extractTextMaterial({ fileName: name, bytes: new TextEncoder().encode("ok") });
    for (const name of ["a.pdf", "a.docx", "a.png", "a.json"]) {
      try { extractTextMaterial({ fileName: name, bytes: new TextEncoder().encode("x") }); throw new Error("unsupported format accepted"); } catch (error) { assert(error instanceof Error && error.message.includes("仅支持"), "unsupported format guard failed"); }
    }
    try { extractTextMaterial({ fileName: "bad.txt", bytes: Uint8Array.from([0xc3, 0x28]) }); throw new Error("invalid UTF-8 accepted"); } catch (error) { assert(error instanceof Error && error.message.includes("UTF-8"), "invalid UTF-8 guard failed"); }
    try { extractTextMaterial({ fileName: "bad.txt", bytes: Uint8Array.from([1, 0, 2]) }); throw new Error("NUL accepted"); } catch (error) { assert(error instanceof Error && error.message.includes("二进制"), "NUL guard failed"); }
    try { extractTextMaterial({ fileName: "bad.txt", bytes: new Uint8Array(2 * 1024 * 1024 + 1) }); throw new Error("size accepted"); } catch (error) { assert(error instanceof Error && error.message.includes("2 MB"), "size guard failed"); }

    const course = await prisma.course.findUniqueOrThrow({ where: { slug: "circuit-theory" } });
    const slug = "verify-material-import-point";
    await prisma.knowledgePoint.deleteMany({ where: { slug } });
    const sideEffectsBefore = await Promise.all([prisma.studyProgress.count(), prisma.reviewRecord.count(), prisma.practiceAttempt.count(), prisma.favorite.count(), prisma.note.count()]);
    const draft = { courseSlug: course.slug, title: "验证资料导入", slug, category: KnowledgeCategory.CONCEPT, source: "verify-material.md", sourceBook: "电路（第五版）", sourceChapter: "第一章", sourcePage: "12", content: "用户手工确认后的正文" };
    const preview = await previewMaterialDraft(draft);
    assert(preview.ok && preview.summary.knowledgePoints.create === 1 && preview.summary.knowledgePoints.update === 0, "preview create-only summary failed");
    const imported = await importMaterialDraft(draft, preview.ok ? preview.snapshot : "");
    assert(imported.ok, "material import failed");
    const point = await prisma.knowledgePoint.findUniqueOrThrow({ where: { slug } });
    assert(point.definition === draft.content && point.source === draft.source && point.sourceBook === draft.sourceBook && point.sourceChapter === draft.sourceChapter && point.sourcePage === draft.sourcePage && point.reviewStatus === ReviewStatus.AI_DRAFT, "material fields failed");
    const sideEffectsAfter = await Promise.all([prisma.studyProgress.count(), prisma.reviewRecord.count(), prisma.practiceAttempt.count(), prisma.favorite.count(), prisma.note.count()]);
    assert(JSON.stringify(sideEffectsBefore) === JSON.stringify(sideEffectsAfter), "material import changed learning data");
    const existing = await previewMaterialDraft({ ...draft, slug: "kirchhoff-current-law" });
    assert(!existing.ok, "existing slug was not blocked");
    const stale = await importMaterialDraft({ ...draft, content: "changed after preview" }, preview.ok ? preview.snapshot : "");
    assert(!stale.ok, "stale preview was accepted");
    await prisma.knowledgePoint.delete({ where: { id: point.id } });
    console.log("Material import verification passed", { extraction: true, createOnly: true, snapshotBinding: true, sideEffects: "none" });
  } finally {
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
