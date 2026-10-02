import { runNpmScript } from "./lib/run-command";

function main() {
  for (const step of ["verify:pwa", "verify:auth", "verify:deploy", "verify:backup", "verify:mvp", "typecheck", "lint", "build"]) {
    console.log(`\n[release:check] ${step}`);
    const result = runNpmScript(step);
    if (result.error || result.status !== 0) {
      console.error(`${step} 失败。`);
      process.exitCode = 1;
      return;
    }
  }
  console.log("\nRelease check passed");
}

main();
