// Renders a scene to an SVG string. The site inlines it (StackMap.astro) and scripts/export-map.ts writes it to
// files; both get the same markup, styled by src/styles/stack-map.css.
import type { Prim, Scene, SceneEdge, SceneNode } from "./scene";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const crest = (x: number, y: number, size: number, c: string) =>
  `<svg class="${c}" x="${x}" y="${y}" width="${size}" height="${(size * 32) / 28}" viewBox="0 0 28 32" fill="none" aria-hidden="true">` +
  `<path d="M3 4v15l11 9 11-9V4h-5v6h-4V2h-4v8H8V4Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>` +
  `<path d="M10 22V15h8v7" stroke="currentColor" stroke-width="1.8"/></svg>`;

const prim = (p: Prim): string => {
  switch (p.t) {
    case "poly":
      return `<polygon class="${p.c}" points="${p.pts.map((q) => q.join(",")).join(" ")}"/>`;
    case "path":
      return `<path class="${p.c}" d="${p.d}"/>`;
    case "rect":
      return `<rect class="${p.c}" x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="${p.r ?? 0}"/>`;
    case "text":
      return `<text class="${p.c}" x="${p.x}" y="${p.y}"${p.a && p.a !== "start" ? ` text-anchor="${p.a}"` : ""}>${esc(p.s)}</text>`;
    case "crest":
      return crest(p.x, p.y, p.size, p.c);
    case "glyph":
      return `<path class="${p.c}" transform="matrix(${p.m.map((v) => +v.toFixed(3)).join(" ")})" d="${p.d}"/>`;
  }
};

const edgeClass = (e: SceneEdge) =>
  [
    "edge",
    `kind-${e.kind}`,
    e.signet ? "is-signet" : "",
    e.next ? "is-next" : "",
    e.structural ? "is-structural" : "",
    e.cross ? "is-cross" : "",
    e.d ? "" : "is-unseen",
  ]
    .filter(Boolean)
    .join(" ");

let order = 0;
const edge = (e: SceneEdge) => {
  order += 1;
  const data = `data-base="${e.base}" data-user="${e.user}" data-kind="${e.kind}" style="--i:${order}"`;
  if (!e.d) return `<path class="${edgeClass(e)}" ${data}/>`;
  const solid = !e.next && !e.structural;
  const path = `<path class="${edgeClass(e)}" ${data} d="${e.d}"${solid ? ' pathLength="1"' : ""}><title>${esc(e.why)}</title></path>`;
  // A Signet relation carries a slow light along it.
  return e.signet && solid ? `${path}<path class="pulse" d="${e.d}" pathLength="1" aria-hidden="true"/>` : path;
};

const node = (n: SceneNode) => {
  order += 1;
  const attrs = `class="node ${n.look}" data-id="${n.id}" data-tier="${n.tier}" aria-label="${esc(n.aria)}" style="--i:${order}"`;
  const body = n.prims.map(prim).join("");
  return n.href ? `<a ${attrs} href="${n.href}">${body}</a>` : `<g ${attrs} tabindex="0" role="img">${body}</g>`;
};

export const renderSvg = (scene: Scene, opts: { id: string; style?: string; className?: string }) => {
  order = 0;
  const [x, y, w, h] = scene.box;
  const layers = scene.layers
    .map((l) => {
      const inner = l.items
        .map((it) => ("node" in it ? node(it.node) : "edge" in it ? edge(it.edge) : prim(it)))
        .join("");
      return `<g class="layer ${l.c ?? ""}"${l.tier ? ` data-tier="${l.tier}"` : ""}>${inner}</g>`;
    })
    .join("");
  const titleId = `${opts.id}-title`;
  const descId = `${opts.id}-desc`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" class="map-svg ${opts.className ?? ""}" viewBox="${x} ${y} ${w} ${h}" ` +
    `width="${w}" height="${h}" role="group" aria-labelledby="${titleId}" aria-describedby="${descId}">` +
    `<title id="${titleId}">${esc(scene.title)}</title><desc id="${descId}">${esc(scene.desc)}</desc>` +
    (opts.style ? `<style>${opts.style}</style>` : "") +
    layers +
    `</svg>`
  );
};
