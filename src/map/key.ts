// The map's key: each visual channel carries one thing. Colour says which part, fill says status, lines say relation.
// Swatches are drawn with the map's own classes, so they look exactly like the map.
import type { View } from "./views";
export type Swatch = { label: string; kind: "block" | "line"; cls: string };
const part = {
  bb: { label: "Building blocks", kind: "block", cls: "tone-amber" },
  dx: { label: "Developer experience", kind: "block", cls: "tone-teal" },
  ag: { label: "Agentic", kind: "block", cls: "tone-lime" },
  out: { label: "Outside your machine", kind: "block", cls: "tone-blue" },
  gov: { label: "Governance", kind: "block", cls: "tone-violet" },
  closed: { label: "Closed source", kind: "block", cls: "tone-slate is-closed" },
} as const satisfies Record<string, Swatch>;
const status = {
  done: { label: "Done", kind: "block", cls: "tone-lime" },
  building: { label: "Under construction", kind: "block", cls: "tone-lime is-progress" },
  planned: { label: "Planned", kind: "block", cls: "tone-lime is-planned" },
} as const satisfies Record<string, Swatch>;
const line = {
  uses: { label: "Builds on", kind: "line", cls: "edge kind-uses" },
  runs: { label: "Runs with", kind: "line", cls: "edge kind-runs" },
  reads: { label: "Reads its map", kind: "line", cls: "edge kind-uses is-structural" },
  signet: { label: "Goes through a Signet", kind: "line", cls: "edge kind-runs is-signet" },
  next: { label: "Under construction", kind: "line", cls: "edge kind-uses is-next" },
  adopt: { label: "Template will adopt", kind: "line", cls: "edge kind-uses is-next" },
  toPlanned: { label: "To a planned piece", kind: "line", cls: "edge kind-runs is-planned" },
} as const satisfies Record<string, Swatch>;
export const key: Record<View, { title: string; items: Swatch[] }[]> = {
  whole: [
    { title: "Colour: part", items: [part.bb, part.dx, part.ag, part.gov, part.closed] },
    { title: "Fill: status", items: [status.done, status.building, status.planned] },
    { title: "Lines: relation", items: [line.uses, line.reads, line.signet, line.next, line.toPlanned] },
  ],
  blocks: [
    { title: "Colour: part", items: [part.bb, part.dx] },
    { title: "Fill: status", items: [status.done] },
    { title: "Lines: relation", items: [line.uses, line.reads, line.adopt] },
  ],
  vocabulary: [
    { title: "Colour: part", items: [part.bb, part.dx] },
    { title: "Lines: relation", items: [line.uses, line.reads, line.adopt] },
  ],
  agentic: [
    { title: "Colour: part", items: [part.ag, part.out, part.bb, part.dx, part.closed] },
    { title: "Fill: status", items: [status.done, status.building, status.planned] },
    { title: "Lines: relation", items: [line.runs, line.signet, line.uses, line.next, line.toPlanned] },
  ],
};
export const swatchSvg = (w: Swatch) =>
  w.kind === "line"
    ? `<svg class="map-svg key-swatch" viewBox="0 0 26 14" width="26" height="14" aria-hidden="true"><path class="${w.cls}" d="M2 7 H24"/></svg>`
    : `<svg class="map-svg key-swatch" viewBox="0 0 22 20" width="22" height="20" aria-hidden="true"><g class="key-node ${w.cls}">` +
      (w.cls.includes("is-progress") ? `<path class="scaffold" d="M1 6 L11 1 L21 6 L11 11 Z M1 6 V15 M21 6 V15 M11 11 V19 M1 15 L11 19 L21 15"/>` : "") +
      `<polygon class="face-side" points="3,7 11,11 11,17 3,13"/><polygon class="face-front" points="11,11 19,7 19,13 11,17"/><polygon class="face-top" points="11,3 19,7 11,11 3,7"/></g></svg>`;
