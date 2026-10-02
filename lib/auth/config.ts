export const DEFAULT_SESSION_TTL_DAYS = 30;
export const MIN_SESSION_SECRET_LENGTH = 32;

export type AuthEnvironment = Record<string, string | undefined>;

export type AuthConfig = {
  passwordHash: string;
  sessionSecret: string;
  sessionTtlDays: number;
};

export type AuthConfigResult =
  | { ok: true; config: AuthConfig }
  | { ok: false; reason: "missing-password-hash" | "invalid-password-hash" | "missing-session-secret" | "short-session-secret" | "invalid-ttl" };

const passwordHashPattern = /^scrypt\$\d+\$\d+\$\d+\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$/;

export function isValidPasswordHashFormat(value: string) {
  return passwordHashPattern.test(value);
}

export function getAuthConfig(env: AuthEnvironment = process.env): AuthConfigResult {
  const passwordHash = env.EE_AUTH_PASSWORD_HASH?.trim() ?? "";
  if (!passwordHash) return { ok: false, reason: "missing-password-hash" };
  if (!isValidPasswordHashFormat(passwordHash)) return { ok: false, reason: "invalid-password-hash" };

  const sessionSecret = env.EE_AUTH_SESSION_SECRET?.trim() ?? "";
  if (!sessionSecret) return { ok: false, reason: "missing-session-secret" };
  if (sessionSecret.length < MIN_SESSION_SECRET_LENGTH) return { ok: false, reason: "short-session-secret" };

  const rawTtl = env.EE_AUTH_SESSION_TTL_DAYS?.trim() || String(DEFAULT_SESSION_TTL_DAYS);
  const sessionTtlDays = Number(rawTtl);
  if (!Number.isInteger(sessionTtlDays) || sessionTtlDays < 1 || sessionTtlDays > 3650) return { ok: false, reason: "invalid-ttl" };

  return { ok: true, config: { passwordHash, sessionSecret, sessionTtlDays } };
}

export function authConfigErrorMessage(result: Extract<AuthConfigResult, { ok: false }>) {
  if (result.reason === "missing-password-hash" || result.reason === "missing-session-secret") return "Authentication 尚未配置。";
  return "Authentication 配置无效。";
}
