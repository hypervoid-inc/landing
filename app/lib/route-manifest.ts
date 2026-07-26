import { resourceEntries } from "../content/resources";

export const siteUrl = "https://construct.computer";

export type RouteKind =
  "home" | "page" | "blog-index" | "blog-post" | "guide" | "comparison";

export type CanonicalRoute = {
  readonly path: string;
  readonly canonical: string;
  readonly title: string;
  readonly description: string;
  readonly kind: RouteKind;
  readonly lastModified?: string;
  readonly published?: string;
  readonly author?: string;
  readonly image: string;
};

function route(
  entry: Omit<CanonicalRoute, "canonical" | "image">,
): CanonicalRoute {
  const name =
    entry.path === "/" ? "home" : entry.path.slice(1).replaceAll("/", "-");
  return {
    ...entry,
    canonical: entry.path === "/" ? `${siteUrl}/` : `${siteUrl}${entry.path}/`,
    image: `${siteUrl}/og/${name}.png`,
  };
}

export const canonicalRoutes: readonly CanonicalRoute[] = [
  route({
    path: "/",
    title: "AI Employee with a Persistent Work OS | Construct",
    description:
      "Construct is a supervised AI workspace with persistent files and memory, live browser runs, a sandbox terminal, schedules, linear workflows, native email, and connected apps.",
    kind: "home",
  }),
  route({
    path: "/about",
    title: "About - Construct Computer",
    description:
      "Meet the team building a persistent work OS for an AI employee with files, memory, schedules, linear workflows, live browser and terminal tools, and connected apps.",
    kind: "page",
  }),
  route({
    path: "/careers",
    title: "Careers - Construct Computer",
    description:
      "Construct isn't actively hiring, but we'd love to hear from people who want to build AI agents, work interfaces, memory systems, and reliable execution tools.",
    kind: "page",
  }),
  route({
    path: "/editorial-policy",
    title: "Editorial Policy - Construct Computer",
    description:
      "How Construct reviews AI-assisted drafts, verifies sources and comparisons, handles publication dates, and corrects errors in its resource library.",
    kind: "page",
    lastModified: "2026-07-26",
  }),
  route({
    path: "/support",
    title: "Support - Construct Computer",
    description:
      "Get help with your Construct Computer account, billing, integrations, and data requests. Report issues, review bounded Activity summaries, or contact the team.",
    kind: "page",
  }),
  route({
    path: "/privacy",
    title: "Privacy Policy - Construct Computer",
    description:
      "How Construct Computer collects, stores, encrypts, and shares data across the agent workspace, memory system, integrations, and billing provider.",
    kind: "page",
    lastModified: "2026-07-20",
  }),
  route({
    path: "/terms",
    title: "Terms & Conditions - Construct Computer",
    description:
      "Terms of service for Construct Computer: subscription plans, acceptable use, agent actions, model BYOK, and proprietary platform licensing.",
    kind: "page",
    lastModified: "2026-07-20",
  }),
  route({
    path: "/blog",
    title: "AI Employee Resources - Construct Computer",
    description:
      "Explore AI employee guides, practical articles, and comparisons with chat assistants, copilots, automation tools, coding agents, and DIY stacks.",
    kind: "blog-index",
  }),
  ...resourceEntries.map((entry) =>
    route({
      path: `/blog/${entry.slug}`,
      title: entry.seoTitle ?? `${entry.title} - Construct Computer`,
      description: entry.description,
      kind: entry.kind === "article" ? "blog-post" : entry.kind,
      published: entry.published,
      lastModified: entry.date,
      author: entry.author,
    }),
  ),
];

export function getRoute(path: string): CanonicalRoute | undefined {
  return canonicalRoutes.find((entry) => entry.path === path);
}
