import { parseBackupConfig, validateBackupConfig } from "./lib/backup-config";
import { createVerifiedLiveBackup } from "./lib/backup-files";

function main() {
  const parsed = parseBackupConfig();
  const config = validateBackupConfig({ ...parsed, secondaryDir: undefined });
  const finalPath = createVerifiedLiveBackup(config.sourcePath, config.primaryDir, config.sqliteExecutable);
  console.log(`Source: ${config.sourcePath}`);
  console.log(`Live backup: ${finalPath}`);
  console.log("Primary integrity OK");
  console.log("Completed");
}

try { main(); } catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }
