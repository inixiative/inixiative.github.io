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
            ? "slate"
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
  if (n.state === "progress") parts.push("In progress.");
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
  return { base, user, kind, signet: e.signet, next: e.next, structural: e.structural, why: e.why, d, cross };
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
  const line = p.line ?? n.line;
  const nameY = line ? p.y + h / 2 - (big ? 6 : 3) : p.y + h / 2 + 5;
  if (p.w < 100) prims.push({ t: "text", x: p.x + p.w / 2, y: nameY - 1, s: n.label, c: "name name-small", a: "middle" });
  else prims.push({ t: "text", x: tx, y: nameY, s: n.label, c: big ? "name name-big" : "name" });
  if (line) prims.push({ t: "text", x: tx, y: nameY + (big ? 22 : 18), s: line, c: "line" });
  const flag = n.state === "planned" ? "planned" : n.state === "progress" ? "in progress" : n.licence === "closed" ? "closed" : "";
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
    groupLabel(834, rowY(0) + H + 36, "Developer experience", "group-label tone-slate"),
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
    oracle: { id: "oracle", x: 24, y: 0, w: 280, line: "Measures whether a correction stuck" },
    bench: { id: "bench", x: 328, y: 0, w: 230, line: "A challenge set for coding agents" },
    foundry: { id: "foundry", x: 24, y: 150, w: 424, h: 84 },
    "agent-session": { id: "agent-session", x: 24, y: 300, w: 200, line: "Runs Claude Code and Codex" },
    archive: { id: "archive", x: 248, y: 300, w: 200 },
    kcp: { id: "kcp", x: 24, y: 432, w: 200, line: "CLIs through Kingdom" },
    kingdom: { id: "kingdom", x: 560, y: 196, w: 250, h: 110, line: "The permission hub" },
    signet: { id: "signet", x: 580, y: 410, w: 210, line: "A pass the owner can take back" },
    integrations: { id: "integrations", x: 920, y: 150, w: 250 },
    teammates: { id: "teammates", x: 920, y: 300, w: 250 },
    artifactory: { id: "artifactory", x: 920, y: 432, w: 250 },
    config: { id: "config", x: 24, y: 610, w: 130, h: 46 },
    gloss: { id: "gloss", x: 172, y: 610, w: 130, h: 46 },
    "json-rules": { id: "json-rules", x: 320, y: 610, w: 150, h: 46 },
    "prisma-map": { id: "prisma-map", x: 520, y: 610, w: 150, h: 46 },
    permissions: { id: "permissions", x: 688, y: 610, w: 160, h: 46 },
    "rules-builder": { id: "rules-builder", x: 866, y: 610, w: 170, h: 46 },
  };
  for (const id of ["config", "gloss", "json-rules", "prisma-map", "permissions", "rules-builder"]) P[id].line = "";
  P.teammates.line = "Through a Signet the owner gives";
  P.artifactory.line = "Signs in with Kingdom";
  P.integrations.line = "GitHub, Slack, Linear, Google";
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
      "KCP will run your CLIs through Kingdom (in progress). Oracle measures and tunes Foundry. Artifactory is planned.",
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
  kcp: "M5 7 L10 12 L5 17 M12 17 H19",
  signet: "M12 4 A8 8 0 1 1 11.99 4 Z M12 8 V16 M8 12 H16",
  oracle: "M3 12 Q12 4 21 12 Q12 20 3 12 Z M12 9 A3 3 0 1 1 11.99 9 Z",
  bench: "M6 19 V13 M10 19 V8 M14 19 V11 M18 19 V5",
  whitepaper: "M6 3 H15 L19 7 V21 H6 Z M9 10 H16 M9 13.5 H16 M9 17 H13",
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

type IsoPlace = { id: string; x: number; y: number; z: number; s?: number; h?: number; sub?: string; dy?: number; dx?: number; bare?: boolean };

