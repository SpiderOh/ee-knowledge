import { getAuthConfig } from "./config";

export const SESSION_COOKIE_NAME = "ee_session";
const SESSION_VERSION = "v1";

type SessionParts = { version: typeof SESSION_VERSION; issuedAt: number; expiresAt: number; signature: string };

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
    const binary = atob(padded);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

async function importSigningKey(secret: string, passwordHash: string) {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(`${secret}\n${passwordHash}`), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

function payloadFor(issuedAt: number, expiresAt: number) {
  return `${SESSION_VERSION}.${issuedAt}.${expiresAt}`;
}

function parseToken(token: string): SessionParts | null {
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== SESSION_VERSION || !/^\d+$/.test(parts[1]) || !/^\d+$/.test(parts[2]) || !/^[A-Za-z0-9_-]+$/.test(parts[3])) return null;
  const issuedAt = Number(parts[1]);
  const expiresAt = Number(parts[2]);
  if (!Number.isSafeInteger(issuedAt) || !Number.isSafeInteger(expiresAt) || expiresAt <= issuedAt) return null;
  return { version: SESSION_VERSION, issuedAt, expiresAt, signature: parts[3] };
}

export async function createSessionToken(now = Date.now()) {
  const result = getAuthConfig();
  if (!result.ok) throw new Error("Authentication is not configured.");
  const issuedAt = Math.floor(now / 1000);
  const expiresAt = issuedAt + result.config.sessionTtlDays * 24 * 60 * 60;
  const payload = payloadFor(issuedAt, expiresAt);
  const key = await importSigningKey(result.config.sessionSecret, result.config.passwordHash);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return `${payload}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

export async function verifySessionToken(token: string | undefined, now = Date.now()) {
  const result = getAuthConfig();
  if (!result.ok || !token) return false;
  const parsed = parseToken(token);
  if (!parsed) return false;
  const nowSeconds = Math.floor(now / 1000);
  if (parsed.issuedAt > nowSeconds + 60 || parsed.expiresAt <= nowSeconds) return false;
  const signature = base64UrlToBytes(parsed.signature);
  if (!signature) return false;
  try {
    const key = await importSigningKey(result.config.sessionSecret, result.config.passwordHash);
    return await crypto.subtle.verify("HMAC", key, signature, new TextEncoder().encode(payloadFor(parsed.issuedAt, parsed.expiresAt)));
  } catch {
    return false;
  }
}
