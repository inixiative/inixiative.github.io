// What inixiative is made of and how the pieces relate: the one source every map view draws from.
// Edges are facts, checked on 2026-11-02 against each repo's origin/main (package.json dependencies and
// peer dependencies) and, for runtime relations, the decisions in ~/code/inixiative/CLAUDE.md.
// prisma-map's map shape is read by json-rules (FieldMap) and permissions (schemaMap); Aron (11-02):
// prisma-map is the base of the stack. json-rules and permissions read its map shape rather than importing it,
// so those two edges are structural. config is every package's toolchain (a devDependency).

export type Tier = "building-blocks" | "developer-experience" | "agentic" | "governance";
export type Group = "libraries" | "tooling" | "template-tooling" | "template" | "machine" | "hub" | "outside" | "loop" | "governance";
export type Licence = "MIT" | "BSL 1.1" | "closed" | "none";

export type StackNode = {
  id: string;
  label: string;
  tier: Tier;
  group: Group;
  licence: Licence;
  state?: "planned" | "progress";
  /** "signet" draws in pink, "shared" in blue: the meanings they carry in the products. */
  tone?: "signet" | "shared";
  line: string;
  href?: string;
  /** The label shape used everywhere: the repo or package name as a small tag, then a short plain description. */
  tag?: string;
  short?: string;
};

/** `base` is built on or reached by `user`. "uses": a package dependency. "runs": how they work together. */
export type StackEdge = {
  base: string;
  user: string;
  kind: "uses" | "runs";
  signet?: boolean;
  /** Reads the base's shape without depending on the package (prisma-map's map): drawn as a structural line. */
  structural?: boolean;
  /** Planned or not built yet: drawn dashed. */
  next?: boolean;
  why: string;
};

export const tiers: { id: Tier; label: string; line: string; href: string }[] = [
  { id: "building-blocks", label: "Building blocks", line: "Open libraries, and the template built from them", href: "/building-blocks/" },
  { id: "developer-experience", label: "Developer experience", line: "Tools that help you work, without changing your code", href: "/building-blocks/#developer-experience" },
  { id: "agentic", label: "Agentic", line: "Tools that keep agents working the way you do", href: "/agentic/" },
  { id: "governance", label: "Governance", line: "Designs for cooperation at scale", href: "/governance/" },
];