const isoNode = (p: IsoPlace, es: StackEdge[]): SceneNode => {
  const n = byId.get(p.id);
  if (!n) throw new Error(`map: unknown node ${p.id}`);
  const s = (p.s ?? 0.8) / 2;
  const h = p.h ?? 14;
  const { x, y, z } = p;
  const prims: Prim[] = [
    { t: "poly", c: "face-side", pts: [iso(x - s, y + s, z + h), iso(x + s, y + s, z + h), iso(x + s, y + s, z), iso(x - s, y + s, z)] },
    { t: "poly", c: "face-front", pts: [iso(x + s, y - s, z + h), iso(x + s, y + s, z + h), iso(x + s, y + s, z), iso(x + s, y - s, z)] },
    { t: "poly", c: "face-top", pts: [iso(x - s, y - s, z + h), iso(x + s, y - s, z + h), iso(x + s, y + s, z + h), iso(x - s, y + s, z + h)] },
  ];
  const mark = onTop(n.id, x, y, z + h, s);
  if (mark) prims.push(mark);
  const [ax, ay] = iso(x, y, z + h);
  if (p.bare) return { id: n.id, label: n.label, href: n.href, aria: ariaFor(n, es), tier: n.tier, look: look(n), prims };
  const size = n.id === "kingdom" || n.id === "foundry" || n.id === "template" ? 15 : 13;
  const crest = n.id === "kingdom";
  const flag = n.state === "progress";
  const tw = textWidth(n.label, size, true) + (crest ? 18 : 0) + (flag ? 12 : 0);
  const cw = Math.max(tw, p.sub ? textWidth(p.sub, 11) + 4 : 0) + 20;
  const ch = p.sub ? 38 : 24;
  const cx = ax + (p.dx ?? 0);
  const cy = ay - (p.dy ?? 22) - ch;
  prims.push({ t: "path", c: "leader", d: `M ${ax} ${ay} L ${cx} ${cy + ch}` });
  prims.push({ t: "rect", c: "chip", x: cx - cw / 2, y: cy, w: cw, h: ch, r: 6 });
  let tx = cx - cw / 2 + 10;
  if (crest) {
    prims.push({ t: "crest", c: "crest", x: tx, y: cy + 5, size: 13 });
    tx += 18;
  }
  prims.push({ t: "text", c: size > 14 ? "name name-chip name-big" : "name name-chip", x: tx, y: cy + 16.5, s: n.label });
  if (flag) prims.push({ t: "rect", c: "progress-dot", x: cx + cw / 2 - 16, y: cy + 9, w: 6, h: 6, r: 3 });
  if (p.sub) prims.push({ t: "text", c: "line line-chip", x: cx - cw / 2 + 10, y: cy + 31, s: p.sub });
  return { id: n.id, label: n.label, href: n.href, aria: ariaFor(n, es), tier: n.tier, look: `${look(n)}${n.id === "kingdom" ? " is-focal" : ""}`, prims };
};

