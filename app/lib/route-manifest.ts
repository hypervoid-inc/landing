import { resourceEntries } from "../content/resources";
import { listedAuthors, type Author } from "../content/authors";
import { useCases } from "../content/use-cases";

export const siteUrl = "https://construct.computer";

/**
 * Fallback `lastmod` for pages that carry no date of their own. Bump this when
 * the marketing or company page copy actually changes — a dishonest freshness
 * signal is worse than none.
 */
export const siteRevised = "2026-08-03";

export type RouteKind =
  | "home"
  | "page"
  | "pricing"
  | "use-case"
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

/**
 * The stem shared by a route's OG image, its source artwork, and its art
 * subject. `scripts/generate-og.mjs` keys every file it reads and writes off
 * this, so the naming rule lives here rather than being restated per script.
 */
export function ogName(path: string): string {
  return path === "/" ? "home" : path.slice(1).replaceAll("/", "-");
}

/**
 * The human title for a route, with the SEO suffix stripped. Used for
 * breadcrumbs, OG image type, and the artwork prompts, which all want the
 * headline rather than the search-results string.
 */
export function routeDisplayTitle(route: CanonicalRoute): string {
  return (
    route.displayTitle ??
    route.title.replace(" - Construct Computer", "").replace(" | Construct", "")
  );
}

/**
 * The published OG filename without its extension. An MDX post may name its own
 * source card in any format; the extension is dropped here because everything
 * is re-encoded to one.
 */
export function ogStem(path: string, image?: string): string {
  return image ? image.replace(/\.[^.]+$/, "") : ogName(path);
}

/**
 * Every OG image is published under `/og/` as JPEG — the cards are gradient
 * renders that PNG stores about nine times larger for no visible gain, and
 * they double as blog thumbnails where that weight is paid fourteen times over.
 */
function route(
  entry: Omit<CanonicalRoute, "canonical" | "image"> & {
    readonly image?: string;
    /** Query on `og:image` so scrapers treat a same-path card as new. */
    readonly imageVersion?: string;
  },
): CanonicalRoute {
  const { imageVersion, ...rest } = entry;
  const imagePath = `${siteUrl}/og/${ogStem(entry.path, entry.image)}.jpg`;
  return {
    ...rest,
    canonical: entry.path === "/" ? `${siteUrl}/` : `${siteUrl}${entry.path}/`,
    image: imageVersion ? `${imagePath}?v=${imageVersion}` : imagePath,
  };
}

export const canonicalRoutes: readonly CanonicalRoute[] = [
  route({
    path: "/",
    title: "AI Employee for Solo Founders and Small Teams | Construct",
    description:
      "AI employee for startups, small businesses, and solo founders. Own cloud computer, your tools connected, work that finishes while you are away. From $9/month.",
    kind: "home",
    lastModified: siteRevised,
    imageVersion: "2",
  }),
  route({
    path: "/pricing",
    title: "Simple Pricing for an AI Employee | Construct",
    displayTitle: "Simple Pricing",
    description:
      "Plans for solo founders and small teams. Lite, Starter, and Pro from $9/month, with a 7-day Pro trial, annual savings, and enterprise options.",
    kind: "pricing",
    lastModified: "2026-08-14",
  }),
  route({
    path: "/use-cases",
    title: "Use Cases for an AI Employee | Construct",
    displayTitle: "Use Cases",
    description:
      "How Construct encodes workflows, builds internal tools, schedules jobs, shares a team workspace, inspects memory, works across channels, and delivers cited research.",
    kind: "use-case",
    lastModified: "2026-08-14",
  }),
  ...useCases.map((entry) =>
    route({
      path: `/use-cases/${entry.slug}`,
      title: entry.seoTitle,
      displayTitle: entry.title,
      description: entry.description,
      kind: "use-case",
      lastModified: "2026-08-14",
    }),
  ),
  route({
    path: "/about",
    title: "About - Construct Computer",
    description:
      "Construct builds an AI employee for solo founders and small teams: own cloud computer, memory, schedules, workflows, browser and terminal tools, and connected apps.",
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
    path: "/affiliates",
    title: "Affiliate Program - Construct Computer",
    description:
      "Partner with Construct. First 25 affiliates earn 50% of referred revenue for up to 12 months; then the rate drops to 20%. Apply via PartnerStack.",
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
    lastModified: "2026-08-09",
  }),
  route({
    path: "/sub-processors",
    title: "Sub-processors - Construct Computer",
    description:
      "Third-party vendors Construct uses to host, authenticate, integrate, bill, email, observe, and run models for the construct.computer platform.",
    kind: "page",
    lastModified: "2026-08-09",
  }),
  route({
    path: "/terms",
    title: "Terms & Conditions - Construct Computer",
    description:
      "Terms of service for Construct Computer: subscription plans, acceptable use, agent actions, model BYOK, and proprietary platform licensing.",
    kind: "page",
    lastModified: "2026-08-09",
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
      image: entry.image,
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
