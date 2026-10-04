import path from "node:path";
import { getAuthConfig, type AuthConfig, type AuthEnvironment } from "@/lib/auth/config";
import { isSupportedNodeVersion, NODE_RUNTIME_REQUIREMENT } from "./node-runtime";

export type ProductionEnvFs = {
  exists: (filePath: string) => boolean;
  writable: (directoryPath: string) => boolean;
};

export type ProductionEnvInput = {
  nodeVersion: string;
  nodeEnv?: string;
  databaseUrl?: string;
  repoRoot: string;
  authEnv: AuthEnvironment;
  fs: ProductionEnvFs;
};

export type ProductionEnvResult = {
  sqlitePath: string;
  auth: AuthConfig;
};

function fail(message: string): never {
  throw new Error(message);
}

export function getAbsoluteProductionSqlitePath(databaseUrl: string) {
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

export function validateProductionEnv(input: ProductionEnvInput): ProductionEnvResult {
  if (!isSupportedNodeVersion(input.nodeVersion)) fail(`Node.js 版本过低，当前文档解析依赖要求 ${NODE_RUNTIME_REQUIREMENT}。`);
  if (input.nodeEnv !== "production") fail("NODE_ENV 必须为 production。");
  const databaseUrl = input.databaseUrl?.trim();
  if (!databaseUrl) fail("DATABASE_URL 未配置。");
  const sqlitePath = getAbsoluteProductionSqlitePath(databaseUrl);
  const parent = path.posix.dirname(sqlitePath);
  if (!input.fs.exists(parent)) fail(`生产 SQLite parent directory 不存在：${parent}`);
  if (!input.fs.writable(parent)) fail(`生产 SQLite parent directory 不可写：${parent}`);

  const auth = getAuthConfig(input.authEnv);
  if (!auth.ok) fail(`Authentication 配置无效：${auth.reason}`);
  const repoPath = input.repoRoot.replaceAll("\\", "/").toLowerCase().replace(/\/$/, "");
  if (sqlitePath.toLowerCase().startsWith(`${repoPath}/`)) fail("生产 SQLite 必须位于仓库目录之外。");
  return { sqlitePath, auth: auth.config };
}