const wholeScene = (): Scene => {
  const Z = { base: 0, shelf: 104, dx: 64, agentic: 280, governance: 500 };
  const base: PlateSpec = { x: 0, y: 0, w: 7.2, d: 5, z: Z.base, t: 12, c: "plate tone-amber" };
  const shelf: PlateSpec = { x: 0.4, y: 0.9, w: 6.2, d: 3.9, z: Z.shelf, t: 3, c: "plate plate-shelf tone-amber" };
  const agentic: PlateSpec = { x: 0, y: 0, w: 9.4, d: 4.8, z: Z.agentic, t: 12, c: "plate tone-lime" };
  const gov: PlateSpec = { x: 2.8, y: 1.0, w: 4.4, d: 2.6, z: Z.governance, t: 12, c: "plate tone-violet" };
  const dx: PlateSpec = { x: 9.2, y: -0.8, w: 3.2, d: 3.8, z: Z.dx, t: 8, c: "plate plate-light tone-slate" };

  const places: IsoPlace[] = [
    // Libraries under the template shelf, from the base up. Tooling beside them.
    { id: "prisma-map", x: 0.9, y: 4.3, z: 0, h: 10, dx: -26 },
    { id: "json-rules", x: 2.9, y: 4.3, z: 0, h: 18, dy: 16 },
    { id: "permissions", x: 4.9, y: 4.3, z: 0, dx: 18, dy: 14 },
    { id: "transitions", x: 5.2, y: 1.7, z: 0, dx: 34, dy: 10 },
    { id: "rules-builder", x: 2.6, y: 1.5, z: 0, dy: 14, dx: -10 },
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
    { id: "whitepaper", x: 4.0, y: 2.5, z: Z.governance, s: 1, h: 18 },
    { id: "project", x: 6.0, y: 1.9, z: Z.governance, s: 1, h: 18, dy: 10, dx: 74 },
  ];
  const ids = places.map((p) => p.id);
  const es = allEdges.filter((e) => ids.includes(e.base) && ids.includes(e.user));
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

  // template is the shelf itself, resting on posts from the libraries under it.
  const templateNode = (): SceneNode => {
    const n = byId.get("template")!;
    const prims = plate({ ...shelf, c: "face-shelf" });
    const [lx, ly] = iso(shelf.x, shelf.y + shelf.d, shelf.z);
    const label = n.label;
    const cw = Math.max(textWidth(label, 15, true) + 14, textWidth("The whole SaaS app", 11) + 4) + 20;
    const cx = lx - 40 - cw;
    const cy = ly - 62;
    prims.push({ t: "path", c: "leader", d: `M ${lx} ${ly} L ${cx + cw} ${cy + 19}` });
    prims.push({ t: "rect", c: "chip", x: cx, y: cy, w: cw, h: 38, r: 6 });
    prims.push({ t: "text", c: "name name-chip name-big", x: cx + 10, y: cy + 16.5, s: label });
    prims.push({ t: "rect", c: "progress-dot", x: cx + cw - 16, y: cy + 9, w: 6, h: 6, r: 3 });
    prims.push({ t: "text", c: "line line-chip", x: cx + 10, y: cy + 31, s: "The whole SaaS app" });
    return { id: "template", label, href: n.href, aria: ariaFor(n, allEdges.filter((e) => e.user === "template" || e.base === "template")), tier: "building-blocks", look: look(n), prims };
  };
  const baseTraces = [
    trace("prisma-map", "json-rules", Z.base, "uses"),
    trace("json-rules", "permissions", Z.base, "uses"),
    trace("json-rules", "rules-builder", Z.base, "uses", true),
    trace("json-rules", "transitions", Z.base, "uses", true),
    trace("permissions", "transitions", Z.base, "uses", true),
  ];
  const posts = ["prisma-map", "json-rules", "permissions", "rules-builder", "transitions"].map((id) => {
    const p = pl[id];
    const [ax, ay] = topOf(id);
    const [, ty] = iso(p.x, p.y, Z.shelf);
    return edgeOf(id, "template", "uses", `M ${ax} ${ay} L ${ax} ${ty}`, true);
  });
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

  const label = (spec: PlateSpec, tier: string, text: string, line: string): Prim[] => {
    const [lx, ly] = iso(spec.x, spec.y + spec.d, spec.z);
    return [
      { t: "text", x: lx - 18, y: ly - 4, s: text, c: `tier-label tone-${tier}`, a: "end" },
      { t: "text", x: lx - 18, y: ly + 14, s: line, c: "tier-line", a: "end" },
    ];
  };
  const trio = (): Prim[] => {
    const [tx, ty] = iso(dx.x + dx.w, dx.y + dx.d, Z.dx - dx.t);
    return [
      { t: "text", x: tx + 10, y: ty + 70, s: "worktrees, init and CI rules", c: "micro-label", a: "middle" },
      { t: "text", x: tx + 10, y: ty + 84, s: "come with template", c: "micro-label", a: "middle" },
    ];
  };
  const labelRight = (spec: PlateSpec, tier: string, text: string, line: string): Prim[] => {
    const [lx, ly] = iso(spec.x + spec.w, spec.y + spec.d, spec.z - spec.t);
    return [
      { t: "text", x: lx + 10, y: ly + 34, s: text, c: `tier-label tone-${tier}`, a: "middle" },
      { t: "text", x: lx + 10, y: ly + 52, s: line, c: "tier-line", a: "middle" },
    ];
  };
  const nodesIn = (tier: string, z?: number) =>
    places
      .filter((p) => byId.get(p.id)?.tier === tier && (z === undefined || p.z === z))
      .sort((a, b) => a.x + a.y - (b.x + b.y))
      .map((p) => ({ node: isoNode(p, es) }));

  const layers: Layer[] = [
    { c: "tier", tier: "building-blocks", items: [...plate(base), ...label(base, "amber", "Building blocks", "Libraries and the template")] },
    { c: "edges", tier: "building-blocks", items: baseTraces.map((edge) => ({ edge })) },
    { c: "nodes", tier: "building-blocks", items: nodesIn("building-blocks", 0) },
    { c: "edges", tier: "building-blocks", items: posts.map((edge) => ({ edge })) },
    { c: "nodes", tier: "building-blocks", items: [{ node: templateNode() }] },
    { c: "edges", items: beams.map((edge) => ({ edge })) },
    { c: "tier", tier: "developer-experience", items: [...plate(dx), ...labelRight(dx, "slate", "Developer experience", "Tools that help you work"), ...trio()] },
    { c: "nodes", tier: "developer-experience", items: nodesIn("developer-experience") },
    { c: "edges", items: dxBeams.map((edge) => ({ edge })) },
    { c: "tier", tier: "agentic", items: [...plate(agentic), ...label(agentic, "lime", "Agentic", "Agents that work like you do")] },
    { c: "edges", tier: "agentic", items: agenticTraces.map((edge) => ({ edge })) },
    { c: "nodes", tier: "agentic", items: nodesIn("agentic") },
    { c: "tier", tier: "governance", items: [...plate(gov), ...label(gov, "violet", "Governance", "Cooperation at scale")] },
    { c: "nodes", tier: "governance", items: nodesIn("governance") },
  ];
  // Fit the view box to what is drawn.
  const xs: number[] = [];
  const ys: number[] = [];
  for (const l of layers)
    for (const it of l.items) {
      const prims = "node" in it ? it.node.prims : "edge" in it ? [] : [it];
      for (const p of prims) {
        if (p.t === "poly") for (const [px, py] of p.pts) (xs.push(px), ys.push(py));
        if (p.t === "rect") (xs.push(p.x, p.x + p.w), ys.push(p.y, p.y + p.h));
        if (p.t === "text") {
          const size = p.c.includes("tier-label") ? 17 : p.c.includes("tier-line") ? 12 : 13;
          const w = textWidth(p.s, size, size > 13);
          xs.push(p.a === "end" ? p.x - w : p.a === "middle" ? p.x + w / 2 : p.x + w);
          ys.push(p.y - size, p.y + 4);
        }
      }
    }
  const pad = 10;
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  return {
    view: "whole",
    title: "The whole picture",
    desc:
      "Three tiers. At the base, the building blocks: prisma-map, json-rules, permissions, transitions and rules-builder, with atlas, gloss and config as developer tooling, and the template built on top of the libraries. " +
      "Above them, the agentic tools: Foundry, agent-session, Archive, KCP, Signet, Kingdom (the permission hub), Oracle, bench, and Artifactory (planned). " +
      "At the top, governance: the whitepaper and the Inixiative project (planned).",
    box: [Math.floor(minX), Math.floor(minY), Math.ceil(Math.max(...xs) + pad - minX), Math.ceil(Math.max(...ys) + pad - minY)],
    layers,
  };
};

export type View = "whole" | "blocks" | "vocabulary" | "agentic";

export const sceneFor = (view: View): Scene =>
  view === "whole" ? wholeScene() : view === "agentic" ? agenticScene() : librariesScene(view);

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
