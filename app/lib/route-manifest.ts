import { resourceEntries } from "../content/resources";
import { listedAuthors, type Author } from "../content/authors";

export const siteUrl = "https://construct.computer";

/**
 * Fallback `lastmod` for pages that carry no date of their own. Bump this when
 * the marketing or company page copy actually changes — a dishonest freshness
 * signal is worse than none.
 */
export const siteRevised = "2026-07-27";

export type RouteKind =
  | "home"
  | "page"
  | "blog-index"
  | "blog-post"
  | "guide"
  | "comparison"
  | "author-index"
  | "author"
  | "tag";

export type CanonicalRoute = {
  readonly path: string;
  readonly canonical: string;
  readonly title: string;
  readonly displayTitle?: string;
  readonly description: string;
  readonly kind: RouteKind;
  readonly lastModified?: string;
  readonly published?: string;
  readonly author?: Author;
  readonly tags?: readonly string[];
  readonly image: string;
};

/** Tags worth an indexable archive. A one-post tag page is thin by definition. */
export const hubTags: readonly string[] = [
  ...new Set(resourceEntries.flatMap((entry) => entry.tags)),
]
  .filter(
    (tag) =>
      resourceEntries.filter((entry) => entry.tags.includes(tag)).length >= 2,
  )
  .sort();

export function resourcesByTag(tag: string) {
  return resourceEntries.filter((entry) => entry.tags.includes(tag));
}

export function resourcesByAuthor(id: string) {
  return resourceEntries.filter((entry) => entry.author.id === id);
}

function newestDate(
  entries: readonly { published: string; updated?: string }[],
) {
  return entries.reduce(
    (latest, entry) =>
      (entry.updated ?? entry.published) > latest
        ? (entry.updated ?? entry.published)
        : latest,
    siteRevised,
  );
}

/**
 * Display names for tags whose correct casing a generic title-caser gets wrong
 * ("Ai Employee", "Chatgpt"). Anything absent falls back to title case.
 */
const tagDisplayNames: Record<string, string> = {
  "ai-agent": "AI agent",
  "ai-agent-memory": "AI agent memory",
  "ai-employee": "AI employee",
  chatgpt: "ChatGPT",
  n8n: "n8n",
};

export function tagLabel(tag: string): string {
  return tagDisplayNames[tag] ?? tag.replaceAll("-", " ");
}

function tagTitle(tag: string): string {
  const label = tagLabel(tag);
  return label === tag.replaceAll("-", " ")
    ? label.replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
    : label;
}

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
      "Construct is a supervised AI workspace with persistent files and memory, live browser runs, schedules, reusable workflows, native email, and connected apps.",
    kind: "home",
    lastModified: siteRevised,
  }),
  route({
    path: "/about",
    title: "About - Construct Computer",
    description:
      "Meet the team building a persistent work OS for an AI employee with files, memory, schedules, linear workflows, live browser and terminal tools, and connected apps.",
    kind: "page",
    lastModified: siteRevised,
  }),
  route({
    path: "/careers",
    title: "Careers - Construct Computer",
    description:
      "Construct isn't actively hiring, but we'd love to hear from people who want to build AI agents, work interfaces, memory systems, and reliable execution tools.",
    kind: "page",
    lastModified: siteRevised,
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
    lastModified: siteRevised,
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
    title: "Insights and Guides - Construct Computer",
    displayTitle: "Construct insights and guides",
    description:
      "Practical writing from Construct on AI agents, workflows, memory, and tools that get work done.",
    kind: "blog-index",
    lastModified: newestDate(resourceEntries),
  }),
  ...resourceEntries.map((entry) =>
    route({
      path: `/blog/${entry.slug}`,
      title: entry.seoTitle ?? `${entry.title} - Construct Computer`,
      displayTitle: entry.title,
      description: entry.description,
      kind: entry.kind === "article" ? "blog-post" : entry.kind,
      published: entry.published,
      lastModified: entry.updated ?? entry.published,
      author: entry.author,
      tags: entry.tags,
    }),
  ),
  route({
    path: "/authors",
    title: "Authors - Construct Computer",
    displayTitle: "Authors",
    description:
      "The people and team writing Construct's articles, guides, and comparisons on AI agents, workflows, memory, and getting real work done.",
    kind: "author-index",
    lastModified: newestDate(resourceEntries),
  }),
  ...listedAuthors.map((author) =>
    route({
      path: `/authors/${author.id}`,
      title: `${author.name} - Construct Computer`,
      displayTitle: author.name,
      description: `${author.bio} Read every article, guide, and comparison written by ${author.name} for Construct Computer.`,
      kind: "author",
      author,
      lastModified: newestDate(resourcesByAuthor(author.id)),
    }),
  ),
  ...hubTags.map((tag) =>
    route({
      path: `/blog/tag/${tag}`,
      title: `${tagTitle(tag)} - Articles and Guides | Construct`,
      displayTitle: `Writing tagged ${tagLabel(tag)}`,
      description: `${resourcesByTag(tag).length} Construct articles, guides, and comparisons tagged ${tagLabel(tag)}, covering AI agents and how they get work done.`,
      kind: "tag",
      tags: [tag],
      lastModified: newestDate(resourcesByTag(tag)),
    }),
  ),
];

export function getRoute(path: string): CanonicalRoute | undefined {
  return canonicalRoutes.find((entry) => entry.path === path);
}
