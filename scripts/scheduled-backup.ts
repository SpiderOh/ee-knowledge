import fs from "node:fs";
import path from "node:path";
import { parseBackupConfig, validateBackupConfig } from "./lib/backup-config";
import { sha256File, runSqliteIntegrityCheck } from "./lib/sqlite-backup";
import { createVerifiedLiveBackup, nextBackupFilename, SCHEDULED_BACKUP_PATTERN } from "./lib/backup-files";

function stageError(stage: string, error: unknown): never {
  throw new Error(`${stage}: ${error instanceof Error ? error.message : String(error)}`);
}

function sortScheduledFiles(directory: string) {
  return fs.readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && SCHEDULED_BACKUP_PATTERN.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => {
      const parse = (name: string) => {
        const match = name.match(SCHEDULED_BACKUP_PATTERN);
        return { timestamp: `${match?.[1] ?? ""}${match?.[2] ?? ""}`, suffix: Number(match?.[3] ?? 0) };
      };
      const left = parse(a); const right = parse(b);
      return left.timestamp.localeCompare(right.timestamp) || left.suffix - right.suffix;
    });
}

export function pruneScheduledBackups(directory: string, retentionCount: number) {
  const files = sortScheduledFiles(directory);
  const removed = files.slice(0, Math.max(0, files.length - retentionCount));
  for (const filename of removed) fs.rmSync(path.join(directory, filename), { force: false });
  return removed.length;
}

function copySecondary(primaryPath: string, secondaryPath: string, executable: string) {
  const partialPath = `${secondaryPath}.partial`;
  let createdPartial = false;
  try {
    if (fs.existsSync(secondaryPath)) throw new Error(`Secondary backup already exists: ${secondaryPath}`);
    fs.copyFileSync(primaryPath, partialPath, fs.constants.COPYFILE_EXCL);
    createdPartial = true;
    const primaryHash = sha256File(primaryPath);
    const secondaryHash = sha256File(partialPath);
    if (primaryHash !== secondaryHash) throw new Error("SHA-256 mismatch between Primary and Secondary backup.");
    console.log("Secondary SHA-256 OK");
    runSqliteIntegrityCheck(partialPath, executable);
    console.log("Secondary integrity OK");
    fs.renameSync(partialPath, secondaryPath);
  } catch (error) {
    if (createdPartial && fs.existsSync(partialPath)) fs.rmSync(partialPath, { force: true });
    throw error;
  }
}

export function runScheduledBackup(config: ReturnType<typeof validateBackupConfig>) {
  const filename = nextBackupFilename(config.primaryDir);
  let primaryPath: string;
  try {
    primaryPath = createVerifiedLiveBackup(config.sourcePath, config.primaryDir, config.sqliteExecutable, filename);
  } catch (error) {
    stageError(String(error).includes("integrity_check") ? "PRIMARY_INTEGRITY" : "SQLITE_BACKUP", error);
  }
  console.log(`Primary file: ${primaryPath!}`);
  console.log("Primary integrity OK");

  try {
    const removedPrimary = pruneScheduledBackups(config.primaryDir, config.retentionCount);
    console.log(`Primary retention removed ${removedPrimary}`);
  } catch (error) { stageError("RETENTION", error); }

  if (!config.secondaryDir) {
    console.log("Secondary disabled");
    console.log("Completed");
    return;
  }

  try {
    const secondaryPath = path.join(config.secondaryDir, path.basename(primaryPath!));
    copySecondary(primaryPath!, secondaryPath, config.sqliteExecutable);
    console.log(`Secondary file: ${secondaryPath}`);
    const removedSecondary = pruneScheduledBackups(config.secondaryDir, config.retentionCount);
    console.log(`Secondary retention removed ${removedSecondary}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stage = message.includes("SHA-256") ? "SECONDARY_HASH" : message.includes("integrity_check") ? "SECONDARY_INTEGRITY" : "SECONDARY_COPY";
    stageError(stage, error);
  }
  console.log("Completed");
}

function main() {
  const config = validateBackupConfig(parseBackupConfig());
  runScheduledBackup(config);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  try { main(); } catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }
}
