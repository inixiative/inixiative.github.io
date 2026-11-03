// Writes a map view as standalone SVG files, dark and light, for places that can't run the site (GitHub
// renders VOCABULARY.md's diagram from them). Same scene and styles as the site; tokens are copied in from
// the theme so the file needs nothing else.
// usage: bun scripts/export-map.ts <view> <out-dir> [name]   e.g. bun scripts/export-map.ts vocabulary ../.github/brand vocabulary-map
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { renderSvg } from "../src/map/render";
import { sceneFor, type View } from "../src/map/views";

const [view = "vocabulary", outDir = ".", name = `${view}-map`] = process.argv.slice(2);
const root = join(dirname(new URL(import.meta.url).pathname), "..");
const require = createRequire(join(root, "package.json"));
const themeDir = dirname(require.resolve("@inixiative/config/theme/public.css"));
const read = (f: string) => readFileSync(join(themeDir, f), "utf8");

// The custom properties of one block (":root {" or ".dark {") in a theme file.
const block = (css: string, selector: string) => {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`export-map: no ${selector} block`);
  const body = css.slice(start, css.indexOf("\n}", start));
  return [...body.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)].map((m) => `${m[1]}: ${m[2]};`).join("");
};
const fonts = "--font-display: system-ui, sans-serif; --font-body: system-ui, sans-serif; --duration-base: 0ms; --ease-standard: linear;";
const mapCss = readFileSync(join(root, "src/styles/stack-map.css"), "utf8");

for (const mode of ["dark", "light"] as const) {
  const sel = mode === "dark" ? ".dark" : ":root";
  const tokens = block(read("public.css"), sel) + block(read("domains.css"), sel) + fonts;
  const scene = sceneFor(view as View);
  const [x, y, w, h] = scene.box;
  const pad = 24;
  const inner = renderSvg(scene, { id: `${name}-${mode}` });
  const bg = mode === "dark" ? "hsl(var(--background))" : "hsl(var(--background))";
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" class="stack-map view-${view}${mode === "dark" ? " dark" : ""}" ` +
    `viewBox="${x - pad} ${y - pad} ${w + pad * 2} ${h + pad * 2}" width="${w + pad * 2}" height="${h + pad * 2}" ` +
    `role="img" aria-labelledby="${name}-${mode}-title" aria-describedby="${name}-${mode}-desc">` +
    `<style>.stack-map{${tokens}}${mapCss}</style>` +
    `<rect x="${x - pad}" y="${y - pad}" width="${w + pad * 2}" height="${h + pad * 2}" rx="16" style="fill:${bg}"/>` +
    inner.replace(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" /, `<svg x="${x}" y="${y}" `) +
    `</svg>\n`;
  const file = join(outDir, `${name}${mode === "light" ? "-light" : ""}.svg`);
  writeFileSync(file, svg);
  console.log(`export-map: ${file}`);
}
