// Checks the built site before it deploys:
//  - every internal link and #anchor resolves to a file and an id in dist/
//  - the old /#<repo> anchors the root script redirects all land on a real id
//  - nothing claims a path another Pages site serves under this domain (/rules-builder/)
//  - CNAME ships, and no page links the GitHub-dark Google Fonts the theme replaced
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";

const dist = join(dirname(new URL(import.meta.url).pathname), "..", "dist");
const errors = [];

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
const files = walk(dist);
const pages = files.filter((f) => f.endsWith(".html"));

const resolve = (path) => {
  const clean = decodeURIComponent(path.split("?")[0]);
  const candidates = [join(dist, clean), join(dist, clean, "index.html"), join(dist, `${clean}.html`)];
  return candidates.find((c) => existsSync(c) && statSync(c).isFile());
};
const idsIn = (file) => new Set([...readFileSync(file, "utf8").matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));

// Served by inixiative/rules-builder's own Pages under www.inixiative.com.
const externalPaths = ["/rules-builder/"];

for (const page of pages) {
  const html = readFileSync(page, "utf8");
  for (const [, raw] of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    if (/^(?:[a-z]+:|\/\/)/i.test(raw)) continue;
    // Template literals inside an inline script (the Foundry demo) are not links yet.
    if (raw.includes("${")) continue;
    // Relative links resolve against the page's own URL.
    const href = raw.startsWith("/") || raw.startsWith("#") ? raw : new URL(raw, `https://x${page.replace(dist, "")}`).pathname;
    if (externalPaths.some((p) => href.startsWith(p))) continue;
    const [path, hash] = href.split("#");
    const target = path === "" ? page : resolve(path);
    if (!target) {
      errors.push(`${page.replace(dist, "")}: broken link ${href}`);
      continue;
    }
    if (hash && target.endsWith(".html") && !idsIn(target).has(hash)) {
      errors.push(`${page.replace(dist, "")}: missing anchor ${href}`);
    }
  }
  if (html.includes("fonts.googleapis.com")) errors.push(`${page.replace(dist, "")}: loads Google Fonts`);
}

// The root redirect map: every target must exist.
const root = readFileSync(join(dist, "index.html"), "utf8");
const lists = Object.fromEntries(
  [...root.matchAll(/var (blocks|agentic) = \[([^\]]+)\]/g)].map((m) => [m[1], [...m[2].matchAll(/"([^"]+)"/g)].map((x) => x[1])]),
);
for (const [list, page] of [["blocks", "building-blocks"], ["agentic", "agentic"]]) {
  const ids = idsIn(join(dist, page, "index.html"));
  for (const id of lists[list] ?? []) if (!ids.has(id)) errors.push(`/#${id} redirects to /${page}/#${id}, which has no such id`);
}
if (!lists.blocks || !lists.agentic) errors.push("root anchor redirect script not found");

for (const path of externalPaths) if (existsSync(join(dist, path))) errors.push(`dist must not contain ${path}`);
if (!existsSync(join(dist, "CNAME"))) errors.push("CNAME missing from dist");

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`check-dist: ${pages.length} pages, links, anchors and hazards OK`);
