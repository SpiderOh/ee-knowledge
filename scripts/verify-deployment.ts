import fs from "node:fs";
import path from "node:path";
import { repoRoot } from "./lib/sqlite-path";
import { isSupportedNodeVersion, NODE_RUNTIME_REQUIREMENT } from "./lib/node-runtime";

function read(relativePath: string) {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolutePath)) throw new Error(`Missing deployment file: ${relativePath}`);
  return fs.readFileSync(absolutePath, "utf8");
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function main() {
  const service = read("deploy/systemd/ee-knowledge.service");
  const backupService = read("deploy/systemd/ee-knowledge-backup.service");
  const backupTimer = read("deploy/systemd/ee-knowledge-backup.timer");
  const caddy = read("deploy/Caddyfile.example");
  const env = read("deploy/ee-knowledge.env.example");
  const selfHost = read("docs/SELF_HOST.md");
  const authDocs = read("docs/AUTH.md");
  const envExample = read(".env.example");
  const hashScript = read("scripts/hash-auth-password.ts");
  const packageJson = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };

  assert(
    !isSupportedNodeVersion("20.15.0") &&
    isSupportedNodeVersion("20.16.0") &&
    isSupportedNodeVersion("20.99.0") &&
    !isSupportedNodeVersion("21.0.0") &&
    !isSupportedNodeVersion("21.99.0") &&
    !isSupportedNodeVersion("22.2.0") &&
    isSupportedNodeVersion("22.3.0") &&
    isSupportedNodeVersion("22.99.0") &&
    isSupportedNodeVersion("23.0.0") &&
    isSupportedNodeVersion("24.0.0"),
    "Node runtime version gate regression",
  );
  assert(
    selfHost.includes("Node.js 20.x >= 20.16.0") &&
    selfHost.includes("Node.js >= 22.3.0") &&
    selfHost.includes("Node.js 21.x"),
    "SELF_HOST.md must document the parser Node runtime requirement and Node 21 exclusion",
  );
  assert(
    NODE_RUNTIME_REQUIREMENT.includes("20.x >= 20.16.0") && NODE_RUNTIME_REQUIREMENT.includes("22.3.0"),
    "Node runtime requirement constant is missing",
  );
  assert(packageJson.scripts?.["start:prod"] === "next start -H 127.0.0.1 -p 3000", "start:prod must bind 127.0.0.1:3000");
  assert(packageJson.scripts?.["deploy:check"] === "tsx scripts/check-production-env.ts", "deploy:check script is missing");
  assert(packageJson.scripts?.["verify:deploy"] === "tsx scripts/verify-deployment.ts", "verify:deploy script is missing");
  assert(packageJson.scripts?.["auth:hash-password"] === "tsx scripts/hash-auth-password.ts --", "auth:hash-password must forward CLI options through tsx");
  assert(/User=ee-knowledge\r?\nGroup=ee-knowledge/.test(service), "systemd must use the non-root ee-knowledge user and group");
  assert(service.includes("WorkingDirectory=/opt/ee-knowledge"), "systemd WorkingDirectory is missing");
  assert(service.includes("EnvironmentFile=/etc/ee-knowledge/ee-knowledge.env"), "systemd EnvironmentFile is missing");
  assert(service.includes("ExecStartPre=/usr/bin/npm run deploy:check"), "systemd must validate production environment first");
  assert(service.includes("ExecStartPre=/usr/bin/npm run db"), "systemd must run migration deploy before start");
  assert(service.includes("ExecStartPre=/usr/bin/npm run db:check"), "systemd must run db:check before start");
  assert(/ExecStart=.*npm run start:prod/.test(service), "systemd must start the production server");
  assert(!service.includes("db:seed") && !service.includes("db:setup") && !service.includes("migrate reset"), "systemd must not seed, db:setup, or reset the database");
  assert(/User=ee-knowledge\r?\nGroup=ee-knowledge/.test(backupService), "backup systemd must use the non-root ee-knowledge user and group");
  assert(backupService.includes("EnvironmentFile=/etc/ee-knowledge/ee-knowledge.env"), "backup systemd EnvironmentFile is missing");
  assert(backupService.includes("ExecStartPre=/usr/bin/npm run backup:check"), "backup systemd must check configuration first");
  assert(backupService.includes("ExecStart=/usr/bin/npm run backup:scheduled"), "backup systemd must run scheduled backup");
  assert(!backupService.includes("Requires=ee-knowledge.service") && !backupService.includes("systemctl stop"), "backup systemd must not depend on or stop the main service");
  assert(backupService.includes("ReadWritePaths=/var/backups/ee-knowledge"), "backup systemd must allow Primary writes");
  assert(!backupService.includes("ee-knowledge-secondary"), "backup systemd must not require an optional Secondary mountpoint");
  assert(backupTimer.includes("OnCalendar=*-*-* 03:30:00"), "backup timer must run daily");
  assert(backupTimer.includes("Persistent=true"), "backup timer must be persistent");
  assert(backupTimer.includes("RandomizedDelaySec=10m"), "backup timer must randomize daily execution");
  assert(env.includes('EE_BACKUP_DIR="/var/backups/ee-knowledge"'), "production env must define Primary backup directory");
  assert(env.includes('EE_BACKUP_SECONDARY_DIR=""'), "production env must make Secondary optional");
  assert(env.includes('EE_BACKUP_RETENTION_COUNT="14"'), "production env must define backup retention");
  assert(caddy.includes("reverse_proxy 127.0.0.1:3000"), "Caddy must reverse proxy to localhost:3000");
  assert(env.includes('NODE_ENV="production"'), "production env template must set NODE_ENV");
  assert(env.includes('DATABASE_URL="file:/var/lib/ee-knowledge/ee-knowledge.db"'), "production env must use absolute server SQLite path");
  assert(/EE_AUTH_PASSWORD_HASH=""/.test(env) && /EE_AUTH_SESSION_SECRET=""/.test(env), "production env template must not contain credentials");
  assert(!/scrypt\$/.test(env) && !/\b[A-Za-z0-9_-]{40,}\b/.test(env), "production env template must not contain real secrets");
  assert(selfHost.includes("sudo install -d -o ee-knowledge -g ee-knowledge /var/backups/ee-knowledge"), "SELF_HOST.md must create the backup directory with safe ownership");
  assert(!selfHost.includes("0777"), "SELF_HOST.md must not recommend 0777 permissions");
  for (const ambiguousCommand of ["sudo -u ee-knowledge npm run deploy:check", "sudo -u ee-knowledge npm run db\n", "sudo -u ee-knowledge npm run db:check"]) assert(!selfHost.includes(ambiguousCommand), "SELF_HOST.md must not run production checks without EnvironmentFile");
  assert(authDocs.includes("npm run auth:hash-password -- --dotenv"), "AUTH.md must document dotenv-safe local hash output");
  assert(authDocs.includes("production systemd EnvironmentFile") && authDocs.includes("raw"), "AUTH.md must document raw production hash output");
  assert(envExample.includes("auth:hash-password -- --dotenv"), ".env.example must mention dotenv-safe hash output");
  assert(hashScript.includes('process.argv.includes("--dotenv")') && hashScript.includes("formatPasswordHashForDotenv"), "password hash CLI must implement --dotenv output");
  for (const phrase of ["ARM64", "Orange Pi", "x86_64", "VPS", "scheduled backup", "db:backup"]) assert(selfHost.includes(phrase), `SELF_HOST.md is missing: ${phrase}`);
  console.log("Deployment verification passed (systemd, Caddy, production env, localhost binding, platform docs)");
}

try { main(); } catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }
