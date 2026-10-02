import { NextRequest, NextResponse } from "next/server";
import { getSafeNextPath, isPublicPath } from "@/lib/auth/path-policy";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

export async function middleware(request: NextRequest) {
  if (isPublicPath(request.nextUrl.pathname, request.method)) return NextResponse.next();

  const authenticated = await verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (authenticated) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith("/api/")) return NextResponse.json({ error: "未登录。" }, { status: 401 });

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", getSafeNextPath(`${request.nextUrl.pathname}${request.nextUrl.search}`));
  return NextResponse.redirect(loginUrl);
}

export const config = { matcher: ["/:path*"] };
