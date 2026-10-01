import fs from "node:fs";
import path from "node:path";
import { formatLocalTimestamp, repoRoot, resolveSqlitePath, sidecarPaths } from "./lib/sqlite-path";

const SQLITE_HEADER = Buffer.from("SQLite format 3\0", "ascii");

function assertSqlite(filePath: string) {
  if (!fs.existsSync(filePath)) throw new Error(`数据库文件不存在：${filePath}`);
  const header = Buffer.alloc(SQLITE_HEADER.length);
  const handle = fs.openSync(filePath, "r");
  try { fs.readSync(handle, header, 0, header.length, 0); } finally { fs.closeSync(handle); }
  if (!header.equals(SQLITE_HEADER)) throw new Error("数据库文件不是有效的 SQLite 文件。");
}

function nextDestination(directory: string, prefix: string) {
  let candidate = path.join(directory, `${prefix}.db`); let index = 1;
  while (fs.existsSync(candidate)) candidate = path.join(directory, `${prefix}-${index++}.db`);
  return candidate;
}

function main() {
  const source = resolveSqlitePath();
  const outputArg = process.argv.slice(2).find((arg) => arg.startsWith("--output="))?.slice("--output=".length);
  const directory = outputArg ? path.resolve(process.cwd(), outputArg) : path.join(repoRoot, "backups");
  assertSqlite(source);
  const activeSidecars = sidecarPaths(source).filter((filePath) => fs.existsSync(filePath));
  if (activeSidecars.length) throw new Error("检测到 SQLite journal/wal/shm 文件，请先停止 Next.js / Prisma 写入进程后再备份。");
  fs.mkdirSync(directory, { recursive: true });
  const destination = nextDestination(directory, `ee-knowledge-${formatLocalTimestamp()}`);
  fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
  console.log(`Source: ${source}`);
  console.log(`Destination: ${destination}`);
  console.log(`Size: ${fs.statSync(destination).size} bytes`);
  console.log(`Completed: ${new Date().toLocaleString("zh-CN")}`);
}

try { main(); } catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }
