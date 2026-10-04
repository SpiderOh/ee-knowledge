import fs from "node:fs";
import { repoRoot } from "./lib/sqlite-path";
import { validateProductionEnv } from "./lib/production-env";

function main() {
  const result = validateProductionEnv({
    nodeVersion: process.versions.node,
    nodeEnv: process.env.NODE_ENV,
    databaseUrl: process.env.DATABASE_URL,
    repoRoot,
    authEnv: process.env,
    fs: {
      exists: fs.existsSync,
      writable: (directoryPath) => {
        try { fs.accessSync(directoryPath, fs.constants.W_OK); return true; } catch { return false; }
      },
    },
  });
  console.log(`Production environment valid (SQLite: ${result.sqlitePath}, TTL: ${result.auth.sessionTtlDays} days, Node: ${process.versions.node})`);
}

try { main(); } catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }
