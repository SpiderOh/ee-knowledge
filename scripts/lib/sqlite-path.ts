import fs from "node:fs";
import path from "node:path";

export const repoRoot = path.resolve(__dirname, "../..");
const prismaDir = path.join(repoRoot, "prisma");

function readEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return undefined;
  const line = fs.readFileSync(filePath, "utf8").split(/\r?\n/).find((item) => /^\s*DATABASE_URL\s*=/.test(item));
  if (!line) return undefined;
  const value = line.slice(line.indexOf("=") + 1).trim().replace(/^['"]|['"]$/g, "");
  return value || undefined;
}

export function getDatabaseUrl() {
  return process.env.DATABASE_URL || readEnvFile(path.join(repoRoot, ".env.local")) || readEnvFile(path.join(repoRoot, ".env"));
}

export function resolveSqlitePath(databaseUrl = getDatabaseUrl()) {
  if (!databaseUrl) throw new Error("未找到 DATABASE_URL。");
  if (!databaseUrl.startsWith("file:")) throw new Error("当前 CLI 只支持 SQLite file: DATABASE_URL。");
  const rawPath = databaseUrl.slice("file:".length).split("?")[0];
  if (!rawPath) throw new Error("DATABASE_URL 缺少 SQLite 文件路径。");
  let decodedPath: string;
  try { decodedPath = decodeURIComponent(rawPath); } catch { decodedPath = rawPath; }
  return path.resolve(prismaDir, decodedPath);
}

export function sidecarPaths(databasePath: string) {
  return ["-journal", "-wal", "-shm"].map((suffix) => `${databasePath}${suffix}`);
}

export function formatLocalTimestamp(date = new Date()) {
  const parts = new Intl.DateTimeFormat("sv-SE", { timeZone: undefined, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}${values.month}${values.day}-${values.hour}${values.minute}${values.second}`;
}
