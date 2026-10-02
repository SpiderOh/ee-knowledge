import { parseBackupConfig, validateBackupConfig } from "./lib/backup-config";

function main() {
  const parsed = parseBackupConfig();
  const config = validateBackupConfig(parsed);
  console.log(`Source: ${config.sourcePath}`);
  console.log(`Primary: ${config.primaryDir}`);
  console.log(`Retention: ${config.retentionCount}`);
  if (config.secondaryDir) console.log(`Secondary: ${config.secondaryDir}`);
  else console.log("Secondary: disabled");
  console.log("Backup configuration passed (read-only)");
}

try { main(); } catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }
