// The four views of one map. "whole": the three tiers as an exploded stack of plates (homepage).
// "blocks": the libraries' dependency graph, prisma-map at the base (/building-blocks).
// "vocabulary": the same graph, each block linked to its glossary entry (/vocabulary, and VOCABULARY.md).
// "agentic": how the agentic tools run together, and what they are built on (/agentic).
import { byId, edges as allEdges, type StackEdge, type StackNode } from "../data/stack";
import { type Layer, type Prim, type Scene, type SceneEdge, type SceneNode, route, textWidth } from "./scene";

type Pt = [number, number];

const look = (n: StackNode) => {
  const tone =
    n.tone === "signet"
      ? "pink"
      : n.tone === "shared"
        ? "blue"
        : n.tier === "building-blocks"
          ? "amber"
          : n.tier === "developer-experience"
            ? "teal"
          : n.tier === "governance"
            ? "violet"
            : "lime";
  return [
    `tone-${tone}`,
    n.licence === "closed" ? "is-closed" : "",
    n.state === "planned" ? "is-planned" : "",
    n.state === "progress" ? "is-progress" : "",
    n.id === "template" ? "is-template" : "",
  ]
    .filter(Boolean)
    .join(" ");
};

const list = (ids: string[]) => ids.map((id) => byId.get(id)?.label ?? id).join(", ");

const ariaFor = (n: StackNode, es: StackEdge[]) => {
  const parts = [`${n.label}: ${n.line}.`];
  if (n.licence === "closed") parts.push("Closed source.");
  if (n.state === "planned") parts.push("Planned.");
  if (n.state === "progress") parts.push("Under construction.");
  const on = es.filter((e) => e.kind === "uses" && e.user === n.id);
  const by = es.filter((e) => e.kind === "uses" && e.base === n.id);
  if (on.length) parts.push(`Built on ${list(on.map((e) => e.base))}.`);
  if (by.length) parts.push(`Used by ${list(by.map((e) => e.user))}.`);
  for (const e of es.filter((x) => x.kind === "runs" && (x.base === n.id || x.user === n.id))) {
    parts.push(`${e.why[0].toUpperCase()}${e.why.slice(1)}.`);
  }
  return parts.join(" ");
};

const edgeOf = (base: string, user: string, kind: StackEdge["kind"], d: string, cross = false): SceneEdge => {
  const e = allEdges.find((x) => x.base === base && x.user === user && x.kind === kind);
  if (!e) throw new Error(`map: no ${kind} edge ${base} -> ${user} in data/stack.ts`);
  const planned = byId.get(base)?.state === "planned" || byId.get(user)?.state === "planned";
  return { base, user, kind, signet: e.signet, next: e.next && !planned, planned, structural: e.structural, why: e.why, d, cross };
};

/* ------------------------------------------------------------------------------------------------ */
/* Elevation views: blocks drawn as solid bricks with a shallow oblique depth, edges routed by hand. */

const DX = 13;
const DY = 9;

const brick = (x: number, y: number, w: number, h: number): Prim[] => [
  { t: "poly", c: "face-top", pts: [[x, y], [x + DX, y - DY], [x + w + DX, y - DY], [x + w, y]] },
  { t: "poly", c: "face-side", pts: [[x + w, y], [x + w + DX, y - DY], [x + w + DX, y + h - DY], [x + w, y + h]] },
  { t: "rect", c: "face-base", x, y, w, h, r: 2 },
  { t: "rect", c: "face-front", x, y, w, h, r: 2 },
];

type Place = { id: string; x: number; y: number; w: number; h?: number; line?: string; href?: string };

const brickNode = (p: Place, es: StackEdge[], tier: string): SceneNode => {
  const n = byId.get(p.id);
  if (!n) throw new Error(`map: unknown node ${p.id}`);
  const h = p.h ?? 62;
  const prims = brick(p.x, p.y, p.w, h);
  const big = h >= 80;
  let tx = p.x + 16;
  if (n.id === "kingdom") {
    prims.push({ t: "crest", x: p.x + 16, y: p.y + 16, size: 26, c: "crest" });
    tx = p.x + 52;
  }
  // The one label shape: the tag (repo name) on top, the short description below.
  const desc = p.line ?? n.short ?? "";
  const tag = n.tag ?? n.label;
  if (p.w < 100) prims.push({ t: "text", x: p.x + p.w / 2, y: p.y + h / 2 + 4, s: tag, c: "tag-text", a: "middle" });
  else {
    const top = desc ? p.y + h / 2 - 4 : p.y + h / 2 + 4;
    prims.push({ t: "text", x: tx, y: top, s: tag, c: "tag-text" });
    if (desc) prims.push({ t: "text", x: tx, y: top + 18, s: desc, c: "desc" });
  }
  void big;
  const flag = n.state === "planned" ? "planned" : n.state === "progress" ? "under construction" : n.licence === "closed" ? "closed" : "";
  // Under construction: scaffolding around the brick, its dashes travelling slowly.
  if (n.state === "progress") prims.unshift({ t: "rect", c: "scaffold", x: p.x - 6, y: p.y - DY - 6, w: p.w + DX + 12, h: h + DY + 12, r: 4 });
  if (flag) {
    const fw = textWidth(flag, 10.5) + 16;
    prims.push({ t: "rect", c: "flag-plate", x: p.x + p.w - fw - 10, y: p.y + 9, w: fw, h: 18, r: 9 });
    prims.push({ t: "text", c: "flag", x: p.x + p.w - fw / 2 - 10, y: p.y + 21.5, s: flag, a: "middle" });
  }
  return { id: n.id, label: n.label, href: p.href ?? n.href, aria: ariaFor(n, es), tier, look: look(n), prims };
};

/** Bottom-centre, top-centre and side midpoints of a placed brick. */
const at = (p: Place) => {
  const h = p.h ?? 62;
  return {
    top: (dx = p.w / 2): Pt => [p.x + dx, p.y],
    bottom: (dx = p.w / 2): Pt => [p.x + dx, p.y + h],
    left: (dy = h / 2): Pt => [p.x, p.y + dy],
    right: (dy = h / 2): Pt => [p.x + p.w, p.y + dy],
  };
};

const groupLabel = (x: number, y: number, s: string, c = "group-label", a: "start" | "middle" | "end" = "start"): Prim => ({ t: "text", x, y, s, c, a });