export const nodes: StackNode[] = [
  // Building blocks, in Aron's order: prisma-map at the base.
  { id: "prisma-map", label: "prisma-map", tier: "building-blocks", group: "libraries", licence: "MIT", line: "Your Prisma schema, readable at runtime", href: "/building-blocks/#prisma-map" },
  { id: "json-rules", label: "json-rules", tier: "building-blocks", group: "libraries", licence: "MIT", line: "One rule that runs in memory, in Prisma and in SQL", href: "/building-blocks/#json-rules" },
  { id: "permissions", label: "permissions", tier: "building-blocks", group: "libraries", licence: "MIT", line: "RBAC, ABAC and ReBAC on your own records", href: "/building-blocks/#permissions" },
  { id: "transitions", label: "transitions", tier: "building-blocks", group: "libraries", licence: "MIT", line: "Declarative lifecycles", href: "/building-blocks/#transitions" },
  { id: "rules-builder", label: "rules-builder", tier: "building-blocks", group: "libraries", licence: "MIT", line: "A headless rule builder", href: "/building-blocks/#rules-builder" },
  { id: "atlas", label: "atlas", tier: "developer-experience", group: "tooling", licence: "MIT", line: "A map of your code", href: "/building-blocks/#atlas" },
  { id: "gloss", label: "gloss", tier: "developer-experience", group: "tooling", licence: "MIT", line: "Explanations kept out of the source", href: "/building-blocks/#gloss" },
  { id: "config", label: "config", tier: "developer-experience", group: "tooling", licence: "MIT", line: "The shared toolchain and theme", href: "/building-blocks/#config" },
  { id: "worktrees", label: "worktrees", tier: "developer-experience", group: "template-tooling", licence: "MIT", line: "A worktree per task, with its own database and ports", href: "/building-blocks/#worktrees" },
  { id: "init", label: "init", tier: "developer-experience", group: "template-tooling", licence: "MIT", line: "Sets up hosting, database and secrets for a new project", href: "/building-blocks/#init" },
  { id: "ci-rules", label: "CI rules", tier: "developer-experience", group: "template-tooling", licence: "MIT", line: "Checks that hold the codebase to its own conventions", href: "/building-blocks/#ci-rules" },
  { id: "template", label: "template", tier: "building-blocks", group: "template", licence: "MIT", state: "progress", line: "The whole SaaS app, built from the libraries", href: "/building-blocks/#template" },

  // Agentic
  { id: "foundry", label: "Foundry", tier: "agentic", group: "machine", licence: "BSL 1.1", state: "progress", line: "The workspace around your agent", href: "/foundry/" },
  { id: "agent", label: "Your agent", tier: "agentic", group: "machine", licence: "none", tone: "shared", line: "Claude Code or Codex, on the subscription you already pay for" },
  { id: "wardens", label: "Wardens", tier: "agentic", group: "machine", licence: "BSL 1.1", state: "progress", line: "Small agents inside Foundry, each holding one part of what your project knows", href: "/foundry/" },
  { id: "codebase", label: "Your codebase", tier: "agentic", group: "machine", licence: "none", tone: "shared", line: "Your code, and the docs and rules that say how it's done" },
  { id: "agent-session", label: "agent-session", tier: "agentic", group: "machine", licence: "MIT", line: "Runs each Claude Code and Codex session", href: "/agentic/#agent-session" },
  { id: "archive", label: "Archive", tier: "agentic", group: "machine", licence: "MIT", line: "Keeps every agent session", href: "/agentic/#archive" },
  { id: "kcp", label: "KCP", tier: "agentic", group: "machine", licence: "MIT", state: "progress", line: "Runs your CLIs through Kingdom", href: "/agentic/#kcp" },
  { id: "kingdom", label: "Kingdom", tier: "agentic", group: "hub", licence: "closed", state: "progress", line: "The permission hub", href: "/kingdom/" },
  { id: "signet", label: "Signet", tier: "agentic", group: "hub", licence: "MIT", tone: "signet", line: "A revocable pass on the owner's terms", href: "/agentic/#signet" },
  { id: "integrations", label: "Your integrations", tier: "agentic", group: "outside", licence: "none", tone: "shared", line: "GitHub, Slack, Linear, Google" },
  { id: "teammates", label: "Teammates and their agents", tier: "agentic", group: "outside", licence: "none", tone: "shared", line: "Anyone the owner gives a Signet" },
  { id: "artifactory", label: "Artifactory", tier: "agentic", group: "outside", licence: "none", state: "planned", tone: "shared", line: "Sharing what agents make, signed in with Kingdom" },
  { id: "oracle", label: "Oracle", tier: "agentic", group: "loop", licence: "closed", line: "Measures whether a correction stuck", href: "/oracle/" },
  { id: "bench", label: "bench", tier: "agentic", group: "loop", licence: "none", line: "Our challenge set for coding agents", href: "/agentic/#bench" },

  // Governance
  { id: "whitepaper", label: "The whitepaper", tier: "governance", group: "governance", licence: "none", line: "How groups set rules and hold each other to them", href: "/governance/" },
  { id: "project", label: "The Inixiative project", tier: "governance", group: "governance", licence: "none", state: "planned", line: "change.org meets Kickstarter on blockchain: a time-series governance platform, with tokenization", href: "/governance/" },
  { id: "livestock", label: "Livestock", tier: "governance", group: "governance", licence: "closed", state: "planned", line: "Tokenized cattle trusts in Uruguay and Argentina, a product on the Inixiative platform" },
];

const byLabel = (id: string) => (id === "ci-rules" ? "CI rules" : id);

export const edges: StackEdge[] = [
  // Building blocks
  { base: "prisma-map", user: "json-rules", kind: "uses", structural: true, why: "json-rules reads the field map prisma-map produces" },
  { base: "prisma-map", user: "permissions", kind: "uses", structural: true, why: "permissions walks your data through the map prisma-map produces" },
  { base: "json-rules", user: "permissions", kind: "uses", why: "permission rules are json-rules" },
  { base: "json-rules", user: "transitions", kind: "uses", why: "transition guards are json-rules" },
  { base: "permissions", user: "transitions", kind: "uses", why: "a transition is checked by permissions" },
  { base: "json-rules", user: "rules-builder", kind: "uses", why: "rules-builder builds json-rules conditions" },
  { base: "json-rules", user: "atlas", kind: "uses", why: "atlas checks its annotations with json-rules" },
  { base: "prisma-map", user: "template", kind: "uses", why: "template uses prisma-map" },
  { base: "json-rules", user: "template", kind: "uses", why: "template uses json-rules" },
  { base: "permissions", user: "template", kind: "uses", why: "template uses permissions" },
  { base: "rules-builder", user: "template", kind: "uses", why: "template uses rules-builder" },
  { base: "atlas", user: "template", kind: "uses", why: "template uses atlas" },
  { base: "config", user: "template", kind: "uses", why: "template uses config" },
  ...["worktrees", "init", "ci-rules"].map((base): StackEdge => ({ base, user: "template", kind: "uses", why: `${byLabel(base)} comes with template` })),
  ...["prisma-map", "json-rules", "permissions", "transitions", "rules-builder", "atlas", "gloss"].map(
    (user): StackEdge => ({ base: "config", user, kind: "uses", why: `${user} builds with config` }),
  ),
  { base: "transitions", user: "template", kind: "uses", next: true, why: "template moves onto transitions next" },
  { base: "gloss", user: "template", kind: "uses", next: true, why: "template adopts gloss next" },

  // Agentic packages
  { base: "agent-session", user: "foundry", kind: "uses", why: "Foundry runs sessions with agent-session" },
  { base: "archive", user: "foundry", kind: "uses", why: "Foundry captures sessions into Archive" },
  { base: "signet", user: "foundry", kind: "uses", why: "Foundry holds its Kingdom access as a Signet" },
  { base: "agent-session", user: "archive", kind: "uses", why: "Archive reads sessions through agent-session" },
  { base: "signet", user: "archive", kind: "uses", why: "Archive shares are Signets" },
  { base: "signet", user: "kcp", kind: "uses", why: "KCP presents a Signet for each command" },
  { base: "signet", user: "kingdom", kind: "uses", why: "Kingdom issues and checks Signets" },
  { base: "archive", user: "kingdom", kind: "uses", why: "Kingdom sets up and reaches Archives" },
  { base: "agent-session", user: "kingdom", kind: "uses", why: "Kingdom uses agent-session" },
  { base: "agent-session", user: "oracle", kind: "uses", why: "Oracle replays work with agent-session" },
  { base: "archive", user: "oracle", kind: "uses", why: "Oracle reads sessions from Archive" },
  { base: "foundry", user: "oracle", kind: "uses", why: "Oracle builds on Foundry" },
  { base: "agent-session", user: "bench", kind: "uses", why: "bench runs agents with agent-session" },

  // Agentic packages built on the building blocks
  { base: "json-rules", user: "signet", kind: "uses", why: "a Signet's lens is json-rules" },
  { base: "json-rules", user: "agent-session", kind: "uses", why: "agent-session uses json-rules" },
  { base: "json-rules", user: "foundry", kind: "uses", why: "Foundry uses json-rules" },
  { base: "gloss", user: "foundry", kind: "uses", why: "Foundry uses gloss" },
  { base: "config", user: "foundry", kind: "uses", why: "Foundry uses config" },
  { base: "permissions", user: "kingdom", kind: "uses", why: "Kingdom decides access with permissions" },
  { base: "json-rules", user: "kingdom", kind: "uses", why: "Kingdom uses json-rules" },
  { base: "prisma-map", user: "kingdom", kind: "uses", why: "Kingdom uses prisma-map" },
  { base: "rules-builder", user: "kingdom", kind: "uses", why: "Kingdom uses rules-builder" },

  // How they run
  { base: "kingdom", user: "foundry", kind: "runs", signet: true, why: "Foundry pairs with Kingdom; the pairing is a Signet" },
  { base: "kingdom", user: "archive", kind: "runs", signet: true, why: "a local Archive pairs with Kingdom through a Signet" },
  { base: "kingdom", user: "kcp", kind: "runs", signet: true, next: true, why: "KCP will run your provider CLIs through Kingdom (in progress: it signs in today)" },
  { base: "kingdom", user: "teammates", kind: "runs", signet: true, why: "teammates and their agents use your integrations through a Signet" },
  { base: "integrations", user: "kingdom", kind: "runs", why: "your integrations connect to Kingdom, which holds their credentials" },
  { base: "kingdom", user: "artifactory", kind: "runs", next: true, why: "Artifactory will sign in with Kingdom (planned)" },
  { base: "foundry", user: "agent-session", kind: "runs", why: "Foundry runs each agent session on your machine" },
  { base: "foundry", user: "archive", kind: "runs", why: "Foundry sends every session to Archive" },
  { base: "foundry", user: "oracle", kind: "runs", why: "Oracle measures and tunes Foundry's docs and Wardens" },
  // How Foundry works (the /agentic map)
  { base: "foundry", user: "agent", kind: "runs", why: "your agent runs inside Foundry, on your own subscription" },
  { base: "codebase", user: "wardens", kind: "runs", why: "Wardens are built from your codebase's docs, one per topic" },
  { base: "wardens", user: "agent", kind: "runs", why: "Wardens notice what a request touches and remind your agent of what your project already has, and where it's written down; your agent decides what to use" },
  { base: "archive", user: "oracle", kind: "runs", why: "Oracle reads the sessions Archive keeps" },
  { base: "oracle", user: "wardens", kind: "runs", why: "Oracle checks whether a correction stuck and proposes changes to the docs and Wardens" },
  { base: "template", user: "wardens", kind: "runs", why: "a codebase built from template comes with its Wardens built and turned on" },
  { base: "whitepaper", user: "project", kind: "runs", why: "the whitepaper explains why; the Inixiative project is the goal" },
  { base: "project", user: "livestock", kind: "runs", why: "Livestock is a product that runs on the Inixiative platform" },
];

// One label shape on every map and diagram: [tag, short description]. The tag is the repo or package name; for
// things that are not repos, their own name.
const labels: Record<string, [string, string]> = {
  "prisma-map": ["prisma-map", "Data shape"],
  "json-rules": ["json-rules", "Rules"],
  permissions: ["permissions", "Who can do what"],
  transitions: ["transitions", "Lifecycles"],
  "rules-builder": ["rules-builder", "Rule screens"],
  atlas: ["atlas", "Map of the code"],
  gloss: ["gloss", "Notes beside the code"],
  config: ["config", "Shared setup"],
  worktrees: ["worktrees", "A copy per task"],
  init: ["init", "Project setup"],
  "ci-rules": ["CI rules", "Convention checks"],
  template: ["template", "The whole SaaS app"],
  foundry: ["foundry", "Agent workspace"],
  agent: ["your agent", "Claude Code or Codex"],
  wardens: ["wardens", "Small expert agents"],
  codebase: ["your codebase", "Code, docs and rules"],
  "agent-session": ["agent-session", "Runs sessions"],
  archive: ["archive", "Keeps sessions"],
  kcp: ["kcp", "CLIs through Kingdom"],
  kingdom: ["kingdom", "The permission hub"],
  signet: ["signet", "Revocable pass"],
  integrations: ["integrations", "GitHub, Slack, Linear"],
  teammates: ["teammates", "Them and their agents"],
  artifactory: ["artifactory", "Share agent work"],
  oracle: ["oracle", "Did a fix stick?"],
  bench: ["bench", "Agent challenges"],
  whitepaper: ["whitepaper", "Why"],
  project: ["Inixiative project", "change.org meets Kickstarter on blockchain"],
  livestock: ["Livestock", "Tokenized cattle trusts"],
};
for (const n of nodes) {
  const l = labels[n.id];
  if (!l) throw new Error(`stack: no label for ${n.id}`);
  [n.tag, n.short] = l;
}

export const byId = new Map(nodes.map((n) => [n.id, n]));
