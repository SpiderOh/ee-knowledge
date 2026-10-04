import { readFileSync } from "node:fs";
import { join } from "node:path";
import manifest from "../app/manifest";

type ManifestIcon = { src?: string; sizes?: string; type?: string; purpose?: string };

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function checkPng(path: string) {
  const bytes = readFileSync(path);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  assert(bytes.subarray(0, 8).equals(signature), `${path} is not a valid PNG`);
  assert(bytes.length >= 24, `${path} is missing PNG dimensions`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

const config = manifest();
const icons = (config.icons ?? []) as ManifestIcon[];
assert(config.name, "manifest name is missing");
assert(config.short_name, "manifest short_name is missing");
assert(config.start_url === "/", "manifest start_url must be /");
assert(config.scope === "/", "manifest scope must be /");
assert(config.display === "standalone", "manifest display must be standalone");
assert(config.theme_color, "manifest theme_color is missing");
assert(icons.some((icon) => icon.sizes === "192x192"), "192x192 icon declaration is missing");
assert(icons.some((icon) => icon.sizes === "512x512"), "512x512 icon declaration is missing");
assert(icons.some((icon) => icon.purpose === "maskable"), "maskable icon declaration is missing");

for (const icon of icons) {
  assert(icon.src?.startsWith("/"), `icon must use a local path: ${icon.src}`);
  assert(!/^https?:\/\//i.test(icon.src ?? ""), `external icon URL is not allowed: ${icon.src}`);
  const file = join(process.cwd(), "public", icon.src!.slice(1));
  const dimensions = checkPng(file);
  assert(icon.sizes === `${dimensions.width}x${dimensions.height}`, `icon size mismatch: ${icon.src}`);
  assert(icon.type === "image/png", `icon MIME type must be image/png: ${icon.src}`);
}

const appShell = readFileSync(join(process.cwd(), "components", "layout", "AppShell.tsx"), "utf8");
const styles = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");
const mobileRoutes = ["/", "/courses", "/review", "/practice", "/wrong-answers", "/statistics", "/search", "/favorites", "/admin"];
assert(appShell.includes('className="mobile-nav"') && appShell.includes('aria-label="移动端导航"'), "mobile navigation landmark is missing");
for (const route of mobileRoutes) assert(appShell.includes(`href="${route}"`), `mobile navigation route is missing: ${route}`);
assert(/\.mobile-nav\s*\{[^}]*position:\s*fixed/.test(styles), "mobile navigation must be fixed");
assert(/\.mobile-nav\s*\{[^}]*overflow-x:\s*auto/.test(styles), "mobile navigation must scroll horizontally");
assert(styles.includes("env(safe-area-inset-top)") && styles.includes("env(safe-area-inset-bottom)"), "mobile safe-area contract is missing");
assert(styles.includes(".main, .knowledge-main { padding-bottom: calc(82px + env(safe-area-inset-bottom));"), "main content must reserve mobile navigation space");
assert(styles.includes(".mobile-nav a { min-height: 44px;"), "mobile navigation touch target contract is missing");
assert(styles.includes(".markdown-content pre, .knowledge-content pre") && styles.includes("overflow-x: auto"), "markdown code overflow contract is missing");
assert(styles.includes(".katex-display { max-width: 100%; overflow-x: auto;"), "KaTeX overflow contract is missing");
assert(styles.includes(".course-stat-scroll { overflow-x: auto; }"), "statistics table overflow contract is missing");
assert(styles.includes(".knowledge-nav { grid-template-columns: 1fr; display: grid;"), "knowledge navigation mobile collapse is missing");
assert(styles.includes(".admin-stat-grid, .admin-entry-grid { grid-template-columns: 1fr;"), "admin mobile grid collapse is missing");
assert(styles.includes(".form-grid { grid-template-columns: 1fr;"), "form mobile grid collapse is missing");
assert(styles.includes(".material-import-file { display: grid; gap: 4px;"), "material import mobile layout contract is missing");
console.log("Mobile static regression: PASS");

console.log("PWA verification passed", {
  name: config.name,
  display: config.display,
  startUrl: config.start_url,
  icons: icons.map((icon) => `${icon.src} ${icon.sizes}${icon.purpose ? ` (${icon.purpose})` : ""}`),
});