/* The libraries, prisma-map at the base. Shared by "blocks" and "vocabulary". */
const librariesScene = (view: "blocks" | "vocabulary"): Scene => {
  const vocab = view === "vocabulary";
  const ids = ["prisma-map", "json-rules", "permissions", "transitions", "rules-builder", "atlas", "gloss", "worktrees", "init", "ci-rules", "config", "template"];
  const es = allEdges.filter((e) => ids.includes(e.base) && ids.includes(e.user));
  const ROW = 122;
  const H = 62;
  const y0 = 4 * ROW + 40; // prisma-map's top
  const rowY = (r: number) => y0 - r * ROW;
  // On /vocabulary the glossary renders in the browser, so the page script points each block at its entry.
  const v = (_anchor: string) => "#content";
  const lines: Record<string, string> = vocab
    ? {
        "prisma-map": "The schema the stack is written against",
        "json-rules": "Rule logic, lenses and sources; check, or compile to Prisma and SQL",
        permissions: "Who can do what, decided with json-rules",
        transitions: "On json-rules and permissions",
        "rules-builder": "Headless builders on the lens",
        atlas: "A map of your code",
        gloss: "Explanations kept out of the source",
        config: "The shared toolchain and theme",
        template: "Consumes all of them",
      }
    : {};
  const P: Record<string, Place> = {
    "prisma-map": { id: "prisma-map", x: 0, y: rowY(0), w: 720 },
    "json-rules": { id: "json-rules", x: 96, y: rowY(1), w: 624 },
    permissions: { id: "permissions", x: 96, y: rowY(2), w: 300 },
    "rules-builder": { id: "rules-builder", x: 476, y: rowY(2), w: 244 },
    transitions: { id: "transitions", x: 156, y: rowY(3), w: 240 },
    gloss: { id: "gloss", x: 836, y: rowY(1), w: 236 },
    atlas: { id: "atlas", x: 836, y: rowY(2), w: 236 },
    worktrees: { id: "worktrees", x: 846, y: rowY(0) + 30, w: 82, h: 32, line: "" },
    init: { id: "init", x: 940, y: rowY(0) + 30, w: 52, h: 32, line: "" },
    "ci-rules": { id: "ci-rules", x: 1004, y: rowY(0) + 30, w: 64, h: 32, line: "" },
    config: { id: "config", x: 0, y: rowY(0) + H + 56, w: 1072, h: 46, line: vocab ? lines.config : "The toolchain every package builds with" },
    template: { id: "template", x: 0, y: rowY(4) - 30, w: 1130, h: 92 },
  };
  for (const id of ids) {
    if (lines[id] && id !== "config") P[id].line = lines[id];
    if (vocab) P[id].href = v(["worktrees", "init", "ci-rules"].includes(id) ? "template" : id);
  }
  const A = Object.fromEntries(ids.map((id) => [id, at(P[id])])) as Record<string, ReturnType<typeof at>>;
  const tplBottom = P.template.y + 92;
  const gap = (r: number) => rowY(r) - (ROW - H) / 2; // the middle of the gap above row r-1
  const E: SceneEdge[] = [
    edgeOf("prisma-map", "json-rules", "uses", route([A["prisma-map"].top(420), A["json-rules"].bottom(324)])),
    edgeOf("prisma-map", "permissions", "uses", route([A["prisma-map"].top(52), [52, gap(1)], [150, gap(1)], A.permissions.bottom(54)])),
    edgeOf("json-rules", "permissions", "uses", route([A["json-rules"].top(170), A.permissions.bottom(170)])),
    edgeOf("json-rules", "rules-builder", "uses", route([A["json-rules"].top(500), A["rules-builder"].bottom(120)])),
    edgeOf("json-rules", "transitions", "uses", route([A["json-rules"].top(326), [422, rowY(3) + H / 2], A.transitions.right()])),
    edgeOf("permissions", "transitions", "uses", route([A.permissions.top(186), A.transitions.bottom(126)])),
    edgeOf("json-rules", "atlas", "uses", route([A["json-rules"].top(590), [686, gap(1)], [890, gap(1)], A.atlas.bottom(54)])),
    edgeOf("prisma-map", "template", "uses", route([A["prisma-map"].top(22), [22, tplBottom]])),
    edgeOf("permissions", "template", "uses", route([A.permissions.top(26), [122, tplBottom]])),
    edgeOf("transitions", "template", "uses", route([A.transitions.top(120), [276, tplBottom]])),
    edgeOf("json-rules", "template", "uses", route([A["json-rules"].top(352), [448, tplBottom]])),
    edgeOf("rules-builder", "template", "uses", route([A["rules-builder"].top(130), [606, tplBottom]])),
    edgeOf("atlas", "template", "uses", route([A.atlas.top(106), [942, tplBottom]])),
    edgeOf("gloss", "template", "uses", route([A.gloss.right(), [1094, rowY(1) + H / 2], [1094, tplBottom]])),
    // The three share one riser: they come with template as a set.
    ...(["worktrees", "init", "ci-rules"] as const).map((id) =>
      edgeOf(id, "template", "uses", route([[1062, rowY(0) - 2], [1062, rowY(0) - 22], [1114, rowY(0) - 22], [1114, tplBottom]], 8)),
    ),
    // config sits under everything: its edges light up on focus but are not drawn.
    ...["prisma-map", "json-rules", "permissions", "transitions", "rules-builder", "atlas", "gloss", "template"].map((u) => edgeOf("config", u, "uses", "")),
  ];
  const bottom = P.config.y + 46;
  const back: Prim[] = [
    { t: "rect", c: "zone zone-libraries", x: -18, y: rowY(3) - 30, w: 770, h: rowY(0) + H - rowY(3) + 52, r: 14 },
    { t: "rect", c: "zone zone-tooling", x: 816, y: rowY(2) - 30, w: 322, h: rowY(0) + H - rowY(2) + 52, r: 14 },
    { t: "rect", c: "cluster", x: 836, y: rowY(0) - 2, w: 236, h: 68, r: 8 },
    groupLabel(-2, rowY(0) + H + 36, "The libraries", "group-label tone-amber"),
    groupLabel(834, rowY(0) + H + 36, "Developer experience", "group-label tone-teal"),
    groupLabel(846, rowY(0) + 13, "Comes with template", "micro-label"),
  ];
  return {
    view,
    title: vocab ? "How the libraries fit" : "How the building blocks fit together",
    desc:
      "prisma-map is the base: json-rules and permissions read its map. permissions is built on json-rules. " +
      "transitions is built on json-rules and permissions. rules-builder is built on json-rules. " +
      "Developer experience: atlas (uses json-rules), gloss, config (the toolchain under every package), and the worktrees, init and CI rules that come with template. " +
      "template uses prisma-map, json-rules, permissions, rules-builder, atlas and config, and moves onto transitions and gloss next.",
    box: [-40, P.template.y - 40, 1200, bottom + 40 - (P.template.y - 40)],
    layers: [
      { c: "backdrop", items: back },
      { c: "edges", items: E.map((edge) => ({ edge })) },
      { c: "nodes", tier: "building-blocks", items: ids.map((id) => ({ node: brickNode(P[id], es, "building-blocks") })) },
    ],
  };
};

