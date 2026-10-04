export const NODE_RUNTIME_REQUIREMENT = "Node >= 20.16.0 or >= 22.3.0";

export function isSupportedNodeVersion(version: string) {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version.trim());
  if (!match) return false;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  if (major === 20) return minor >= 16;
  return major >= 22 && (major > 22 || minor >= 3);
}
