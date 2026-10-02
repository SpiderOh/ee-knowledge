import { getSafeNextPath } from "./path-policy";

export function getLoginRedirectPath(next: string | null | undefined, error?: "invalid" | "config") {
  const safeNext = getSafeNextPath(next);
  const params = new URLSearchParams();
  if (error) params.set("error", error);
  if (safeNext !== "/") params.set("next", safeNext);
  const query = params.toString();
  return `/login${query ? `?${query}` : ""}`;
}

export function getSuccessRedirectPath(next: string | null | undefined) {
  return getSafeNextPath(next);
}
