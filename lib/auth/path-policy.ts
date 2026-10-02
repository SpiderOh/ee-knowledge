const publicPrefixes = ["/_next/", "/icons/"];

export function isPublicPath(pathname: string, method = "GET") {
  if (pathname === "/login" || pathname === "/manifest.webmanifest" || pathname === "/favicon.ico") return true;
  if (pathname === "/api/auth/login" || pathname === "/api/auth/logout") return method === "POST";
  return publicPrefixes.some((prefix) => pathname.startsWith(prefix));
}

export function getSafeNextPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\") || value.includes("\\") || /^[a-z][a-z\d+.-]*:/i.test(value)) return "/";
  return value;
}
