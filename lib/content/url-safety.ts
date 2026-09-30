const INTERNAL_BASE_URL = "https://ee-knowledge.invalid";

function parseUrl(value: string) {
  try {
    return new URL(value, INTERNAL_BASE_URL);
  } catch {
    return null;
  }
}

export function isSafeContentLink(url: string) {
  const value = url.trim();
  if (!value || value.startsWith("//")) return false;

  const parsed = parseUrl(value);
  if (!parsed) return false;

  // Relative links resolve against the internal origin and remain in-app.
  if (parsed.origin === INTERNAL_BASE_URL) return true;
  return parsed.protocol === "http:" || parsed.protocol === "https:";
}

export function isExternalContentLink(url: string) {
  return /^https?:\/\/\S+$/i.test(url.trim());
}

export function isSafeImageSource(url: string) {
  const value = url.trim();
  if (!value || value.startsWith("//")) return false;

  if (value.startsWith("/")) return true;
  if (!/^https?:\/\//i.test(value)) return false;

  const parsed = parseUrl(value);
  if (!parsed) return false;
  if (parsed.origin === INTERNAL_BASE_URL) return true;
  if (parsed.protocol === "https:") return true;
  return parsed.protocol === "http:" && process.env.NODE_ENV !== "production";
}
