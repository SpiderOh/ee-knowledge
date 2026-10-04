import fs from "node:fs";
import path from "node:path";
import { getAuthConfig } from "@/lib/auth/config";
import { repoRoot } from "./lib/sqlite-path";
import { isSupportedNodeVersion, NODE_RUNTIME_REQUIREMENT } from "./lib/node-runtime";

function fail(message: string): never {
  throw new Error(message);
}

function getAbsoluteProductionSqlitePath(databaseUrl: string) {
  if (!databaseUrl.startsWith("file:")) fail("DATABASE_URL 必须使用 file: SQLite URL。");
  const rawPath = databaseUrl.slice("file:".length).split("?")[0];
  let decodedPath: string;
  try { decodedPath = decodeURIComponent(rawPath); } catch { decodedPath = rawPath; }
  const normalizedPath = decodedPath.replaceAll("\\", "/");
  if (!normalizedPath.startsWith("/") || normalizedPath.startsWith("//")) fail("生产 SQLite 路径必须是 Linux absolute path。");
  const lowerPath = normalizedPath.toLowerCase();
  if (lowerPath.endsWith("/prisma/dev.db") || lowerPath.includes("/prisma/dev.db/")) fail("生产 DATABASE_URL 不得指向仓库内的 prisma/dev.db。");
  return normalizedPath;
}

function main() {
  if (!isSupportedNodeVersion(process.versions.node)) fail(`Node.js 版本过低，当前文档解析依赖要求 ${NODE_RUNTIME_REQUIREMENT}。`);
  if (process.env.NODE_ENV !== "production") fail("NODE_ENV 必须为 production。");
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) fail("DATABASE_URL 未配置。");
  const sqlitePath = getAbsoluteProductionSqlitePath(databaseUrl);
  const parent = path.posix.dirname(sqlitePath);
  if (!fs.existsSync(parent)) fail(`生产 SQLite parent directory 不存在：${parent}`);
  try { fs.accessSync(parent, fs.constants.W_OK); } catch { fail(`生产 SQLite parent directory 不可写：${parent}`); }

  const auth = getAuthConfig(process.env);
  if (!auth.ok) fail(`Authentication 配置无效：${auth.reason}`);
  const repoPath = repoRoot.replaceAll("\\", "/").toLowerCase();
  if (sqlitePath.toLowerCase().startsWith(`${repoPath}/`)) fail("生产 SQLite 必须位于仓库目录之外。");
  console.log(`Production environment valid (SQLite: ${sqlitePath}, TTL: ${auth.config.sessionTtlDays} days, Node: ${process.versions.node})`);
}

try { main(); } catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }
