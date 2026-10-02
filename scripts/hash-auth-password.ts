import { hashPassword } from "@/lib/auth/password";

async function readHidden(prompt: string) {
  process.stderr.write(prompt);
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    process.stderr.write("\n");
    return Buffer.concat(chunks).toString().trimEnd();
  }
  return new Promise<string>((resolve, reject) => {
    let value = "";
    const onData = (chunk: Buffer) => {
      for (const byte of chunk) {
        if (byte === 3) { cleanup(); reject(new Error("Cancelled.")); return; }
        if (byte === 13 || byte === 10) { cleanup(); process.stderr.write("\n"); resolve(value); return; }
        if (byte === 127 || byte === 8) { value = value.slice(0, -1); continue; }
        if (byte >= 32) value += String.fromCharCode(byte);
      }
    };
    const cleanup = () => { process.stdin.off("data", onData); process.stdin.setRawMode?.(false); process.stdin.pause(); };
    process.stdin.setRawMode(true); process.stdin.resume(); process.stdin.on("data", onData);
  });
}

async function main() {
  const password = await readHidden("Password (12-128 characters): ");
  const confirmation = await readHidden("Confirm password: ");
  if (password !== confirmation) throw new Error("Passwords do not match.");
  process.stdout.write(`${await hashPassword(password)}\n`);
}

main().catch((error) => { process.stderr.write(`${error instanceof Error ? error.message : "Unable to generate password hash."}\n`); process.exitCode = 1; });
