import { createHash } from "node:crypto";

function portableId(prefix: string, slug: string, key: string) {
  const hash = createHash("sha256").update(`${slug}\0${key}`).digest("hex").slice(0, 24);
  return `import-${prefix}-${hash}`;
}

export function formulaIdForImport(slug: string, key: string) { return portableId("formula", slug, key); }
export function exampleIdForImport(slug: string, key: string) { return portableId("example", slug, key); }