/* How the agentic tools run together, and what they are built on. */
const agenticScene = (): Scene => {
  const ids = [
    "oracle", "bench", "foundry", "agent-session", "archive", "kcp", "kingdom", "signet",
    "integrations", "teammates", "artifactory", "prisma-map", "json-rules", "permissions", "rules-builder", "gloss", "config",
  ];
  const es = allEdges.filter((e) => ids.includes(e.base) && ids.includes(e.user));
  const H = 66;
  const P: Record<string, Place> = {
    oracle: { id: "oracle", x: 24, y: 0, w: 280 },
    bench: { id: "bench", x: 328, y: 0, w: 230 },
    foundry: { id: "foundry", x: 24, y: 150, w: 424, h: 84 },
    "agent-session": { id: "agent-session", x: 24, y: 300, w: 200 },
    archive: { id: "archive", x: 248, y: 300, w: 200 },
    kcp: { id: "kcp", x: 24, y: 432, w: 200 },
    kingdom: { id: "kingdom", x: 560, y: 196, w: 250, h: 110 },
    signet: { id: "signet", x: 580, y: 410, w: 210 },
    integrations: { id: "integrations", x: 920, y: 150, w: 250 },
    teammates: { id: "teammates", x: 920, y: 300, w: 250 },
    artifactory: { id: "artifactory", x: 920, y: 432, w: 250 },
    config: { id: "config", x: 24, y: 610, w: 130, h: 46 },
    gloss: { id: "gloss", x: 172, y: 610, w: 166, h: 46 },
    "json-rules": { id: "json-rules", x: 356, y: 610, w: 120, h: 46 },
    "prisma-map": { id: "prisma-map", x: 520, y: 610, w: 150, h: 46 },
    permissions: { id: "permissions", x: 688, y: 610, w: 160, h: 46 },
    "rules-builder": { id: "rules-builder", x: 866, y: 610, w: 170, h: 46 },
  };
  const A = Object.fromEntries(ids.map((id) => [id, at(P[id])])) as Record<string, ReturnType<typeof at>>;
  const runs: SceneEdge[] = [
    // Every Signet relation leaves Kingdom through the Signet.
    edgeOf("kingdom", "foundry", "runs", route([A.kingdom.bottom(84), [644, 430], [496, 430], [496, 192], A.foundry.right(42)])),
    edgeOf("kingdom", "archive", "runs", route([A.kingdom.bottom(104), [664, 446], [516, 446], [516, 333], A.archive.right(33)])),
    edgeOf("kingdom", "kcp", "runs", route([A.kingdom.bottom(124), [684, 462], A.kcp.right(30)])),
    edgeOf("integrations", "kingdom", "runs", route([A.integrations.left(33), [866, 183], [866, 230], A.kingdom.right(34)])),
    edgeOf("kingdom", "teammates", "runs", route([A.kingdom.bottom(164), [724, 443], [880, 443], [880, 333], A.teammates.left(33)])),
    edgeOf("kingdom", "artifactory", "runs", route([A.kingdom.right(92), [898, 288], [898, 465], A.artifactory.left(33)])),
    edgeOf("foundry", "agent-session", "runs", route([A.foundry.bottom(98), A["agent-session"].top(98)])),
    edgeOf("foundry", "archive", "runs", route([A.foundry.bottom(326), A.archive.top(98)])),
    edgeOf("foundry", "oracle", "runs", route([A.foundry.top(110), A.oracle.bottom(110)])),
  ];
  const uses: SceneEdge[] = [
    edgeOf("agent-session", "foundry", "uses", route([A["agent-session"].top(70), A.foundry.bottom(70)])),
    edgeOf("archive", "foundry", "uses", route([A.archive.top(126), A.foundry.bottom(354)])),
    edgeOf("agent-session", "archive", "uses", route([A["agent-session"].right(33), A.archive.left(33)])),
    edgeOf("signet", "foundry", "uses", route([A.signet.left(18), [496, 428], [496, 196], A.foundry.right(46)])),
    edgeOf("signet", "archive", "uses", route([A.signet.left(34), [516, 444], [516, 340], A.archive.right(40)])),
    edgeOf("signet", "kcp", "uses", route([A.signet.left(50), [236, 460], A.kcp.right(28)])),
    edgeOf("signet", "kingdom", "uses", route([A.signet.top(85), A.kingdom.bottom(125)])),
    edgeOf("archive", "kingdom", "uses", route([A.archive.right(14), [536, 314], [536, 240], A.kingdom.left(44)])),
    edgeOf("agent-session", "kingdom", "uses", route([A["agent-session"].bottom(150), [174, 390], [548, 390], [548, 290], A.kingdom.left(94)])),
    edgeOf("foundry", "oracle", "uses", route([A.foundry.top(110), A.oracle.bottom(110)])),
    edgeOf("agent-session", "oracle", "uses", route([A["agent-session"].left(33), [8, 333], [8, 33], A.oracle.left(33)])),
    edgeOf("archive", "oracle", "uses", route([A.archive.top(170), [422, 112], [190, 112], A.oracle.bottom(166)])),
    edgeOf("agent-session", "bench", "uses", route([A["agent-session"].right(14), [236, 314], [236, 126], [470, 126], A.bench.bottom(142)])),
    edgeOf("json-rules", "signet", "uses", route([A["json-rules"].top(110), [430, 560], [640, 560], A.signet.bottom(40)])),
    edgeOf("json-rules", "agent-session", "uses", route([A["json-rules"].top(30), [350, 540], [176, 540], A["agent-session"].bottom(152)])),
    edgeOf("json-rules", "foundry", "uses", route([A["json-rules"].top(70), [390, 520], [466, 520], [466, 220], A.foundry.right(70)])),
    edgeOf("json-rules", "kingdom", "uses", route([A["json-rules"].top(140), [460, 578], [578, 578], [578, 306]])),
    edgeOf("gloss", "foundry", "uses", route([A.gloss.top(64), [236, 520], [236, 234]])),
    edgeOf("config", "foundry", "uses", route([A.config.top(80), [104, 580], [6, 580], [6, 210], A.foundry.left(60)])),
    edgeOf("prisma-map", "kingdom", "uses", route([A["prisma-map"].top(110), [630, 520], [588, 520], [588, 306]])),
    edgeOf("permissions", "kingdom", "uses", route([A.permissions.top(40), [728, 540], [790, 540], [790, 306]])),
    edgeOf("rules-builder", "kingdom", "uses", route([A["rules-builder"].top(40), [906, 560], [800, 560], [800, 306]])),
  ];
  const back: Prim[] = [
    { t: "rect", c: "zone zone-measure", x: -6, y: -22, w: 582, h: 112, r: 16 },
    { t: "rect", c: "zone zone-machine", x: -6, y: 128, w: 476, h: 392, r: 16 },
    { t: "rect", c: "zone zone-outside", x: 900, y: 128, w: 290, h: 392, r: 16 },
    { t: "rect", c: "zone zone-blocks", x: 0, y: 596, w: 1060, h: 74, r: 14 },
    groupLabel(10, 116, "On your machine", "group-label tone-lime"),
    groupLabel(590, 40, "Measuring the work", "group-label"),
    groupLabel(684, 170, "Hosted", "group-label", "middle"),
    groupLabel(912, 116, "Outside your machine", "group-label tone-blue"),
    groupLabel(1060, 694, "What they're built on", "group-label", "end"),
  ];
  return {
    view: "agentic",
    title: "How the agentic tools work together",
    desc:
      "Foundry runs on your machine with agent-session and Archive. Kingdom is the permission hub: your integrations connect to it, " +
      "and anything that uses an integration goes through a Signet. Foundry and a local Archive pair with Kingdom through a Signet; " +
      "KCP will run your CLIs through Kingdom (under construction). Oracle measures and tunes Foundry. Artifactory is planned.",
    box: [-30, -30, 1240, 740],
    modes: [
      { id: "runs", label: "How they run" },
      { id: "uses", label: "What they're built on" },
    ],
    layers: [
      { c: "backdrop", items: back },
      { c: "edges", items: [...runs, ...uses].map((edge) => ({ edge })) },
      {
        c: "nodes",
        tier: "agentic",
        items: ids.map((id) => ({ node: brickNode(P[id], es, byId.get(id)?.tier ?? "agentic") })),
      },
    ],
  };
};

/* ------------------------------------------------------------------------------------------------ */
/* The whole picture: three tiers as an exploded stack of glass plates, in 2:1 isometric projection. */

const K = 0.86;
const CX = 36 * K;
const CY = 18 * K;
const iso = (x: number, y: number, z: number): Pt => [Math.round((x - y) * CX * 10) / 10, Math.round(((x + y) * CY - z * K) * 10) / 10];

type PlateSpec = { x: number; y: number; w: number; d: number; z: number; t: number; c: string };

const plate = (p: PlateSpec): Prim[] => {
  const { x, y, w, d, z, t } = p;
  const top: Pt[] = [iso(x, y, z), iso(x + w, y, z), iso(x + w, y + d, z), iso(x, y + d, z)];
  const prims: Prim[] = [
    { t: "poly", c: `${p.c} plate-left`, pts: [iso(x, y + d, z), iso(x + w, y + d, z), iso(x + w, y + d, z - t), iso(x, y + d, z - t)] },
    { t: "poly", c: `${p.c} plate-right`, pts: [iso(x + w, y, z), iso(x + w, y + d, z), iso(x + w, y + d, z - t), iso(x + w, y, z - t)] },
    { t: "poly", c: `${p.c} plate-top`, pts: top },
  ];
  let grid = "";
  for (let i = 1; i < w; i++) grid += `M ${iso(x + i, y, z).join(" ")} L ${iso(x + i, y + d, z).join(" ")} `;
  for (let j = 1; j < d; j++) grid += `M ${iso(x, y + j, z).join(" ")} L ${iso(x + w, y + j, z).join(" ")} `;
  prims.push({ t: "path", c: `${p.c} plate-grid`, d: grid });
  prims.push({ t: "path", c: `${p.c} plate-rim`, d: `M ${iso(x, y + d, z).join(" ")} L ${iso(x + w, y + d, z).join(" ")} L ${iso(x + w, y, z).join(" ")}` });
  return prims;
};

// Hand-drawn marks for each block's top face, in a 24-unit box: what the piece does, at a glance.
const CREST = "M3 4v15l11 9 11-9V4h-5v6h-4V2h-4v8H8V4Z M10 22V15h8v7";
const glyphs: Record<string, string> = {
  "prisma-map": "M4 5 H20 V19 H4 Z M4 10 H20 M4 14.5 H20 M11 5 V19",
  "json-rules": "M9 4 Q6 4 6 7 V10 Q6 12 4 12 Q6 12 6 14 V17 Q6 20 9 20 M15 4 Q18 4 18 7 V10 Q18 12 20 12 Q18 12 18 14 V17 Q18 20 15 20",
  permissions: "M7 11 H17 V19 H7 Z M9 11 V8 Q9 5 12 5 Q15 5 15 8 V11 M12 14 V16",
  transitions: "M4 12 H18 M14 8 L18 12 L14 16 M4 8 V16",
  "rules-builder": "M4 5 H20 V10 H4 Z M4 14 H14 V19 H4 Z M17 16.5 H20",
  foundry: "M5 7 H19 M5 12 H19 M5 17 H13",
  archive: "M4 5 H20 V9 H4 Z M5 9 V19 H19 V9 M10 13 H14",
  "agent-session": "M5 7 L10 12 L5 17 M12 17 H19",
  agent: "M5 7 L10 12 L5 17 M12 17 H19",
  wardens: "M4 12 H17 M12 7 L17 12 L12 17",
  codebase: "M9 7 L4 12 L9 17 M15 7 L20 12 L15 17 M13.5 5 L10.5 19",
  kcp: "M5 7 L10 12 L5 17 M12 17 H19",
  signet: "M12 4 A8 8 0 1 1 11.99 4 Z M12 8 V16 M8 12 H16",
  oracle: "M3 12 Q12 4 21 12 Q12 20 3 12 Z M12 9 A3 3 0 1 1 11.99 9 Z",
  bench: "M6 19 V13 M10 19 V8 M14 19 V11 M18 19 V5",
  template: "M3 5 H21 V19 H3 Z M3 9 H21 M6 7 H6.5 M8.5 7 H9 M7 13 H13 M7 16 H16",
  whitepaper: "M6 3 H15 L19 7 V21 H6 Z M9 10 H16 M9 13.5 H16 M9 17 H13",
  livestock: "M8 4 H16 L19 9 V20 H5 V9 Z M12 7 A1.5 1.5 0 1 1 11.99 7 Z",
  project: "M3 12 A6 6 0 1 0 15 12 A6 6 0 1 0 3 12 Z M9 12 A6 6 0 1 0 21 12 A6 6 0 1 0 9 12 Z",
  atlas: "M3 6 L9 4 L15 6 L21 4 V18 L15 20 L9 18 L3 20 Z M9 4 V18 M15 6 V20",
  gloss: "M3 4 H12 V20 H3 Z M15 7 H21 M15 12 H21 M15 17 H19",
  config: "M4 7 H20 M4 12 H20 M4 17 H20 M9 5 V9 M15 10 V14 M11 15 V19",
};

/** A glyph laid on a block's top face (the iso plane at height z), filling `frac` of the face. */
const onTop = (id: string, x: number, y: number, z: number, s: number, frac = 0.78): Prim | null => {
  const crest = id === "kingdom";
  const d = crest ? CREST : glyphs[id];
  if (!d) return null;
  const box = crest ? 32 : 24;
  const k = (2 * s * frac) / box;
  const [ex, ey] = iso(x - s * frac, y - s * frac, z);
  return { t: "glyph", c: crest ? "glyph glyph-crest" : "glyph", d, m: [k * CX, k * CY, -k * CX, k * CY, ex, ey] };
};

/** The size of a node's label chip in the isometric views: tag on top, short description below, a step number in front. */
const chipSize = (tag: string, desc: string, crest = false, step?: number): [number, number] => [
  Math.max(tag.length * 6.6 + (crest ? 16 : 0), textWidth(desc, 13.6, true)) + 20 + (step ? 26 : 0),
  36,
];

type Box = { x: number; y: number; w: number; h: number };
const hits = (a: Box, b: Box, m = 4) => a.x < b.x + b.w + m && b.x < a.x + a.w + m && a.y < b.y + b.h + m && b.y < a.y + a.h + m;

type IsoPlace = {
  id: string;
  x: number;
  y: number;
  z: number;
  /** Footprint along x (and along y, unless `sd` is given), in grid units. */
  s?: number;
  sd?: number;
  h?: number;
  sub?: string;
  dy?: number;
  dx?: number;
  bare?: boolean;
  /** This view's short description, in place of the data's. */
  line?: string;
  /** A numbered step in the story the view tells. */
  step?: number;
  /** This view's colour for the piece, in place of the data's. */
  tone?: string;
  /** More blocks of the same piece, as offsets from the first (Wardens are many small agents). */
  copies?: Pt[];
};

const half = (p: IsoPlace): [number, number] => {
  const s = (p.s ?? 0.8) / 2;
  return [s, p.sd !== undefined ? p.sd / 2 : s];
};

const cube = (x: number, y: number, z: number, s: number, sy: number, h: number): Prim[] => [
  { t: "poly", c: "face-side", pts: [iso(x - s, y + sy, z + h), iso(x + s, y + sy, z + h), iso(x + s, y + sy, z), iso(x - s, y + sy, z)] },
  { t: "poly", c: "face-front", pts: [iso(x + s, y - sy, z + h), iso(x + s, y + sy, z + h), iso(x + s, y + sy, z), iso(x + s, y - sy, z)] },
  { t: "poly", c: "face-top", pts: [iso(x - s, y - sy, z + h), iso(x + s, y - sy, z + h), iso(x + s, y + sy, z + h), iso(x - s, y + sy, z + h)] },
];

const descOf = (p: IsoPlace, n: StackNode) => p.line ?? n.short ?? "";
const chipOf = (p: IsoPlace, n: StackNode) => chipSize(n.tag ?? n.label, descOf(p, n), n.id === "kingdom", p.step);

const isoNode = (p: IsoPlace, es: StackEdge[]): SceneNode => {
  const n = byId.get(p.id);
  if (!n) throw new Error(`map: unknown node ${p.id}`);
  const [s, sy] = half(p);
  const h = p.h ?? 14;
  const { x, y, z } = p;
  const prims: Prim[] = [];
  // Back to front, so nearer blocks of the same piece cover farther ones.
  const blocks: Pt[] = [[0, 0], ...(p.copies ?? [])].sort((a, b) => a[0] + a[1] - (b[0] + b[1]));
  for (const [ox, oy] of blocks) {
    prims.push(...cube(x + ox, y + oy, z, s, sy, h));
    const mark = onTop(n.id, x + ox, y + oy, z + h, Math.min(s, sy));
    if (mark) prims.push(mark);
  }
  const [ax, ay] = iso(x, y, z + h);
  const tone = p.tone ? look(n).replace(/tone-\w+/, `tone-${p.tone}`) : look(n);
  if (p.bare) return { id: n.id, label: n.label, href: n.href, aria: ariaFor(n, es), tier: n.tier, look: tone, prims };
  const crest = n.id === "kingdom";
  const flag = n.state === "progress";
  if (flag) {
    // Under construction: a scaffold frame around the block, its dashes travelling slowly.
    const g = s + 0.14;
    const gy = sy + 0.14;
    const hh = h + 8;
    const c = [iso(x - g, y + gy, z), iso(x + g, y + gy, z), iso(x + g, y - gy, z)];
    const t = [iso(x - g, y - gy, z + hh), iso(x + g, y - gy, z + hh), iso(x + g, y + gy, z + hh), iso(x - g, y + gy, z + hh)];
    const d =
      `M ${t.map((q) => q.join(" ")).join(" L ")} Z ` +
      `M ${t[3].join(" ")} L ${c[0].join(" ")} M ${t[2].join(" ")} L ${c[1].join(" ")} M ${t[1].join(" ")} L ${c[2].join(" ")} ` +
      `M ${t[3].join(" ")} L ${c[1].join(" ")} M ${t[2].join(" ")} L ${c[2].join(" ")}`;
    prims.push({ t: "path", c: "scaffold", d });
  }
  // The one label shape: the tag (repo name) on top, the short description below.
  const tag = n.tag ?? n.label;
  const desc = descOf(p, n);
  const [cw, ch] = chipOf(p, n);
  const cx = ax + (p.dx ?? 0);
  const cy = ay - (p.dy ?? 22) - ch;
  prims.push({ t: "path", c: "leader", d: `M ${ax} ${ay} L ${cx} ${cy + ch}` });
  prims.push({ t: "rect", c: "chip", x: cx - cw / 2, y: cy, w: cw, h: ch, r: 6 });
  let tx = cx - cw / 2 + 10;
  if (p.step) {
    prims.push({ t: "rect", c: "step-badge", x: tx, y: cy + 9, w: 18, h: 18, r: 9 });
    prims.push({ t: "text", c: "step-num", x: tx + 9, y: cy + 22, s: String(p.step), a: "middle" });
    tx += 26;
  }
  const dx0 = tx;
  if (crest) {
    prims.push({ t: "crest", c: "crest", x: tx, y: cy + 5, size: 11 });
    tx += 16;
  }
  prims.push({ t: "text", c: "tag-text", x: tx, y: cy + 14, s: tag });
  prims.push({ t: "text", c: "desc", x: dx0, y: cy + 29, s: desc });
  const looks = `${tone}${n.id === "kingdom" ? " is-focal" : ""}${n.id === "project" ? " is-goal" : ""}`;
  return { id: n.id, label: n.label, href: n.href, aria: ariaFor(n, es), tier: n.tier, look: looks, prims, short: desc, step: p.step };
};

/** What an isometric view needs to lay out its pieces: anchors, edges along plates and between them, chip placement. */
const isoKit = (places: IsoPlace[]) => {
  const pl = Object.fromEntries(places.map((p) => [p.id, p]));
  const topOf = (id: string): Pt => {
    const p = pl[id];
    return iso(p.x, p.y, p.z + (p.h ?? 14));
  };
  const footOf = (id: string): Pt => {
    const p = pl[id];
    return iso(p.x, p.y, p.z);
  };
  const beam = (b: string, u: string, kind: "uses" | "runs" = "uses") => {
    const [ax, ay] = topOf(b);
    const [bx, by] = footOf(u);
    const lift = (ay - by) * 0.45;
    return edgeOf(b, u, kind, `M ${ax} ${ay} C ${ax} ${ay - lift} ${bx} ${by + lift} ${bx} ${by}`, true);
  };
  /** A trace painted on a plate: along x, then along y. */
  const trace = (b: string, u: string, z: number, kind: "uses" | "runs" = "runs", yFirst = false) => {
    const pb = pl[b];
    const pu = pl[u];
    const mid: Pt = yFirst ? iso(pb.x, pu.y, z) : iso(pu.x, pb.y, z);
    return edgeOf(b, u, kind, route([iso(pb.x, pb.y, z), mid, iso(pu.x, pu.y, z)], 8));
  };
  // Place every chip where it covers no other chip, block or label: nearest free spot above its block.
  const textBox = (p: Prim): Box | null => {
    if (p.t !== "text") return null;
    const size = p.c.includes("tier-label") ? 17 : p.c.includes("tier-line") ? 12 : 11.5;
    const w = textWidth(p.s, size, size > 13);
    const x = p.a === "end" ? p.x - w : p.a === "middle" ? p.x - w / 2 : p.x;
    return { x, y: p.y - size, w, h: size + 4 };
  };
  const blockBox = (q: IsoPlace): Box => {
    const [s0, sy0] = half(q);
    const h0 = q.h ?? 14;
    const [lx] = iso(q.x - s0, q.y + sy0, q.z);
    const [rx] = iso(q.x + s0, q.y - sy0, q.z);
    const [, ty] = iso(q.x - s0, q.y - sy0, q.z + h0);
    const [, by] = iso(q.x + s0, q.y + sy0, q.z);
    return { x: lx, y: ty, w: rx - lx, h: by - ty };
  };
  /** `own`: pieces whose chip must also clear their own block (a wide slab). `lines`: points on drawn lines to keep clear. */
  const placeChips = (labels: Prim[], first: string[], opts: { own?: string[]; lines?: Pt[] } = {}) => {
    const taken: Box[] = labels.map(textBox).filter((b): b is Box => !!b);
    for (const [px, py] of opts.lines ?? []) taken.push({ x: px - 1, y: py - 1, w: 2, h: 2 });
    const blocks = places.map((q) => ({ id: q.id, box: blockBox(q) }));
    const order = [...places].filter((q) => !q.bare).sort((a, b) => (first.indexOf(b.id) + 1 ? 1 : 0) - (first.indexOf(a.id) + 1 ? 1 : 0));
    for (const q of order) {
      const n = byId.get(q.id)!;
      const [cw, ch] = chipOf(q, n);
      const [ax, ay] = iso(q.x, q.y, q.z + (q.h ?? 14));
      const others = blocks.filter((b) => b.id !== q.id || opts.own?.includes(q.id)).map((b) => b.box);
      let best: { dx: number; dy: number; cost: number } | null = null;
      for (let dy = -70; dy <= 150; dy += 4)
        for (let dx = -230; dx <= 230; dx += 8) {
          const box = { x: ax + dx - cw / 2, y: ay - dy - ch, w: cw, h: ch };
          if (taken.some((t) => hits(box, t)) || others.some((t) => hits(box, t, 2))) continue;
          const cost = Math.abs(dx) * 0.9 + Math.abs(dy - 14) + (dy < 6 ? 60 : 0);
          if (!best || cost < best.cost) best = { dx, dy, cost };
        }
      if (!best) console.warn(`map: no free spot for ${q.id}'s label`);
      const pick = best ?? { dx: q.dx ?? 0, dy: q.dy ?? 22 };
      q.dx = pick.dx;
      q.dy = pick.dy;
      taken.push({ x: ax + pick.dx - cw / 2, y: ay - pick.dy - ch, w: cw, h: ch });
    }
  };
  return { pl, topOf, footOf, beam, trace, placeChips };
};

/** Fit a view box to what is drawn. */
const fitBox = (layers: Layer[], pad = 10): Scene["box"] => {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const l of layers)
    for (const it of l.items) {
      const prims = "node" in it ? it.node.prims : "edge" in it ? [] : [it];
      for (const p of prims) {
        if (p.t === "poly") for (const [px, py] of p.pts) (xs.push(px), ys.push(py));
        if (p.t === "rect") (xs.push(p.x, p.x + p.w), ys.push(p.y, p.y + p.h));
        if (p.t === "text") {
          const size = p.c.includes("tier-label") ? 20 : p.c.includes("tier-line") ? 12 : 13;
          const w = textWidth(p.s, size, size > 13);
          xs.push(p.a === "end" ? p.x - w : p.a === "middle" ? p.x + w / 2 : p.x + w);
          ys.push(p.y - size, p.y + 4);
        }
      }
    }
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  return [Math.floor(minX), Math.floor(minY), Math.ceil(Math.max(...xs) + pad - minX), Math.ceil(Math.max(...ys) + pad - minY)];
};

/** A plate's name and line, written at its left corner (or under its right corner). */
const plateLabel = (spec: PlateSpec, tier: string, text: string, line: string): Prim[] => {
  const [lx, ly] = iso(spec.x, spec.y + spec.d, spec.z);
  return [
    { t: "text", x: lx - 18, y: ly - 4, s: text, c: `tier-label tone-${tier}`, a: "end" },
    { t: "text", x: lx - 18, y: ly + 14, s: line, c: "tier-line", a: "end" },
  ];
};
const plateLabelRight = (spec: PlateSpec, tier: string, text: string, line: string): Prim[] => {
  const [lx, ly] = iso(spec.x + spec.w, spec.y + spec.d, spec.z - spec.t);
  return [
    { t: "text", x: lx + 10, y: ly + 34, s: text, c: `tier-label tone-${tier}`, a: "middle" },
    { t: "text", x: lx + 10, y: ly + 52, s: line, c: "tier-line", a: "middle" },
  ];
};

const wholeScene = (): Scene => {
  const Z = { base: 0, template: 112, dx: 64, agentic: 300, governance: 528 };
  const base: PlateSpec = { x: 0, y: 0, w: 7.2, d: 5, z: Z.base, t: 12, c: "plate tone-amber" };
  // Template is a layer: a thin plate resting on the libraries, spanning them.
  // set up and to the left, so the libraries below stay uncovered; the template block stands on it.
  const tpl: PlateSpec = { x: -1.1, y: 1.5, w: 5.0, d: 3.4, z: Z.template, t: 5, c: "tone-amber face-shelf" };
  const agentic: PlateSpec = { x: 0, y: 0, w: 9.4, d: 4.8, z: Z.agentic, t: 12, c: "plate tone-lime" };
  const gov: PlateSpec = { x: 2.8, y: 1.0, w: 4.4, d: 2.6, z: Z.governance, t: 12, c: "plate tone-violet" };
  const dx: PlateSpec = { x: 9.2, y: -0.8, w: 3.2, d: 3.8, z: Z.dx, t: 8, c: "plate plate-light tone-teal" };
  // A consumer of the Inixiative platform, not part of it: raised just above the governance plate.
  const lsPlate: PlateSpec = { x: 6.6, y: 0.2, w: 1.3, d: 1.1, z: Z.governance + 96, t: 6, c: "plate plate-light is-closed" };

  const places: IsoPlace[] = [
    // The libraries stand on the template plate, from the base up. Tooling beside them.
    { id: "prisma-map", x: 0.9, y: 4.3, z: 0, h: 10, dx: -26 },
    { id: "json-rules", x: 2.9, y: 4.3, z: 0, h: 18, dy: 16 },
    { id: "permissions", x: 4.9, y: 4.3, z: 0, dx: 18, dy: 14 },
    { id: "transitions", x: 5.2, y: 1.7, z: 0, dx: 34, dy: 10 },
    { id: "rules-builder", x: 2.6, y: 1.5, z: 0, dy: 14, dx: -10 },
    { id: "template", x: 0.4, y: 3.4, z: Z.template, s: 1.2, h: 22, sub: "The whole SaaS app", dy: 14, dx: -70 },
    { id: "atlas", x: 9.9, y: -0.1, z: Z.dx, dy: 14 },
    { id: "gloss", x: 11.6, y: -0.1, z: Z.dx, dy: 14 },
    { id: "config", x: 10.3, y: 1.4, z: Z.dx, dy: 26, dx: -20 },
    { id: "worktrees", x: 10.2, y: 2.4, z: Z.dx, s: 0.45, h: 7, bare: true },
    { id: "init", x: 11.0, y: 2.4, z: Z.dx, s: 0.45, h: 7, bare: true },
    { id: "ci-rules", x: 11.8, y: 2.4, z: Z.dx, s: 0.45, h: 7, bare: true },
    // Agentic
    { id: "oracle", x: 1.6, y: 0.4, z: Z.agentic, dy: 14 },
    { id: "bench", x: 3.8, y: 0.5, z: Z.agentic, dy: 14 },
    { id: "agent-session", x: 0.8, y: 2.6, z: Z.agentic, dy: 18, dx: -26 },
    { id: "foundry", x: 2.4, y: 3.6, z: Z.agentic, s: 1.1, h: 22, dy: 18, dx: 8 },
    { id: "kcp", x: 4.6, y: 2.2, z: Z.agentic, dy: 18 },
    { id: "archive", x: 4.0, y: 4.3, z: Z.agentic, dy: 14 },
    { id: "signet", x: 5.8, y: 3.6, z: Z.agentic, dy: 16 },
    { id: "kingdom", x: 7.3, y: 2.3, z: Z.agentic, s: 1.3, h: 44, sub: "The permission hub", dy: 44, dx: 34 },
    { id: "artifactory", x: 8.6, y: 0.5, z: Z.agentic, dy: 14, dx: 26 },
    // Governance
    // The project is the goal; the whitepaper (why) feeds into it.
    { id: "whitepaper", x: 3.7, y: 2.9, z: Z.governance, s: 0.8, h: 12, dx: 4, dy: 30 },
    { id: "project", x: 5.9, y: 2.0, z: Z.governance, s: 1.7, h: 34, sub: "The goal, planned", dy: 18, dx: 64 },
    // Livestock uses the platform: it floats on its own small plate above governance.
    { id: "livestock", x: lsPlate.x + 0.5, y: lsPlate.y + 0.45, z: lsPlate.z, s: 0.6, h: 12 },
  ];
  const ids = places.map((p) => p.id);
  const es = allEdges.filter((e) => ids.includes(e.base) && ids.includes(e.user));
  const { pl, topOf, beam, trace, placeChips } = isoKit(places);

  const baseTraces = [
    trace("prisma-map", "json-rules", Z.base, "uses"),
    trace("json-rules", "permissions", Z.base, "uses"),
    trace("json-rules", "rules-builder", Z.base, "uses", true),
    trace("json-rules", "transitions", Z.base, "uses", true),
    trace("permissions", "transitions", Z.base, "uses", true),
  ];
  // The libraries hold the template layer up, each on a post to its underside.
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  // What template will adopt next (transitions, gloss) is shown only on the technical graph.
  const posts = ["prisma-map", "json-rules", "permissions", "rules-builder"].map((id) => {
    const p = pl[id];
    const [ax, ay] = topOf(id);
    const [bx, by] = iso(clamp(p.x, tpl.x + 0.4, tpl.x + tpl.w - 0.4), clamp(p.y, tpl.y + 0.4, tpl.y + tpl.d - 0.4), Z.template - tpl.t);
    const lift = (ay - by) * 0.5;
    return edgeOf(id, "template", "uses", `M ${ax} ${ay} C ${ax} ${ay - lift} ${bx} ${by + lift} ${bx} ${by}`, true);
  });
  const govTraces = [trace("whitepaper", "project", Z.governance, "runs")];
  const agenticTraces = [
    trace("kingdom", "foundry", Z.agentic, "runs", true),
    trace("kingdom", "archive", Z.agentic),
    trace("kingdom", "kcp", Z.agentic, "runs", true),
    trace("kingdom", "artifactory", Z.agentic, "runs", true),
    trace("foundry", "agent-session", Z.agentic),
    trace("foundry", "oracle", Z.agentic, "runs", true),
  ];
  const beams = [beam("json-rules", "signet"), beam("permissions", "kingdom"), beam("json-rules", "foundry")];
  const dxBeams = [
    beam("json-rules", "atlas"),
    ...["worktrees", "init", "ci-rules"].map((id) => edgeOf(id, "template", "uses", "")),
  ];

  const label = plateLabel;
  const trio = (): Prim[] => {
    const [tx, ty] = iso(dx.x + dx.w, dx.y + dx.d, Z.dx - dx.t);
    return [
      { t: "text", x: tx + 10, y: ty + 70, s: "worktrees, init and CI rules", c: "micro-label", a: "middle" },
      { t: "text", x: tx + 10, y: ty + 84, s: "come with template", c: "micro-label", a: "middle" },
    ];
  };
  const labelRight = plateLabelRight;
  placeChips([
    ...label(base, "amber", "Building blocks", "The libraries template is made of"),
    ...label(agentic, "lime", "Agentic", "Agents that work like you do"),
    ...label(gov, "violet", "Governance", "Cooperation at scale"),
    ...labelRight(dx, "teal", "Developer experience", "Tools that help you work"),
    ...trio(),
  ], ["kingdom", "foundry", "project", "template"]);
  const nodesIn = (tier: string, z?: number) =>
    places
      .filter((p) => byId.get(p.id)?.tier === tier && (z === undefined || p.z === z))
      .sort((a, b) => a.z - b.z || a.x + a.y - (b.x + b.y))
      .map((p) => ({ node: isoNode(p, es) }));

  const layers: Layer[] = [
    { c: "tier", tier: "building-blocks", items: [...plate(base), ...label(base, "amber", "Building blocks", "The libraries template is made of")] },
    { c: "edges", tier: "building-blocks", items: baseTraces.map((edge) => ({ edge })) },
    { c: "nodes", tier: "building-blocks", items: nodesIn("building-blocks", 0) },
    { c: "edges", tier: "building-blocks", items: posts.map((edge) => ({ edge })) },
    { c: "tier", tier: "building-blocks", items: plate(tpl) },
    { c: "nodes", tier: "building-blocks", items: nodesIn("building-blocks", Z.template) },
    { c: "edges", items: beams.map((edge) => ({ edge })) },
    { c: "tier", tier: "developer-experience", items: [...plate(dx), ...labelRight(dx, "teal", "Developer experience", "Tools that help you work"), ...trio()] },
    { c: "nodes", tier: "developer-experience", items: nodesIn("developer-experience") },
    { c: "edges", items: dxBeams.map((edge) => ({ edge })) },
    { c: "tier", tier: "agentic", items: [...plate(agentic), ...label(agentic, "lime", "Agentic", "Agents that work like you do")] },
    { c: "edges", tier: "agentic", items: agenticTraces.map((edge) => ({ edge })) },
    { c: "nodes", tier: "agentic", items: nodesIn("agentic") },
    { c: "tier", tier: "governance", items: [...plate(gov), ...label(gov, "violet", "Governance", "Cooperation at scale")] },
    { c: "edges", tier: "governance", items: govTraces.map((edge) => ({ edge })) },
    { c: "nodes", tier: "governance", items: nodesIn("governance", Z.governance) },
    { c: "edges", tier: "governance", items: [{ edge: beam("project", "livestock", "runs") }] },
    { c: "tier", tier: "governance", items: plate(lsPlate) },
    { c: "nodes", tier: "governance", items: nodesIn("governance", lsPlate.z) },
  ];
  return {
    view: "whole",
    title: "The whole picture",
    desc:
      "Three tiers. At the base, the template layer: the whole SaaS app, made of the building blocks prisma-map, json-rules, permissions, transitions and rules-builder; beside it, developer experience: atlas, gloss and config, with the worktrees, init and CI rules that come with template. " +
      "Above them, the agentic tools: Foundry, agent-session, Archive, KCP, Signet, Kingdom (the permission hub), Oracle, bench, and Artifactory (planned). " +
      "At the top, governance: the Inixiative project (planned), a time-series governance platform with tokenization and the goal, which the whitepaper explains and feeds into; Livestock (planned, closed source) sits just above it, a product that uses the platform.",
    box: fitBox(layers),
    layers,
  };
};

/* ------------------------------------------------------------------------------------------------ */
/* Foundry and Kingdom (/agentic): how a request runs through Foundry on your machine, and how Kingdom holds the
   keys to everything outside it. Same blocks, plates and label shape as the whole picture, read in numbered steps. */

const foundryKingdomScene = (): Scene => {
  // Laid out on a grid, then spread by G so the labels have room around the blocks.
  const G = 1.25;
  const g = (v: number) => Math.round(v * G * 100) / 100;
  const spec = (p: PlateSpec): PlateSpec => ({ ...p, x: g(p.x), y: g(p.y), w: g(p.w), d: g(p.d) });
  const machine = spec({ x: 0, y: 0, w: 8, d: 6.2, z: 0, t: 12, c: "plate tone-lime" });
  const hosted = spec({ x: 9.6, y: 0, w: 5.8, d: 6.2, z: 0, t: 12, c: "plate plate-light tone-slate" });
  const loop = spec({ x: 0.3, y: 0.2, w: 2.6, d: 1.9, z: 210, t: 8, c: "plate plate-light tone-slate" });
  const F = 16; // Foundry's top: your agent and the Wardens stand on it.
  const raw: IsoPlace[] = [
    { id: "foundry", x: 3.4, y: 2.7, z: 0, s: 4.4, sd: 3.4, h: F, line: "The workspace around your agent" },
    { id: "agent", x: 3.5, y: 3.2, z: F, s: 0.9, h: 30, step: 1, line: "You ask. Your agent decides." },
    { id: "wardens", x: 4.7, y: 1.9, z: F, s: 0.5, h: 11, step: 2, line: "Notice what your request touches", copies: [[-1.3, -0.1], [-2.6, 0.2], [-2.7, 1.6], [0.3, 1.5]] },
    { id: "codebase", x: 6.9, y: 1.1, z: 0, s: 1.1, h: 26, step: 3, line: "What Wardens remind your agent of" },
    { id: "template", x: 3.8, y: 5.6, z: 0, s: 0.7, h: 12, line: "Comes with its Wardens built" },
    { id: "archive", x: 1.4, y: 5.4, z: 0, h: 16, step: 4, line: "Keeps every session" },
    { id: "kcp", x: 6.4, y: 5.5, z: 0, s: 0.7, h: 14, line: "Your command-line tools, via Kingdom" },
    { id: "oracle", x: 1.6, y: 1.15, z: loop.z, h: 18, step: 5, line: "Checks fixes stick, proposes changes" },
    { id: "signet", x: 10.4, y: 2.6, z: 0, s: 0.6, h: 12, line: "A pass you can take back" },
    { id: "kingdom", x: 12.4, y: 2.6, z: 0, s: 1.3, h: 50, line: "Your accounts, and who may use them" },
    { id: "integrations", x: 14.5, y: 1.0, z: 0, line: "GitHub, Slack, Linear" },
    { id: "teammates", x: 14.5, y: 4.2, z: 0, line: "Them and their agents" },
    { id: "artifactory", x: 12.7, y: 5.3, z: 0, s: 0.7, h: 12, tone: "lime", line: "Share what agents make" },
  ];
  const places = raw.map((p) => ({
    ...p,
    x: g(p.x),
    y: g(p.y),
    s: g(p.s ?? 0.8),
    sd: p.sd === undefined ? undefined : g(p.sd),
    copies: p.copies?.map(([cx, cy]): Pt => [g(cx), g(cy)]),
  }));
  const ids = places.map((p) => p.id);
  const es = allEdges.filter((e) => ids.includes(e.base) && ids.includes(e.user));
  const { pl, topOf, footOf, placeChips } = isoKit(places);
  const lines: Pt[] = [];
  /** A trace painted on a plate through grid points (unspread). */
  const flat = (pts: Pt[], z: number) => {
    const sp = pts.map(([x, y]) => iso(g(x), g(y), z));
    for (let i = 1; i < sp.length; i++) for (let t = 0; t <= 1; t += 0.05) lines.push([sp[i - 1][0] + (sp[i][0] - sp[i - 1][0]) * t, sp[i - 1][1] + (sp[i][1] - sp[i - 1][1]) * t]);
    return route(sp, 8);
  };
  const curve = ([ax, ay]: Pt, [bx, by]: Pt, k = 0.45) => {
    const lift = (ay - by) * k;
    const c1: Pt = [ax, ay - lift];
    const c2: Pt = [bx, by + lift];
    for (let t = 0; t <= 1; t += 0.025) {
      const u = 1 - t;
      lines.push([u * u * u * ax + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * bx, u * u * u * ay + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * by]);
    }
    return `M ${ax} ${ay} C ${c1.join(" ")} ${c2.join(" ")} ${bx} ${by}`;
  };
  const at = (id: string, dx: number, dy: number, z: number) => iso(pl[id].x + g(dx), pl[id].y + g(dy), z);
  const K0 = raw.find((p) => p.id === "kingdom")!;
  const kcp0 = raw.find((p) => p.id === "kcp")!;
  const tm0 = raw.find((p) => p.id === "teammates")!;
  const in0 = raw.find((p) => p.id === "integrations")!;
  const ar0 = raw.find((p) => p.id === "artifactory")!;

  // How a request runs, on your machine: the Wardens reach your agent from all around it.
  const w = pl.wardens;
  const spokes = [[0, 0] as Pt, ...(w.copies ?? [])]
    .map(([ox, oy]) => `M ${iso(w.x + ox, w.y + oy, F + 5).join(" ")} L ${at("agent", 0, 0, F + 14).join(" ")}`)
    .join(" ");
  const ground = [
    edgeOf("foundry", "archive", "runs", flat([[1.4, 4.4], [1.4, 5.0]], 0)),
    // Kingdom: everything that leaves your machine goes through a Signet.
    edgeOf("kingdom", "foundry", "runs", flat([[K0.x, K0.y], [5.6, K0.y]], 0)),
    edgeOf("kingdom", "kcp", "runs", flat([[K0.x - 0.5, K0.y], [K0.x - 0.5, kcp0.y], [kcp0.x, kcp0.y]], 0)),
    edgeOf("kingdom", "teammates", "runs", flat([[K0.x, K0.y + 0.4], [tm0.x - 0.9, K0.y + 0.4], [tm0.x - 0.9, tm0.y], [tm0.x, tm0.y]], 0)),
    edgeOf("integrations", "kingdom", "runs", flat([[in0.x, in0.y], [K0.x, in0.y], [K0.x, K0.y]], 0)),
    edgeOf("kingdom", "artifactory", "runs", flat([[K0.x + 0.3, K0.y], [K0.x + 0.3, ar0.y], [ar0.x, ar0.y]], 0)),
    // The Signet is the pass on each of those lines: hovering it lights what it opens.
    ...["foundry", "kcp", "kingdom"].map((u) => edgeOf("signet", u, "uses", "")),
    edgeOf("foundry", "agent", "runs", ""),
  ];
  const [ox, oy] = footOf("oracle");
  const raised = [
    edgeOf("codebase", "wardens", "runs", curve(topOf("codebase"), at("wardens", 0.25, 0, F + 11), 0.3), true),
    edgeOf("template", "wardens", "runs", curve(topOf("template"), at("wardens", -2.7, 1.6, F + 11), 0.3), true),
    // The loop: Archive keeps the session, Oracle checks whether a correction stuck and tunes the Wardens.
    edgeOf("archive", "oracle", "runs", curve(topOf("archive"), [ox - 30, oy + 12], 0.55), true),
    edgeOf("oracle", "wardens", "runs", curve([ox + 34, oy + 10], at("wardens", -2.6, 0.2, F + 11), -0.4), true),
  ];

  const machineLabel = plateLabel(machine, "lime", "On your machine", "Your agent, on your own subscription");
  const [hx, hy] = iso(hosted.x + hosted.w, hosted.y + hosted.d, 0);
  const hostedLabel: Prim[] = [
    { t: "text", x: hx + 24, y: hy - 4, s: "Hosted", c: "tier-label tone-slate" },
    { t: "text", x: hx + 24, y: hy + 14, s: "Kingdom holds the keys", c: "tier-line" },
  ];
  const loopLabel = plateLabel(loop, "slate", "Learning from corrections", "Closed source");
  placeChips([...machineLabel, ...hostedLabel, ...loopLabel], ["agent", "wardens", "codebase", "archive", "oracle", "kingdom", "foundry"], {
    own: ["foundry", "codebase", "kingdom", "kcp", "signet"],
    lines,
  });
  const node = (id: string) => ({ node: isoNode(pl[id], es) });
  const layers: Layer[] = [
    { c: "tier", tier: "hosted", items: [...plate(hosted), ...hostedLabel] },
    { c: "tier", tier: "agentic", items: [...plate(machine), ...machineLabel] },
    { c: "edges", items: ground.map((edge) => ({ edge })) },
    { c: "nodes", tier: "hosted", items: ["integrations", "signet", "kingdom", "artifactory", "teammates"].map(node) },
    { c: "nodes", tier: "agentic", items: ["codebase", "foundry", "template", "kcp", "archive"].map(node) },
    { c: "edges", items: [{ edge: edgeOf("wardens", "agent", "runs", spokes) }] },
    { c: "edges", items: raised.map((edge) => ({ edge })) },
    { c: "nodes", tier: "agentic", items: ["wardens", "agent"].map(node) },
    { c: "tier", tier: "loop", items: [...plate(loop), ...loopLabel] },
    { c: "nodes", tier: "loop", items: ["oracle"].map(node) },
  ];
  return {
    view: "foundry-kingdom",
    title: "How Foundry works, and where Kingdom fits",
    desc:
      "On your machine, your agent (Claude Code or Codex) runs inside Foundry on your own subscription. 1: you ask your agent. 2: Wardens, small expert agents built from your docs (under construction: they come built in repos made from template, and building them for any repo is in progress), " +
      "notice what the request touches. 3: they remind your agent of what your project already has, and where it's written down; your agent decides what to use. " +
      "Then the loop that learns: 4: Archive keeps every session. 5: Oracle (closed source) checks whether a correction stuck, and proposes changes to the docs and Wardens. " +
      "A codebase built from template comes with its Wardens built. Hosted: Kingdom (closed source, under construction) holds your accounts, such as GitHub, Slack and Linear, " +
      "and anything that uses them goes through a Signet, a pass the owner can take back: Foundry pairs with Kingdom on one, teammates and their agents come in on one, " +
      "and KCP (under construction) will run your command-line tools through Kingdom. Artifactory, for sharing what agents make, is planned.",
    box: fitBox(layers, 14),
    layers,
  };
};

export type View = "whole" | "blocks" | "vocabulary" | "agentic" | "foundry-kingdom";

export const sceneFor = (view: View): Scene =>
  view === "whole"
    ? wholeScene()
    : view === "agentic"
      ? agenticScene()
      : view === "foundry-kingdom"
        ? foundryKingdomScene()
        : librariesScene(view);

/** The relations a view draws, for the text alternative and the stacked small-screen layout. */
export const relationsFor = (scene: Scene) => {
  const nodes: SceneNode[] = [];
  const edges: SceneEdge[] = [];
  for (const l of scene.layers)
    for (const it of l.items) {
      if ("node" in it) nodes.push(it.node);
      if ("edge" in it) edges.push(it.edge);
    }
  return { nodes, edges };
};
