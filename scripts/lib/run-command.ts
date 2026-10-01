import { spawnSync } from "node:child_process";
import { repoRoot } from "./sqlite-path";

export function npmExecutable() { return process.platform === "win32" ? "npm.cmd" : "npm"; }

export function runNpmScript(script: string, env: NodeJS.ProcessEnv = process.env) {
  if (process.platform === "win32") return spawnSync("cmd.exe", ["/d", "/s", "/c", `${npmExecutable()} run ${script}`], { cwd: repoRoot, env, stdio: "inherit" });
  return spawnSync(npmExecutable(), ["run", script], { cwd: repoRoot, env, stdio: "inherit" });
}
