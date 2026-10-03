import fs from "node:fs";
import path from "node:path";
import { repoRoot, resolveSqlitePath } from "./sqlite-path";
import { assertIndependentFilesystem, findSqliteExecutable } from "./sqlite-backup";

export const DEFAULT_RETENTION_COUNT = 14;
export const MIN_RETENTION_COUNT = 2;
export const MAX_RETENTION_COUNT = 365;

export type BackupConfig = {
  sourcePath: string;
  primaryDir: string;
  secondaryDir?: string;
  retentionCount: number;
  sqliteExecutable: string;
};

function requiredEnv(env: NodeJS.ProcessEnv, name: string) {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function resolveDirectory(value: string) {
  return path.isAbsolute(value) ? path.normalize(value) : path.resolve(repoRoot, value);
}

export function parseBackupConfig(env: NodeJS.ProcessEnv = process.env): Omit<BackupConfig, "sqliteExecutable"> {
  const rawRetention = env.EE_BACKUP_RETENTION_COUNT?.trim() || String(DEFAULT_RETENTION_COUNT);
  if (!/^\d+$/.test(rawRetention)) throw new Error("EE_BACKUP_RETENTION_COUNT must be an integer.");
  const retentionCount = Number(rawRetention);
  if (!Number.isSafeInteger(retentionCount) || retentionCount < MIN_RETENTION_COUNT || retentionCount > MAX_RETENTION_COUNT) {
    throw new Error(`EE_BACKUP_RETENTION_COUNT must be between ${MIN_RETENTION_COUNT} and ${MAX_RETENTION_COUNT}.`);
  }
  const secondary = env.EE_BACKUP_SECONDARY_DIR?.trim();
  return {
    sourcePath: resolveSqlitePath(requiredEnv(env, "DATABASE_URL")),
    primaryDir: resolveDirectory(requiredEnv(env, "EE_BACKUP_DIR")),
    secondaryDir: secondary ? resolveDirectory(secondary) : undefined,
    retentionCount,
  };
}

export function assertReadableFile(filePath: string) {
  if (!fs.existsSync(filePath)) throw new Error(`Source SQLite database does not exist: ${filePath}`);
  if (!fs.statSync(filePath).isFile()) throw new Error(`Source SQLite database is not a file: ${filePath}`);
  fs.accessSync(filePath, fs.constants.R_OK);
}

export function assertWritableDirectory(directory: string, label: string) {
  if (!fs.existsSync(directory)) throw new Error(`${label} directory does not exist: ${directory}`);
  if (!fs.statSync(directory).isDirectory()) throw new Error(`${label} path is not a directory: ${directory}`);
  fs.accessSync(directory, fs.constants.R_OK | fs.constants.W_OK | fs.constants.X_OK);
}

export function validateBackupConfig(config: Omit<BackupConfig, "sqliteExecutable">, sqliteExecutable = findSqliteExecutable(), statReader?: (filePath: string) => Pick<fs.Stats, "dev">) {
  assertReadableFile(config.sourcePath);
  assertWritableDirectory(config.primaryDir, "Primary backup");
  if (config.secondaryDir) {
    assertWritableDirectory(config.secondaryDir, "Secondary backup");
    assertIndependentFilesystem(config.primaryDir, config.secondaryDir, statReader);
  }
  return { ...config, sqliteExecutable };
}
