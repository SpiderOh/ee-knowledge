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

console.log("PWA verification passed", {
  name: config.name,
  display: config.display,
  startUrl: config.start_url,
  icons: icons.map((icon) => `${icon.src} ${icon.sizes}${icon.purpose ? ` (${icon.purpose})` : ""}`),
});
