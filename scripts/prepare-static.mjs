// Copies what the site serves as-is into public/ before astro runs:
//  - the shared theme from @inixiative/config (never forked into this repo; the version in package.json decides it)
//  - the hand-written long-form pages (proposals/, moving-forward/), which keep their paths in git
//    so open chapter PRs apply without a rename.
import { cpSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const root = join(dirname(new URL(import.meta.url).pathname), "..");
const require = createRequire(join(root, "package.json"));
const themeDir = dirname(require.resolve("@inixiative/config/theme/public.css"));

const copies = [
  [themeDir, "public/theme"],
  ["proposals", "public/proposals"],
  ["moving-forward", "public/moving-forward"],
];

for (const [from, to] of copies) {
  const source = from.startsWith("/") ? from : join(root, from);
  const target = join(root, to);
  if (!existsSync(source)) throw new Error(`prepare-static: missing ${source}`);
  rmSync(target, { recursive: true, force: true });
  cpSync(source, target, { recursive: true });
}
console.log(`prepare-static: theme from ${themeDir}`);
