import { hashPassword } from "@/lib/auth/password";
import { StringDecoder } from "node:string_decoder";

async function readAllStdin() {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

async function readNonTtyPair() {
  const lines = (await readAllStdin()).split(/\r?\n/);
  while (lines.at(-1) === "") lines.pop();
  if (lines.length !== 2) throw new Error("Non-interactive mode requires password and confirmation on two input lines.");
  return lines as [string, string];
}

async function readHidden(prompt: string) {
  process.stderr.write(prompt);
  return new Promise<string>((resolve, reject) => {
    let value = "";
    const decoder = new StringDecoder("utf8");
    const onData = (chunk: Buffer) => {
      for (const char of decoder.write(chunk)) {
        if (char === "\u0003") { cleanup(); reject(new Error("Cancelled.")); return; }
        if (char === "\r" || char === "\n") { cleanup(); process.stderr.write("\n"); resolve(value); return; }
        if (char === "\u007f" || char === "\b") { value = Array.from(value).slice(0, -1).join(""); continue; }
        if (char >= " ") value += char;
      }
    };
    const cleanup = () => { decoder.end(); process.stdin.off("data", onData); process.stdin.setRawMode?.(false); process.stdin.pause(); };
    process.stdin.setRawMode(true); process.stdin.resume(); process.stdin.on("data", onData);
  });
}

async function main() {
  const [password, confirmation] = !process.stdin.isTTY || typeof process.stdin.setRawMode !== "function" ? await readNonTtyPair() : [await readHidden("Password (12-128 characters): "), await readHidden("Confirm password: ")];
  if (password !== confirmation) throw new Error("Passwords do not match.");
  process.stdout.write(`${await hashPassword(password)}\n`);
}

main().catch((error) => { process.stderr.write(`${error instanceof Error ? error.message : "Unable to generate password hash."}\n`); process.exitCode = 1; });
