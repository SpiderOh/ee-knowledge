import fs from "node:fs";
import path from "node:path";
import { formatLocalTimestamp, repoRoot, resolveSqlitePath, sidecarPaths } from "./lib/sqlite-path";

const SQLITE_HEADER = Buffer.from("SQLite format 3\0", "ascii");

function assertSqlite(filePath: string) {
  if (!fs.existsSync(filePath)) throw new Error(`备份文件不存在：${filePath}`);
  const handle = fs.openSync(filePath, "r"); const header = Buffer.alloc(SQLITE_HEADER.length);
  try { fs.readSync(handle, header, 0, header.length, 0); } finally { fs.closeSync(handle); }
  if (!header.equals(SQLITE_HEADER)) throw new Error("备份文件不是有效的 SQLite 文件。");
}

function nextDestination(directory: string, prefix: string) {
  let candidate = path.join(directory, `${prefix}.db`); let index = 1;
  while (fs.existsSync(candidate)) candidate = path.join(directory, `${prefix}-${index++}.db`);
  return candidate;
}

function main() {
  const args = process.argv.slice(2); const confirm = args.includes("--confirm"); const sourceArg = args.find((arg) => !arg.startsWith("--"));
  if (!confirm) throw new Error("Restore 会替换当前 SQLite 数据库。请添加 --confirm 后重试。");
  if (!sourceArg) throw new Error("请提供备份文件路径，例如 npm run db:restore -- backups/example.db --confirm。");
  const source = path.resolve(process.cwd(), sourceArg); const target = resolveSqlitePath();
  if (path.resolve(source) === path.resolve(target)) throw new Error("备份文件不能与当前数据库是同一个文件。");
  assertSqlite(source);
  const sourceSidecars = sidecarPaths(source).filter((filePath) => fs.existsSync(filePath));
  if (sourceSidecars.length) throw new Error("备份文件存在 journal/wal/shm sidecar，无法安全恢复。");
  const targetSidecars = sidecarPaths(target).filter((filePath) => fs.existsSync(filePath));
  if (targetSidecars.length) throw new Error("当前数据库存在 journal/wal/shm 文件，请先关闭应用后再恢复。");
  fs.mkdirSync(path.dirname(target), { recursive: true }); fs.mkdirSync(path.join(repoRoot, "backups"), { recursive: true });
  if (fs.existsSync(target)) {
    assertSqlite(target);
    const preRestore = nextDestination(path.join(repoRoot, "backups"), `pre-restore-${formatLocalTimestamp()}`);
    fs.copyFileSync(target, preRestore, fs.constants.COPYFILE_EXCL);
    console.log(`Pre-restore backup: ${preRestore}`);
  }
  fs.copyFileSync(source, target);
  console.log(`Restored: ${source}`); console.log(`Destination: ${target}`);
}

try { main(); } catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }
