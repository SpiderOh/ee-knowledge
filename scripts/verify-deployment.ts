import fs from "node:fs";
import path from "node:path";
import { repoRoot } from "./lib/sqlite-path";

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
  const caddy = read("deploy/Caddyfile.example");
  const env = read("deploy/ee-knowledge.env.example");
  const selfHost = read("docs/SELF_HOST.md");
  const packageJson = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };

  assert(packageJson.scripts?.["start:prod"] === "next start -H 127.0.0.1 -p 3000", "start:prod must bind 127.0.0.1:3000");
  assert(packageJson.scripts?.["deploy:check"] === "tsx scripts/check-production-env.ts", "deploy:check script is missing");
  assert(packageJson.scripts?.["verify:deploy"] === "tsx scripts/verify-deployment.ts", "verify:deploy script is missing");
  assert(/User=ee-knowledge\r?\nGroup=ee-knowledge/.test(service), "systemd must use the non-root ee-knowledge user and group");
  assert(service.includes("WorkingDirectory=/opt/ee-knowledge"), "systemd WorkingDirectory is missing");
  assert(service.includes("EnvironmentFile=/etc/ee-knowledge/ee-knowledge.env"), "systemd EnvironmentFile is missing");
  assert(service.includes("ExecStartPre=/usr/bin/npm run deploy:check"), "systemd must validate production environment first");
  assert(service.includes("ExecStartPre=/usr/bin/npm run db"), "systemd must run migration deploy before start");
  assert(service.includes("ExecStartPre=/usr/bin/npm run db:check"), "systemd must run db:check before start");
  assert(/ExecStart=.*npm run start:prod/.test(service), "systemd must start the production server");
  assert(!service.includes("db:seed") && !service.includes("db:setup") && !service.includes("migrate reset"), "systemd must not seed, db:setup, or reset the database");
  assert(caddy.includes("reverse_proxy 127.0.0.1:3000"), "Caddy must reverse proxy to localhost:3000");
  assert(env.includes('NODE_ENV="production"'), "production env template must set NODE_ENV");
  assert(env.includes('DATABASE_URL="file:/var/lib/ee-knowledge/ee-knowledge.db"'), "production env must use absolute server SQLite path");
  assert(/EE_AUTH_PASSWORD_HASH=""/.test(env) && /EE_AUTH_SESSION_SECRET=""/.test(env), "production env template must not contain credentials");
  assert(!/scrypt\$/.test(env) && !/\b[A-Za-z0-9_-]{40,}\b/.test(env), "production env template must not contain real secrets");
  for (const phrase of ["ARM64", "Orange Pi", "x86_64", "VPS", "scheduled backup", "db:backup"]) assert(selfHost.includes(phrase), `SELF_HOST.md is missing: ${phrase}`);
  console.log("Deployment verification passed (systemd, Caddy, production env, localhost binding, platform docs)");
}

try { main(); } catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }
