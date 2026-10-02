import fs from "node:fs";
import path from "node:path";
import { runOnlineBackup, runSqliteIntegrityCheck } from "./sqlite-backup";
import { formatLocalTimestamp } from "./sqlite-path";

export const SCHEDULED_BACKUP_PATTERN = /^ee-knowledge-(\d{8})-(\d{6})(?:-(\d+))?\.db$/;

export function nextBackupFilename(directory: string, timestamp = formatLocalTimestamp()) {
  let index = 0;
  while (true) {
    const suffix = index === 0 ? "" : `-${index}`;
    const name = `ee-knowledge-${timestamp}${suffix}.db`;
    if (!fs.existsSync(path.join(directory, name)) && !fs.existsSync(path.join(directory, `${name}.partial`))) return name;
    index += 1;
  }
}

export function createVerifiedLiveBackup(sourcePath: string, primaryDir: string, sqliteExecutable: string, filename = nextBackupFilename(primaryDir)) {
  const finalPath = path.join(primaryDir, filename);
  const partialPath = `${finalPath}.partial`;
  try {
    runOnlineBackup(sourcePath, partialPath, sqliteExecutable);
    runSqliteIntegrityCheck(partialPath, sqliteExecutable);
    fs.renameSync(partialPath, finalPath);
    return finalPath;
  } catch (error) {
    if (fs.existsSync(partialPath)) fs.rmSync(partialPath, { force: true });
    throw error;
  }
}
