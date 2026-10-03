import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { findSqliteExecutable, runSqlite, runSqliteIntegrityCheck } from "./lib/sqlite-backup";
import { createVerifiedLiveBackup } from "./lib/backup-files";
import { pruneScheduledBackups, runScheduledBackup } from "./scheduled-backup";
import { validateBackupConfig } from "./lib/backup-config";

function temporaryDirectory() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ee-knowledge-backup-"));
}

function createFixtureDatabase(executable: string, filePath: string) {
  const result = runSqlite(executable, [filePath], "CREATE TABLE items (value TEXT NOT NULL); INSERT INTO items VALUES ('online-backup-ok');\n");
  assert.equal(result.status, 0, result.stderr || "fixture SQLite database could not be created");
}

function assertQuery(executable: string, filePath: string, expected: string) {
  const result = runSqlite(executable, ["-batch", "-noheader", filePath, "SELECT value FROM items;"]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), expected);
}

function config(sourcePath: string, primaryDir: string, secondaryDir: string | undefined, executable: string, retentionCount = 2) {
  return { sourcePath, primaryDir, secondaryDir, retentionCount, sqliteExecutable: executable };
}

function main() {
  const executable = findSqliteExecutable();
  const root = temporaryDirectory();
  try {
    const sourcePath = path.join(root, "source.db");
    const primaryDir = path.join(root, "primary");
    fs.mkdirSync(primaryDir);
    createFixtureDatabase(executable, sourcePath);

    const liveName = "ee-knowledge-live-20261002-033000.db";
    const livePath = createVerifiedLiveBackup(sourcePath, primaryDir, executable, liveName);
    assert.ok(fs.existsSync(livePath));
    assert.ok(!fs.existsSync(`${livePath}.partial`));
    runSqliteIntegrityCheck(livePath, executable);
    assertQuery(executable, livePath, "online-backup-ok");
    console.log("Live SQLite online backup: PASS");

    const disabledConfig = validateBackupConfig(config(sourcePath, primaryDir, undefined, executable));
    runScheduledBackup(disabledConfig);
    console.log("Secondary disabled path: PASS");

    const secondaryDir = path.join(root, "secondary");
    fs.mkdirSync(secondaryDir);
    const configured = validateBackupConfig(
      config(sourcePath, primaryDir, secondaryDir, executable),
      executable,
      (filePath) => ({ dev: filePath === primaryDir ? 1 : 2 }),
    );
    runScheduledBackup(configured, { statReader: (filePath) => ({ dev: filePath === primaryDir ? 1 : 2 }) });
    const secondaryFiles = fs.readdirSync(secondaryDir).filter((file) => file.endsWith(".db"));
    assert.equal(secondaryFiles.length, 1);
    assert.equal(fs.readFileSync(path.join(primaryDir, secondaryFiles[0])).toString("hex"), fs.readFileSync(path.join(secondaryDir, secondaryFiles[0])).toString("hex"));
    console.log("Secondary copy, SHA-256 and integrity: PASS");

    assert.throws(
      () => validateBackupConfig(config(sourcePath, primaryDir, secondaryDir, executable), executable, () => ({ dev: 7 })),
      /same filesystem/,
    );
    console.log("Configured same-filesystem rejection: PASS");

    const droppedMount = path.join(root, "dropped-mount");
    fs.mkdirSync(droppedMount);
    const validatedDrop = validateBackupConfig(config(sourcePath, primaryDir, droppedMount, executable), executable, (filePath) => ({ dev: filePath === primaryDir ? 1 : 2 }));
    assert.throws(
      () => runScheduledBackup(validatedDrop, { statReader: () => ({ dev: 1 }) }),
      /SECONDARY_COPY|same filesystem/,
    );
    assert.ok(fs.readdirSync(primaryDir).some((file) => /^ee-knowledge-scheduled-\d{8}-\d{6}(?:-\d+)?\.db$/.test(file)));
    console.log("Secondary mount-drop revalidation and Primary preservation: PASS");

    const failedSecondary = path.join(root, "failed-secondary");
    fs.mkdirSync(failedSecondary);
    const validatedFailure = validateBackupConfig(config(sourcePath, primaryDir, failedSecondary, executable), executable, (filePath) => ({ dev: filePath === primaryDir ? 1 : 2 }));
    const copyAfterPartialThenFails = (source: string, destination: string) => {
      fs.copyFileSync(source, destination);
      throw new Error("simulated Secondary I/O failure");
    };
    assert.throws(
      () => runScheduledBackup(validatedFailure, { statReader: (filePath) => ({ dev: filePath === primaryDir ? 1 : 2 }), copyFile: copyAfterPartialThenFails }),
      /SECONDARY_COPY/,
    );
    assert.equal(fs.readdirSync(failedSecondary).some((file) => file.endsWith(".partial")), false);
    assert.ok(fs.readdirSync(primaryDir).some((file) => /^ee-knowledge-scheduled-\d{8}-\d{6}(?:-\d+)?\.db$/.test(file)));
    console.log("Secondary partial cleanup and Primary preservation: PASS");

    const retentionDir = path.join(root, "retention");
    fs.mkdirSync(retentionDir);
    for (const name of ["ee-knowledge-scheduled-20261001-010000.db", "ee-knowledge-scheduled-20261001-020000.db", "ee-knowledge-scheduled-20261001-030000-1.db", "ee-knowledge-scheduled-20261001-040000.db"]) fs.writeFileSync(path.join(retentionDir, name), "scheduled");
    for (const name of ["ee-knowledge-20261001-010000.db", "ee-knowledge-live-20261001-010000.db", "pre-restore-20261001.db", "manual.db", "notes.txt", "ee-knowledge-scheduled-20261001-050000.db.partial"]) fs.writeFileSync(path.join(retentionDir, name), "keep");
    assert.equal(pruneScheduledBackups(retentionDir, 2), 2);
    assert.ok(fs.existsSync(path.join(retentionDir, "ee-knowledge-scheduled-20261001-030000-1.db")));
    assert.ok(fs.existsSync(path.join(retentionDir, "ee-knowledge-scheduled-20261001-040000.db")));
    for (const name of ["ee-knowledge-20261001-010000.db", "ee-knowledge-live-20261001-010000.db", "pre-restore-20261001.db", "manual.db", "notes.txt", "ee-knowledge-scheduled-20261001-050000.db.partial"]) assert.ok(fs.existsSync(path.join(retentionDir, name)));
    assert.equal(fs.existsSync(path.join(retentionDir, "ee-knowledge-scheduled-20261001-010000.db")), false);
    assert.equal(fs.existsSync(path.join(retentionDir, "ee-knowledge-scheduled-20261001-020000.db")), false);
    console.log("Scheduled retention namespace and manual/live file preservation: PASS");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
  console.log("Backup verification passed (online SQLite backup, Secondary, integrity, fail-closed, retention)");
}

try { main(); } catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }
