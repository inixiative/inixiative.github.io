// The map's drawing model. A scene is layers of primitives, nodes and edges, already projected to screen
// coordinates, so the same scene renders in the site (Astro) and as a static SVG file (scripts/export-map.ts).

export type Prim =
  | { t: "poly"; pts: [number, number][]; c: string }
  | { t: "path"; d: string; c: string }
  | { t: "text"; x: number; y: number; s: string; c: string; a?: "start" | "middle" | "end" }
  | { t: "rect"; x: number; y: number; w: number; h: number; r?: number; c: string }
  | { t: "crest"; x: number; y: number; size: number; c: string }
  /** A small drawing in its own 24-unit box, mapped onto a face by an affine matrix. */
  | { t: "glyph"; m: number[]; d: string; c: string };

export type SceneNode = {
  id: string;
  label: string;
  href?: string;
  /** Read aloud and shown on focus: what it is and how it relates. */
  aria: string;
  tier: string;
  look: string;
  prims: Prim[];
};

export type SceneEdge = {
  base: string;
  user: string;
  kind: "uses" | "runs";
  signet?: boolean;
  next?: boolean;
  structural?: boolean;
  /** Reaches a planned piece: drawn as a ghost, not as construction. */
  planned?: boolean;
  /** Edges that leave one tier for another: drawn as rising beams. */
  cross?: boolean;
  d: string;
  why: string;
};

export type Layer = { c?: string; tier?: string; items: (Prim | { node: SceneNode } | { edge: SceneEdge })[] };

export type Scene = {
  view: string;
  title: string;
  desc: string;
  box: [number, number, number, number];
  layers: Layer[];
  /** Edge kinds the view can switch between; the first is shown at rest. */
  modes?: { id: "runs" | "uses"; label: string }[];
};

/** Rough advance width for the site's sans at a size, enough to size a label plate. */
export const textWidth = (s: string, size: number, display = false) => {
  let w = 0;
  for (const ch of s) {
    if ("il.,:'| ".includes(ch)) w += 0.3;
    else if ("mwMW".includes(ch)) w += 0.86;
    else if (ch >= "A" && ch <= "Z") w += 0.68;
    else w += 0.53;
  }
  return w * size * (display ? 1.04 : 1);
};

/** An orthogonal route through waypoints with rounded corners. */
export const route = (pts: [number, number][], r = 10) => {
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i - 1];
    const [x, y] = pts[i];
    const [nx, ny] = pts[i + 1];
    const l1 = Math.hypot(x - px, y - py);
    const l2 = Math.hypot(nx - x, ny - y);
    const rr = Math.min(r, l1 / 2, l2 / 2);
    const ax = x - ((x - px) / l1) * rr;
    const ay = y - ((y - py) / l1) * rr;
    const bx = x + ((nx - x) / l2) * rr;
    const by = y + ((ny - y) / l2) * rr;
    d += ` L ${ax.toFixed(1)} ${ay.toFixed(1)} Q ${x} ${y} ${bx.toFixed(1)} ${by.toFixed(1)}`;
  }
  const last = pts[pts.length - 1];
  return `${d} L ${last[0]} ${last[1]}`;
};
