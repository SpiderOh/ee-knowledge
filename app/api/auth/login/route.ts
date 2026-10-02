import { NextRequest, NextResponse } from "next/server";
import { authConfigErrorMessage, getAuthConfig } from "@/lib/auth/config";
import { AUTH_PASSWORD_MAX_LENGTH, verifyPassword } from "@/lib/auth/password";
import { getSafeNextPath } from "@/lib/auth/path-policy";
import { getLoginRedirectPath, getSuccessRedirectPath } from "@/lib/auth/redirect";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";

function loginRedirect(request: NextRequest, next: string, error?: "invalid" | "config") {
  return NextResponse.redirect(new URL(getLoginRedirectPath(next, error), request.url), 303);
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const password = typeof form.get("password") === "string" ? String(form.get("password")) : "";
  const next = getSafeNextPath(typeof form.get("next") === "string" ? String(form.get("next")) : "/");
  const config = getAuthConfig();
  if (!config.ok) {
    console.error(`Authentication configuration error: ${authConfigErrorMessage(config)}`);
    return loginRedirect(request, next, "config");
  }
  if (password.length < 12 || password.length > AUTH_PASSWORD_MAX_LENGTH || !await verifyPassword(password, config.config.passwordHash)) return loginRedirect(request, next, "invalid");

  const token = await createSessionToken();
  const response = NextResponse.redirect(new URL(getSuccessRedirectPath(next), request.url), 303);
  response.cookies.set({ name: SESSION_COOKIE_NAME, value: token, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: config.config.sessionTtlDays * 24 * 60 * 60 });
  return response;
}
