// The building blocks and developer experience, read by /building-blocks (plain) and
// /building-blocks/technical (specifics). Two groups (Aron, 2026-11-02): building blocks ship in
// your product, in dependency order from the bottom up (prisma-map → json-rules → permissions →
// transitions → rules-builder); developer experience never ships in your product.

export type Piece = {
  name: string;
  /** One line for anyone: what it does for you. */
  plain: string;
  /** The technical page's one-line summary. */
  line: string;
  /** Checkable specifics for the technical page. */
  points: string[];
  /** Where the code and docs live. */
  links: { label: string; href: string }[];
  demo?: string;
};

const gh = (repo: string) => `https://github.com/inixiative/${repo}`;
const npm = (name: string) => `https://www.npmjs.com/package/@inixiative/${name}`;
const pkgLinks = (name: string) => [
  { label: "README", href: `${gh(name)}#readme` },
  { label: "npm", href: npm(name) },
];
const tdoc = (file: string) => `https://github.com/inixiative/template/blob/main/docs/claude/${file}`;

export const packages: Piece[] = [
  {
    name: "prisma-map",
    plain: "Lets the other pieces read how your data is shaped while the app runs.",
    line: "Your Prisma schema, readable at runtime.",
    points: [
      "buildPrismaMapV6 and buildPrismaMapV7 read models, fields, relations, foreign-key direction and enums from a generated Prisma client.",
      "getRelations, relationForeignKey, getColumns and pickColumns let rules and permissions walk your data graph without reaching into Prisma's internals.",
    ],
    links: pkgLinks("prisma-map"),
  },
  {
    name: "json-rules",
    plain: "Write a rule once, such as \"only managers on this team\", and check it in the app or when searching the database.",
    line: "One rule that runs in memory, in Prisma and in SQL.",
    points: [
      "One rule AST: check evaluates it in memory, toPrisma turns it into a Prisma where, and toWhereSql into a SQL WHERE clause for PostgreSQL or MySQL.",
      "Rules are plain JSON. Store them, send them, let a tenant write one.",
      "Operators, paths and bindings (bindRule, listBindings) are type-checked against your models.",
    ],
    links: pkgLinks("json-rules"),
  },
  {
    name: "permissions",
    plain: "Decides who can see and change each record, from the data you already have.",
    line: "RBAC, ABAC and ReBAC in one engine, decided on your own records.",
    points: [
      "No separate tuple store to keep in sync. createRebacCheck decides on the rows you already have, walked through the schema map you pass; createHydrator loads them through your own load function.",
      "Entitlements and delegates: a grant is checked again against whoever granted it, every time it is used. You can only hand on what you could do yourself.",
      "Rules are json-rules, down to a rule a tenant writes on one record.",
      "A small core you can read. Its runtime dependencies are json-rules and lodash-es.",
    ],
    links: pkgLinks("permissions"),
  },
  {
    name: "transitions",
    plain: "Says which step a record can move to next, and who may move it, such as draft to approved.",
    line: "Declarative lifecycles on json-rules.",
    points: [
      "checkPath guards a proposed state change; describe lists the transitions open right now; createAuthorize ties them to permissions.",
      "Workflow rules and permission rules are written in the same language.",
    ],
    links: pkgLinks("transitions"),
  },
  {
    name: "rules-builder",
    plain: "The screens for building those rules, offering only choices that will work.",
    line: "A headless rule builder that only offers what the engine can run.",
    points: [
      "useRuleBuilder is a React hook that builds conditions against the fields and operators the engine supports. Bring your own components.",
      "useTransitionBuilder builds transitions the same way; parseSavedRule and stringifySavedRule store what people build.",
    ],
    links: pkgLinks("rules-builder"),
    demo: "/rules-builder/",
  },
];

export const developerExperience: Piece[] = [
  {
    name: "atlas",
    plain: "Keeps a map of what is where in your code, and fails the build when the map goes out of date.",
    line: "A codebase map that can't drift.",
    points: [
      "Reads @atlas annotations and checks them against a concept registry your repo owns.",
      "The atlas check command fails CI when an annotation no longer matches the code.",
    ],
    links: pkgLinks("atlas"),
  },
  {
    name: "gloss",
    plain: "Keeps notes about the code out of the code, and hands them to an agent when it reads that file.",
    line: "Agent commentary kept out of your code.",
    points: [
      "The agent records what it found useful, or what you want kept, as a gloss beside the symbol. In law, a gloss is a note in the margin that explains a text.",
      "Glosses live in a mirrored tree: src/foo.ts gets .gloss/src/foo.ts.md. checkRepo and fileStaleness report glosses that no longer match their code.",
    ],
    links: pkgLinks("gloss"),
  },
  {
    name: "config",
    plain: "Gives every project the same tools and settings, and checks they stay in step.",
    line: "One shared toolchain, and the theme.",
    points: [
      "TypeScript, Biome and tsup presets, plus a version manifest every repo checks in CI.",
      "Ships the shared theme this site is drawn in.",
    ],
    links: pkgLinks("config"),
  },
  {
    name: "worktrees",
    plain: "Run several copies of a project side by side, one per branch or agent, without them colliding.",
    line: "Comes with template: bun run worktree:create.",
    points: [
      "Each worktree gets its own Postgres databases, Redis database, storage buckets and ports (scripts/worktree/create.sh); worktree:destroy frees them.",
      "--skip-db makes an edit-only worktree that needs no Docker.",
    ],
    links: [{ label: "Scripts", href: tdoc("SCRIPTS.md") }],
  },
  {
    name: "init",
    plain: "A guided setup that creates a new project's accounts and services and keeps their secrets safe.",
    line: "Comes with template: bun run init.",
    points: [
      "A terminal app (init/) that provisions GitHub, PlanetScale, Railway, Vercel, Cloudflare and Resend, and keeps their secrets in Infisical.",
    ],
    links: [{ label: "Init", href: tdoc("INIT_SCRIPT_PATTERNS.md") }],
  },
  {
    name: "CI rules",
    plain: "Automatic checks that stop code that rebuilds something the project already has.",
    line: "Comes with template: run by bun run check.",
    points: [
      "Repo-owned rules in scripts/ci/rules/ fail on a raw lock, a raw transaction, a second middleware chain and similar bypasses of existing systems.",
      "doc-freshness fails when a doc names a path, symbol or line that no longer exists.",
    ],
    links: [{ label: "Scripts", href: tdoc("SCRIPTS.md") }],
  },
];

/** What a product built from template does on day one, in plain words. */
export const templatePlain = [
  "People sign in with email, with an account they already have elsewhere, or with keys for scripts.",
  "They work in organizations and teams, each with its own roles.",
  "Each person sees and changes only what they're allowed to.",
  "Sensitive data stays encrypted, and the keys can be replaced on a schedule.",
  "Changes to the records you choose are kept in a log, with who made each one.",
  "Slow work runs in the background, and screens update live.",
  "Your product emails people and tells other systems when something happens.",
  "Admin and superadmin screens are included.",
];

/** The same, with names and where it's written. */
export const templateTechnical: { title: string; body: string; href: string }[] = [
  { title: "Sign-in", body: "BetterAuth for email/password and OAuth, then an ES256 JWT per person; API tokens for scripts. No session cookies.", href: tdoc("AUTH.md") },
  { title: "Tenancy", body: "Organizations and spaces, each with memberships and roles (owner, admin, member); a space membership needs the org membership first.", href: tdoc("PERMISSIONS.md") },
  { title: "Permissions", body: "Declarative rules over the data graph, checked by the permissions package.", href: tdoc("PERMISSIONS.md") },
  { title: "Field-level encryption", body: "AES-256-GCM per field, declared in the ENCRYPTED_MODELS registry; the rotateEncryptionKeys job re-encrypts records on a stale key.", href: tdoc("ENCRYPTION.md") },
  { title: "Audit log", body: "Models listed in AUDIT_ENABLED_MODELS get an immutable trail of every mutation, with its actor and subject.", href: `${tdoc("HOOKS.md")}#audit-log` },
  { title: "Background jobs", body: "makeJob, makeSingletonJob and makeSupersedingJob on BullMQ, staged jobs that fan out and wait, and rolling caches.", href: tdoc("JOBS.md") },
  { title: "Webhooks", body: "Subscriptions per organization or space, RSA-SHA256 signatures, delivery through jobs with retries and tracking.", href: tdoc("JOBS.md") },
  { title: "Live data", body: "Authenticated WebSockets with open/snapshot/append/close data streams and authorized query channels over Redis pub/sub.", href: tdoc("WEBSOCKETS.md") },
  { title: "Email", body: "Stored MJML templates and components, a planner that picks the template, preferences and verification.", href: tdoc("COMMUNICATIONS.md") },
  { title: "Routes write their own contract", body: "Add a route and controller; it registers itself, emits OpenAPI 3.1 and regenerates a typed SDK.", href: tdoc("API_ROUTES.md") },
  { title: "Responses checked against the spec", body: "A controller can only send the responses its route declares, and payloads are validated at runtime.", href: tdoc("API_ROUTES.md") },
  { title: "Errors as a system", body: "One error body everywhere, with guidance per status and request correlation.", href: tdoc("ERRORS.md") },
];
