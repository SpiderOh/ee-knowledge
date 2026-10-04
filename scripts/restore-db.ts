import path from "node:path";
import { findSqliteExecutable } from "./lib/sqlite-backup";
import { repoRoot, resolveSqlitePath } from "./lib/sqlite-path";
import { restoreDatabase } from "./lib/restore-db";

function main() {
  const args = process.argv.slice(2); const confirm = args.includes("--confirm"); const sourceArg = args.find((arg) => !arg.startsWith("--"));
  if (!confirm) throw new Error("Restore 会替换当前 SQLite 数据库。请添加 --confirm 后重试。");
  if (!sourceArg) throw new Error("请提供备份文件路径，例如 npm run db:restore -- backups/example.db --confirm。");
  const source = path.resolve(process.cwd(), sourceArg); const target = resolveSqlitePath();
  const result = restoreDatabase({ sourcePath: source, targetPath: target, preRestoreDirectory: path.join(repoRoot, "backups"), sqliteExecutable: findSqliteExecutable() });
  if (result.preRestorePath) console.log(`Pre-restore backup: ${result.preRestorePath}`);
  console.log(`Restored: ${result.sourcePath}`); console.log(`Destination: ${result.targetPath}`); console.log("Integrity: OK");
}

try { main(); } catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }
