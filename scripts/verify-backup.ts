import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { findSqliteExecutable, runSqlite, runSqliteIntegrityCheck } from "./lib/sqlite-backup";
import { createVerifiedLiveBackup } from "./lib/backup-files";
import { pruneScheduledBackups, runScheduledBackup } from "./scheduled-backup";
import { validateBackupConfig } from "./lib/backup-config";
import { restoreDatabase } from "./lib/restore-db";
import { repoRoot } from "./lib/sqlite-path";

function temporaryDirectory() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ee-knowledge-backup-"));
}

function createFixtureDatabase(executable: string, filePath: string, value = "online-backup-ok") {
  const result = runSqlite(executable, [filePath], `CREATE TABLE items (value TEXT NOT NULL); INSERT INTO items VALUES ('${value}');\n`);
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

    const restoreRoot = path.join(root, "restore-regression");
    fs.mkdirSync(restoreRoot);
    const restoreBackup = path.join(restoreRoot, "restore-source.db");
    const restoreTarget = path.join(restoreRoot, "restore-target.db");
    const restorePreDirectory = path.join(restoreRoot, "pre-restore");
    createFixtureDatabase(executable, restoreBackup, "restored-data");
    createFixtureDatabase(executable, restoreTarget, "old-data");
    const restoreCli = process.platform === "win32" ? "npm.cmd" : "npm";
    const missingConfirmation = spawnSync(restoreCli, ["run", "db:restore", "--", restoreBackup], { cwd: repoRoot, encoding: "utf8", windowsHide: true });
    assert.notEqual(missingConfirmation.status, 0);
    assert.match(`${missingConfirmation.stdout ?? ""}${missingConfirmation.stderr ?? ""}`, /--confirm/);
    console.log("Restore confirmation requirement: PASS");
    const restored = restoreDatabase({ sourcePath: restoreBackup, targetPath: restoreTarget, preRestoreDirectory: restorePreDirectory, sqliteExecutable: executable, timestamp: "20261004-010000" });
    assert.ok(restored.preRestorePath && fs.existsSync(restored.preRestorePath));
    assertQuery(executable, restoreTarget, "restored-data");
    assertQuery(executable, restored.preRestorePath!, "old-data");
    assertQuery(executable, restoreBackup, "restored-data");
    runSqliteIntegrityCheck(restoreTarget, executable);
    console.log("Valid restore over existing target and pre-restore preservation: PASS");

    const freshSource = path.join(restoreRoot, "fresh-source.db");
    const freshTarget = path.join(restoreRoot, "fresh-target.db");
    createFixtureDatabase(executable, freshSource, "fresh-data");
    const freshResult = restoreDatabase({ sourcePath: freshSource, targetPath: freshTarget, preRestoreDirectory: restorePreDirectory, sqliteExecutable: executable });
    assert.equal(freshResult.preRestorePath, undefined);
    assertQuery(executable, freshTarget, "fresh-data");
    runSqliteIntegrityCheck(freshTarget, executable);
    console.log("Fresh-target restore: PASS");

    assert.throws(() => restoreDatabase({ sourcePath: restoreBackup, targetPath: restoreBackup, preRestoreDirectory: restorePreDirectory, sqliteExecutable: executable }), /同一个文件/);
    assertQuery(executable, restoreBackup, "restored-data");
    console.log("Source equals target rejection: PASS");

    const invalidSource = path.join(restoreRoot, "invalid-source.db");
    fs.writeFileSync(invalidSource, "not sqlite");
    assert.throws(() => restoreDatabase({ sourcePath: invalidSource, targetPath: restoreTarget, preRestoreDirectory: restorePreDirectory, sqliteExecutable: executable }), /不是有效的 SQLite/);
    assertQuery(executable, restoreTarget, "restored-data");
    console.log("Invalid non-SQLite source rejection: PASS");

    const corruptedSource = path.join(restoreRoot, "corrupted-source.db");
    createFixtureDatabase(executable, corruptedSource, "corrupted-data");
    const corruptedHandle = fs.openSync(corruptedSource, "r+");
    try { fs.writeSync(corruptedHandle, Buffer.from("corrupted-page"), 0, 14, 4096); } finally { fs.closeSync(corruptedHandle); }
    assert.throws(() => restoreDatabase({ sourcePath: corruptedSource, targetPath: restoreTarget, preRestoreDirectory: restorePreDirectory, sqliteExecutable: executable }), /完整性检查/);
    assertQuery(executable, restoreTarget, "restored-data");
    assert.equal(fs.readdirSync(restorePreDirectory).filter((file) => file.startsWith("pre-restore-")).length, 1);
    console.log("Header-valid corrupted source rejection before target mutation: PASS");

    const sourceSidecar = `${restoreBackup}.wal`;
    fs.writeFileSync(sourceSidecar, "sidecar");
    assert.throws(() => restoreDatabase({ sourcePath: restoreBackup, targetPath: restoreTarget, preRestoreDirectory: restorePreDirectory, sqliteExecutable: executable }), /sidecar/);
    fs.rmSync(sourceSidecar);
    console.log("Source sidecar rejection: PASS");

    const targetSidecar = `${restoreTarget}.wal`;
    fs.writeFileSync(targetSidecar, "sidecar");
    assert.throws(() => restoreDatabase({ sourcePath: restoreBackup, targetPath: restoreTarget, preRestoreDirectory: restorePreDirectory, sqliteExecutable: executable }), /sidecar/);
    fs.rmSync(targetSidecar);
    assertQuery(executable, restoreTarget, "restored-data");
    console.log("Target sidecar rejection: PASS");

    const collisionTarget = path.join(restoreRoot, "collision-target.db");
    createFixtureDatabase(executable, collisionTarget, "collision-old");
    const collisionPath = path.join(restorePreDirectory, "pre-restore-20261004-020000.db");
    fs.writeFileSync(collisionPath, "existing-pre-restore");
    const collisionResult = restoreDatabase({ sourcePath: restoreBackup, targetPath: collisionTarget, preRestoreDirectory: restorePreDirectory, sqliteExecutable: executable, timestamp: "20261004-020000" });
    assert.equal(collisionResult.preRestorePath, path.join(restorePreDirectory, "pre-restore-20261004-020000-1.db"));
    assert.equal(fs.readFileSync(collisionPath, "utf8"), "existing-pre-restore");
    assertQuery(executable, collisionTarget, "restored-data");
    console.log("Pre-restore naming collision protection: PASS");

    const partialTarget = path.join(restoreRoot, "partial-target.db");
    createFixtureDatabase(executable, partialTarget, "partial-old");
    const injectedFailure = (filePath: string, sqliteExecutable: string) => {
      if (filePath.endsWith(".restore-partial")) throw new Error("simulated staged integrity failure");
      runSqliteIntegrityCheck(filePath, sqliteExecutable);
    };
    assert.throws(() => restoreDatabase({ sourcePath: restoreBackup, targetPath: partialTarget, preRestoreDirectory: restorePreDirectory, sqliteExecutable: executable, integrityCheck: injectedFailure }), /simulated staged integrity failure/);
    assert.equal(fs.existsSync(`${partialTarget}.restore-partial`), false);
    assertQuery(executable, partialTarget, "partial-old");
    console.log("Restore partial cleanup on failure: PASS");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
  console.log("Backup verification passed (online SQLite backup, restore lifecycle, integrity, fail-closed, retention)");
}

try { main(); } catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }
