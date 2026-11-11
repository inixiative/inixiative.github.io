// What inixiative publishes and under which licence: the one list /open-source and the homepage read.
// Licences checked against each repo's LICENSE on origin/main, 2026-11-02.

export type Licence = "mit" | "source-available" | "closed";

export type Project = {
  name: string;
  what: string;
  licence: Licence;
  /** The licence as the table states it. */
  licenceLabel: string;
  state?: "in progress" | "paused";
  href?: string;
  linkLabel?: string;
};

const gh = (repo: string) => `https://github.com/inixiative/${repo}`;
const mit = (name: string, what: string, href: string, state?: Project["state"]): Project => ({
  name,
  what,
  licence: "mit",
  licenceLabel: "MIT",
  href,
  state,
});

export const groups: { title: string; projects: Project[] }[] = [
  {
    title: "Building blocks",
    projects: [
      mit("template", "A SaaS app you start a product from and own", gh("template")),
      mit("prisma-map", "Your Prisma schema, readable at runtime", gh("prisma-map")),
      mit("json-rules", "One rule that runs in memory, in Prisma and in SQL", gh("json-rules")),
      mit("permissions", "Who can do what, decided on your own records", gh("permissions")),
      mit("transitions", "Which state change is allowed right now", gh("transitions")),
      mit("rules-builder", "A rule editor that only offers what the engine can run", gh("rules-builder")),
      mit("conditional-form", "Forms whose show, hide and validation logic is the same rule language the backend uses", gh("conditional-form"), "paused"),
    ],
  },
  {
    title: "Developer experience",
    projects: [
      mit("atlas", "A map of your code that CI keeps accurate", gh("atlas")),
      mit("gloss", "Keeps agent commentary out of your code and hands it back when the agent reads that code", gh("gloss")),
      mit("config", "The shared toolchain and theme", gh("config")),
    ],
  },
  {
    title: "Agentic tools",
    projects: [
      mit("Signet", "A pass to use an integration through Kingdom, which the owner can take back", gh("signet")),
      mit("KCP", "Runs your command-line tools through Kingdom so no token sits on your machine (the Kingdom CLI Proxy); signing in works, running commands is in progress", gh("kcp"), "in progress"),
      mit("Archive", "Keeps every agent session on your machine and syncs where you choose", gh("archive")),
      mit("agent-session", "Runs Claude Code and Codex as long-lived sessions", gh("agent-session")),
      {
        name: "Foundry",
        what: "The workspace around your agent",
        licence: "source-available",
        licenceLabel: "Source-available (BSL 1.1), MIT from 2030-04-06",
        href: gh("foundry"),
      },
      mit("foundry-core", "The engine under Foundry", gh("foundry")),
      mit("foundry-acp", "Lets agent apps such as Paseo and T3 Code drive Foundry over the Agent Client Protocol (ACP)", gh("foundry")),
      mit("hivemind", "Multi-agent coordination over MCP: a shared event log with role-scoped channels", gh("hivemind"), "paused"),
    ],
  },
  {
    title: "Closed",
    projects: [
      {
        name: "Kingdom",
        what: "The hub where you decide who and what can reach your work",
        licence: "closed",
        licenceLabel: "Closed",
        href: "https://kingdom.inixiative.com",
        linkLabel: "kingdom.inixiative.com",
      },
      {
        name: "Oracle",
        what: "Measures whether a correction stuck, and tunes the docs and Wardens that remind your agent",
        licence: "closed",
        licenceLabel: "Closed",
      },
    ],
  },
];

export const projects = groups.flatMap((group) => group.projects);
export const byLicence = (licence: Licence) => projects.filter((project) => project.licence === licence);

/** Foundry's app turns MIT on this date (LICENSE-BSL change date). */
export const foundryMitDate = "6 April 2030";
