import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { hashPassword } from "../lib/auth/password";
import { repoRoot } from "./lib/sqlite-path";

const testPassword = "runtime-regression-password";
const requestTimeoutMs = 5_000;

function npmExecutable() { return process.platform === "win32" ? "npm.cmd" : "npm"; }

function runNpm(script: string, env: NodeJS.ProcessEnv) {
  return new Promise<void>((resolve, reject) => {
    const child = process.platform === "win32"
      ? spawn("cmd.exe", ["/d", "/s", "/c", `${npmExecutable()} run ${script}`], { cwd: repoRoot, env, stdio: "inherit" })
      : spawn(npmExecutable(), ["run", script], { cwd: repoRoot, env, stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error(`${script} exited with ${code ?? "unknown"}`)));
  });
}

function freePort() {
  return new Promise<number>((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") { server.close(); reject(new Error("Could not allocate a local port.")); return; }
      server.close((error) => error ? reject(error) : resolve(address.port));
    });
  });
}

async function request(url: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), requestTimeoutMs);
  try { return await fetch(url, { ...init, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function location(response: Response) { return response.headers.get("location") ?? ""; }

function cookieFrom(response: Response) {
  const setCookie = response.headers.get("set-cookie") ?? "";
  assert(/ee_session=[^;]+/.test(setCookie), "Login did not set ee_session cookie.");
  assert(/httponly/i.test(setCookie), "Session cookie is not HttpOnly.");
  assert(/samesite=lax/i.test(setCookie), "Session cookie is not SameSite=Lax.");
  assert(/path=\//i.test(setCookie), "Session cookie is not scoped to /.");
  assert(/secure/i.test(setCookie), "Production session cookie is not Secure.");
  return setCookie.match(/(ee_session=[^;]+)/i)?.[1] ?? "";
}

async function waitForServer(baseUrl: string, child: ChildProcess, output: string[]) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Production server exited before readiness.\n${output.join("").slice(-4000)}`);
    try { const response = await request(`${baseUrl}/login`); if (response.status === 200) return; } catch { /* keep polling */ }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`Production server did not become ready.\n${output.join("").slice(-4000)}`);
}

async function stopServer(child: ChildProcess) {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      if (process.platform === "win32" && child.pid) spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
      resolve();
    }, 5_000);
    child.once("close", () => { clearTimeout(timer); resolve(); });
  });
}

async function main() {
  if (!fs.existsSync(path.join(repoRoot, ".next"))) throw new Error("Production build is required before verify:runtime.");

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ee-knowledge-runtime-"));
  const databasePath = path.join(tempDir, "runtime.db");
  fs.writeFileSync(databasePath, "");
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    DATABASE_URL: `file:${databasePath.replaceAll("\\", "/")}`,
    NODE_ENV: "production",
    EE_AUTH_PASSWORD_HASH: await hashPassword(testPassword),
    EE_AUTH_SESSION_SECRET: randomBytes(32).toString("base64url"),
    EE_AUTH_SESSION_TTL_DAYS: "30",
  };
  let child: ChildProcess | undefined;
  const output: string[] = [];
  try {
    console.log("[verify:runtime] applying migrations to disposable SQLite");
    await runNpm("db", env);
    const port = await freePort();
    const nextBin = path.join(repoRoot, "node_modules", "next", "dist", "bin", "next");
    child = spawn(process.execPath, [nextBin, "start", "-H", "127.0.0.1", "-p", String(port)], { cwd: repoRoot, env, stdio: ["ignore", "pipe", "pipe"] });
    child.stdout?.on("data", (chunk) => output.push(String(chunk)));
    child.stderr?.on("data", (chunk) => output.push(String(chunk)));
    const baseUrl = `http://127.0.0.1:${port}`;
    await waitForServer(baseUrl, child, output);
    console.log("[verify:runtime] public routes");
    const loginPage = await request(`${baseUrl}/login`, { redirect: "manual" });
    assert(loginPage.status === 200, `/login returned ${loginPage.status}.`);
    const manifest = await request(`${baseUrl}/manifest.webmanifest`, { redirect: "manual" });
    assert(manifest.status === 200 && (manifest.headers.get("content-type") ?? "").includes("manifest"), "Manifest is not publicly readable.");
    const icon = await request(`${baseUrl}/icons/ee-192.png`, { redirect: "manual" });
    assert(icon.status === 200 && (icon.headers.get("content-type") ?? "").includes("image/png"), "PWA icon is not publicly readable.");
    console.log("[verify:runtime] private routes and API");
    const home = await request(`${baseUrl}/`, { redirect: "manual" });
    assert(home.status >= 300 && home.status < 400 && decodeURIComponent(location(home)).includes("/login") && decodeURIComponent(location(home)).includes("next=/"), "Unauthenticated home did not redirect safely.");
    const admin = await request(`${baseUrl}/admin`, { redirect: "manual" });
    assert(admin.status >= 300 && admin.status < 400 && decodeURIComponent(location(admin)).includes("next=/admin"), "Unauthenticated admin did not preserve next path.");
    const materialImportUnauthenticated = await request(`${baseUrl}/admin/material-import`, { redirect: "manual" });
    assert(
      materialImportUnauthenticated.status >= 300 &&
      materialImportUnauthenticated.status < 400 &&
      decodeURIComponent(location(materialImportUnauthenticated)).includes("next=/admin/material-import"),
      "Unauthenticated material import did not preserve next path.",
    );
    const exportUnauthenticated = await request(`${baseUrl}/api/admin/content-export`);
    assert(exportUnauthenticated.status === 401 && (exportUnauthenticated.headers.get("content-type") ?? "").includes("application/json"), "Unauthenticated admin API did not return JSON 401.");
    console.log("[verify:runtime] login, authenticated page/API, unsafe next, logout");
    const login = await request(`${baseUrl}/api/auth/login`, { method: "POST", redirect: "manual", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ password: testPassword, next: "/" }) });
    assert(login.status === 303 && location(login).endsWith("/"), "Valid login did not redirect to home.");
    const cookie = cookieFrom(login);
    const authenticatedHome = await request(`${baseUrl}/`, { headers: { cookie } });
    assert(authenticatedHome.status === 200, "Authenticated home was not readable.");
    const authenticatedAdmin = await request(`${baseUrl}/admin`, { headers: { cookie } });
    assert(authenticatedAdmin.status === 200, "Authenticated admin page was not readable.");
    const authenticatedMaterialImport = await request(`${baseUrl}/admin/material-import`, { headers: { cookie } });
    assert(authenticatedMaterialImport.status === 200, "Authenticated material import page was not readable.");
    const authenticatedExport = await request(`${baseUrl}/api/admin/content-export`, { headers: { cookie } });
    assert(authenticatedExport.status !== 401 && authenticatedExport.status < 500, "Authenticated admin API remained unauthorized.");
    const unsafeNext = await request(`${baseUrl}/api/auth/login`, { method: "POST", redirect: "manual", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ password: testPassword, next: "https://evil.example" }) });
    assert(unsafeNext.status === 303 && !location(unsafeNext).includes("evil.example") && decodeURIComponent(location(unsafeNext)).endsWith("/"), "Unsafe next was not constrained to the local site.");
    const logout = await request(`${baseUrl}/api/auth/logout`, { method: "POST", redirect: "manual", headers: { cookie } });
    assert(logout.status === 303 && location(logout).endsWith("/login"), "Logout did not redirect to login.");
    assert(/ee_session=/.test(logout.headers.get("set-cookie") ?? "") && /max-age=0/i.test(logout.headers.get("set-cookie") ?? ""), "Logout did not clear the session cookie.");
    const afterLogout = await request(`${baseUrl}/`, { redirect: "manual" });
    assert(afterLogout.status >= 300 && afterLogout.status < 400 && decodeURIComponent(location(afterLogout)).includes("/login"), "Logout did not invalidate the session.");
    console.log("Runtime verification passed");
  } finally {
    if (child) await stopServer(child);
    if (process.env.KEEP_VERIFY_DB !== "1") fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => { console.error(`[verify:runtime] ${error instanceof Error ? error.message : String(error)}`); process.exitCode = 1; });
