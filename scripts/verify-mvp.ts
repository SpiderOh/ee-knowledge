import fs from "node:fs";
import path from "node:path";
import { repoRoot, resolveSqlitePath, sidecarPaths } from "./lib/sqlite-path";
import { runNpmScript } from "./lib/run-command";

const verifyPath = path.join(repoRoot, "prisma", "verify-mvp.db");
const verifyUrl = "file:./verify-mvp.db";
const steps = ["db", "db:seed", "verify:demo", "verify:content", "verify:admin-query", "verify:structure", "verify:review", "verify:practice", "verify:statistics"];

function removeVerifyDatabase() {
  for (const filePath of [verifyPath, ...sidecarPaths(verifyPath)]) {
    if (fs.existsSync(filePath)) fs.rmSync(filePath, { force: true });
  }
}

function main() {
  const realPath = resolveSqlitePath();
  if (path.resolve(realPath) === path.resolve(verifyPath)) throw new Error("验证数据库路径不能与真实 DATABASE_URL 相同。");
  removeVerifyDatabase();
  const env = { ...process.env, DATABASE_URL: verifyUrl };
  try {
    fs.closeSync(fs.openSync(verifyPath, "w"));
    for (const step of steps) {
      console.log(`\n[verify:mvp] ${step}`);
      const result = runNpmScript(step, env);
      if (result.error || result.status !== 0) throw new Error(`${step} 失败${result.error ? `：${result.error.message}` : result.status === null ? "（子进程未返回退出码）" : `，退出码 ${result.status}`}。`);
    }
    console.log("\nMVP verification passed (isolated SQLite database)");
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    if (process.env.KEEP_VERIFY_DB === "1") console.log(`保留验证数据库：${verifyPath}`);
    else removeVerifyDatabase();
  }
}

main();
