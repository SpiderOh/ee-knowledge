import fs from "node:fs";
import path from "node:path";
import { runSqliteIntegrityCheck } from "./sqlite-backup";
import { formatLocalTimestamp, sidecarPaths } from "./sqlite-path";

const SQLITE_HEADER = Buffer.from("SQLite format 3\0", "ascii");

export type RestoreDatabaseOptions = {
  sourcePath: string;
  targetPath: string;
  preRestoreDirectory: string;
  sqliteExecutable: string;
  timestamp?: string;
  integrityCheck?: (filePath: string, sqliteExecutable: string) => void;
};

export type RestoreDatabaseResult = {
  sourcePath: string;
  targetPath: string;
  preRestorePath?: string;
};

function assertSqliteHeader(filePath: string) {
  if (!fs.existsSync(filePath)) throw new Error(`备份文件不存在：${filePath}`);
  const handle = fs.openSync(filePath, "r");
  const header = Buffer.alloc(SQLITE_HEADER.length);
  try {
    fs.readSync(handle, header, 0, header.length, 0);
  } finally {
    fs.closeSync(handle);
  }
  if (!header.equals(SQLITE_HEADER)) throw new Error("备份文件不是有效的 SQLite 文件。");
}

function nextDestination(directory: string, prefix: string) {
  let candidate = path.join(directory, `${prefix}.db`);
  let index = 1;
  while (fs.existsSync(candidate)) candidate = path.join(directory, `${prefix}-${index++}.db`);
  return candidate;
}

function assertNoSidecars(filePath: string, message: string) {
  const sidecars = sidecarPaths(filePath).filter((sidecar) => fs.existsSync(sidecar));
  if (sidecars.length) throw new Error(message);
}

export function restoreDatabase(options: RestoreDatabaseOptions): RestoreDatabaseResult {
  const sourcePath = path.resolve(options.sourcePath);
  const targetPath = path.resolve(options.targetPath);
  const preRestoreDirectory = path.resolve(options.preRestoreDirectory);
  const integrityCheck = options.integrityCheck ?? runSqliteIntegrityCheck;

  if (sourcePath === targetPath) throw new Error("备份文件不能与当前数据库是同一个文件。");
  assertSqliteHeader(sourcePath);
  assertNoSidecars(sourcePath, "备份文件存在 journal/wal/shm sidecar，无法安全恢复。");
  try {
    integrityCheck(sourcePath, options.sqliteExecutable);
  } catch {
    throw new Error("备份文件完整性检查失败，无法安全恢复。");
  }
  assertNoSidecars(targetPath, "当前数据库存在 journal/wal/shm 文件，请先关闭应用后再恢复。");

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  const partialPath = `${targetPath}.restore-partial`;
  if (fs.existsSync(partialPath)) throw new Error("恢复目标存在未完成的临时文件，请先清理后再恢复。");
  let preRestorePath: string | undefined;
  if (fs.existsSync(targetPath)) {
    fs.mkdirSync(preRestoreDirectory, { recursive: true });
    const timestamp = options.timestamp ?? formatLocalTimestamp();
    preRestorePath = nextDestination(preRestoreDirectory, `pre-restore-${timestamp}`);
    fs.copyFileSync(targetPath, preRestorePath, fs.constants.COPYFILE_EXCL);
  }

  let partialCreated = false;
  try {
    fs.copyFileSync(sourcePath, partialPath, fs.constants.COPYFILE_EXCL);
    partialCreated = true;
    integrityCheck(partialPath, options.sqliteExecutable);
    if (fs.existsSync(targetPath)) fs.rmSync(targetPath, { force: true });
    fs.renameSync(partialPath, targetPath);
    integrityCheck(targetPath, options.sqliteExecutable);
  } catch (error) {
    if (partialCreated && fs.existsSync(partialPath)) fs.rmSync(partialPath, { force: true });
    throw error;
  }

  return { sourcePath, targetPath, preRestorePath };
}
