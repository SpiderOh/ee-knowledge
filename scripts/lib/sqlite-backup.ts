import crypto from "node:crypto";
import fs from "node:fs";
import { spawnSync } from "node:child_process";

export type StatLike = Pick<fs.Stats, "dev">;
export type StatReader = (filePath: string) => StatLike;

function commandName() {
  return process.platform === "win32" ? "sqlite3.exe" : "sqlite3";
}

export function findSqliteExecutable() {
  const executable = commandName();
  const result = spawnSync(executable, ["--version"], { encoding: "utf8", windowsHide: true });
  if (result.error || result.status !== 0) {
    throw new Error("sqlite3 CLI is required for live backup. Install sqlite3 and ensure it is available on PATH.");
  }
  return executable;
}

export function runSqlite(executable: string, args: string[], input?: string) {
  const result = spawnSync(executable, args, { input, encoding: "utf8", windowsHide: true });
  if (result.error) throw new Error(`sqlite3 CLI failed to start: ${result.error.message}`);
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

function sqliteShellQuote(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

export function runOnlineBackup(sourcePath: string, destinationPath: string, executable: string) {
  const result = runSqlite(executable, [sourcePath], `.backup ${sqliteShellQuote(destinationPath)}\n.quit\n`);
  if (result.status !== 0) throw new Error(result.stderr.trim() || result.stdout.trim() || "sqlite3 online backup failed.");
}

export function runSqliteIntegrityCheck(filePath: string, executable: string) {
  const result = runSqlite(executable, ["-batch", "-noheader", filePath, "PRAGMA integrity_check;"]);
  if (result.status !== 0 || result.stdout.trim() !== "ok") {
    throw new Error(result.stderr.trim() || `SQLite integrity_check failed for ${filePath}.`);
  }
}

export function sha256File(filePath: string) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

export function filesystemDevice(filePath: string, statReader: StatReader = fs.statSync) {
  return statReader(filePath).dev;
}

export function assertIndependentFilesystem(primaryDir: string, secondaryDir: string, statReader: StatReader = fs.statSync) {
  if (filesystemDevice(primaryDir, statReader) === filesystemDevice(secondaryDir, statReader)) {
    throw new Error("Secondary backup destination is on the same filesystem.");
  }
}
