import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;
const DEFAULT_N = 16_384;
const DEFAULT_R = 8;
const DEFAULT_P = 1;
const MAX_PASSWORD_LENGTH = 128;

type ParsedPasswordHash = { n: number; r: number; p: number; salt: Buffer; key: Buffer };

const base64urlPattern = /^[A-Za-z0-9_-]+$/;

function deriveKey(password: string, salt: Buffer, options: { N: number; r: number; p: number; maxmem: number }) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, KEY_LENGTH, options, (error, derived) => {
      if (error) reject(error); else resolve(derived as Buffer);
    });
  });
}

function decodeBase64Url(value: string) {
  if (!base64urlPattern.test(value)) return null;
  try {
    return Buffer.from(value, "base64url");
  } catch {
    return null;
  }
}

export function parsePasswordHash(encoded: string): ParsedPasswordHash | null {
  const parts = encoded.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return null;
  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p) || n < 1024 || n > 1_048_576 || (n & (n - 1)) !== 0 || r < 1 || r > 32 || p < 1 || p > 16) return null;
  const salt = decodeBase64Url(parts[4]);
  const key = decodeBase64Url(parts[5]);
  if (!salt || salt.length < 16 || !key || key.length !== KEY_LENGTH) return null;
  return { n, r, p, salt, key };
}

export async function hashPassword(password: string) {
  if (password.length < 12 || password.length > MAX_PASSWORD_LENGTH) throw new Error("Password length must be between 12 and 128 characters.");
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt, { N: DEFAULT_N, r: DEFAULT_R, p: DEFAULT_P, maxmem: 32 * 1024 * 1024 });
  return `scrypt$${DEFAULT_N}$${DEFAULT_R}$${DEFAULT_P}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(password: string, encoded: string) {
  if (password.length < 1 || password.length > MAX_PASSWORD_LENGTH) return false;
  const parsed = parsePasswordHash(encoded);
  if (!parsed) return false;
  try {
    const derived = await deriveKey(password, parsed.salt, { N: parsed.n, r: parsed.r, p: parsed.p, maxmem: 64 * 1024 * 1024 });
    return derived.length === parsed.key.length && timingSafeEqual(derived, parsed.key);
  } catch {
    return false;
  }
}

export const AUTH_PASSWORD_MAX_LENGTH = MAX_PASSWORD_LENGTH;
