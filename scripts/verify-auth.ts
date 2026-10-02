import { formatPasswordHashForDotenv, hashPassword, verifyPassword } from "@/lib/auth/password";
import { getSafeNextPath, isPublicPath } from "@/lib/auth/path-policy";
import { getLoginRedirectPath, getSuccessRedirectPath } from "@/lib/auth/redirect";
import { createSessionToken, verifySessionToken } from "@/lib/auth/session";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const original = { passwordHash: process.env.EE_AUTH_PASSWORD_HASH, secret: process.env.EE_AUTH_SESSION_SECRET, ttl: process.env.EE_AUTH_SESSION_TTL_DAYS };
  const password = "correct horse battery staple";
  const changedPassword = "another correct password value";
  const testSecret = "t".repeat(48);
  const differentSecret = "d".repeat(48);
  const hash = await hashPassword(password);
  const changedHash = await hashPassword(changedPassword);
  process.env.EE_AUTH_PASSWORD_HASH = hash;
  process.env.EE_AUTH_SESSION_SECRET = testSecret;
  process.env.EE_AUTH_SESSION_TTL_DAYS = "30";
  try {
    assert(await verifyPassword(password, hash), "correct password should verify");
    const dotenvHash = formatPasswordHashForDotenv(hash);
    assert(dotenvHash !== hash && dotenvHash.replaceAll("\\$", "$") === hash, "dotenv password hash escaping should be reversible");
    const unicodePassword = "学习电子信息-安全密码2026";
    const unicodeHash = await hashPassword(unicodePassword);
    assert(await verifyPassword(unicodePassword, unicodeHash), "Unicode password should round-trip");
    assert(!(await verifyPassword("wrong password", hash)), "wrong password should fail");
    assert(!(await verifyPassword(password, "invalid")), "invalid hash should fail closed");

    const now = Date.UTC(2026, 9, 2);
    const token = await createSessionToken(now);
    assert(await verifySessionToken(token, now + 60_000), "valid session should verify");
    const tamperedToken = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;
    assert(!(await verifySessionToken(tamperedToken, now + 60_000)), "tampered session should fail");
    assert(!(await verifySessionToken(token, now + 31 * 24 * 60 * 60 * 1000)), "expired session should fail");
    process.env.EE_AUTH_SESSION_SECRET = differentSecret;
    assert(!(await verifySessionToken(token, now + 60_000)), "wrong secret should fail");
    process.env.EE_AUTH_SESSION_SECRET = testSecret;
    process.env.EE_AUTH_PASSWORD_HASH = changedHash;
    assert(!(await verifySessionToken(token, now + 60_000)), "password hash change should invalidate sessions");
    process.env.EE_AUTH_PASSWORD_HASH = hash;
    process.env.EE_AUTH_SESSION_SECRET = testSecret;
    assert(getSafeNextPath("/knowledge/foo?q=1") === "/knowledge/foo?q=1", "safe relative next should be accepted");
    assert(getSuccessRedirectPath("/") === "/", "successful root next should redirect home");
    assert(getSuccessRedirectPath("/knowledge/foo") === "/knowledge/foo", "successful safe next should redirect to target");
    assert(getLoginRedirectPath("/knowledge/foo", "invalid") === "/login?error=invalid&next=%2Fknowledge%2Ffoo", "failed login should return to login with error");
    for (const unsafe of ["https://evil.example", "//evil.example", "\\\\evil.example", "javascript:alert(1)"]) assert(getSafeNextPath(unsafe) === "/", `unsafe next should be rejected: ${unsafe}`);
    assert(getSuccessRedirectPath("https://evil.example") === "/", "unsafe success next should redirect home");
    assert(isPublicPath("/login"), "/login should be public");
    assert(isPublicPath("/api/auth/login", "POST"), "login API should be public");
    assert(!isPublicPath("/api/auth/login", "GET"), "login API GET should not be public");
    assert(isPublicPath("/manifest.webmanifest"), "manifest should be public");
    assert(isPublicPath("/icons/ee-192.png"), "icons should be public");
    assert(isPublicPath("/_next/static/chunk.js"), "Next assets should be public");
    for (const protectedPath of ["/", "/admin", "/api/admin/content-export", "/review", "/practice"]) assert(!isPublicPath(protectedPath), `${protectedPath} should be protected`);
    process.env.EE_AUTH_PASSWORD_HASH = "";
    assert(!(await verifySessionToken(token, now + 60_000)), "missing configuration should fail closed");
    console.log("Auth verification passed (scrypt, signed sessions, expiry, tamper/password invalidation, path policy)");
  } finally {
    if (original.passwordHash === undefined) delete process.env.EE_AUTH_PASSWORD_HASH; else process.env.EE_AUTH_PASSWORD_HASH = original.passwordHash;
    if (original.secret === undefined) delete process.env.EE_AUTH_SESSION_SECRET; else process.env.EE_AUTH_SESSION_SECRET = original.secret;
    if (original.ttl === undefined) delete process.env.EE_AUTH_SESSION_TTL_DAYS; else process.env.EE_AUTH_SESSION_TTL_DAYS = original.ttl;
  }
}

main().catch((error) => { console.error(error instanceof Error ? error.message : "Auth verification failed."); process.exitCode = 1; });
