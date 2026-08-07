import { readFileSync } from "node:fs";

import { apiCatalog, apiDocsHtml, openApiDocument } from "./api-catalog";
import { resourceEntries } from "../content/resources";
import { getResourceFaqs } from "../content/faqs";
import { landingFaq } from "../content/landing";
import type { CanonicalRoute } from "./route-manifest";
import { canonicalRoutes, siteUrl } from "./route-manifest";

/**
 * Reads raw MDX to inline real article text into `llms-full.txt`. Uses `fs`
 * rather than a `?raw` glob because the MDX plugin compiles those imports
 * before the query is honoured. This module is only ever loaded in Node (the
 * build script and Vitest), so it never reaches a client bundle.
 */
function bodyForSlug(slug: string): string {
  return readFileSync(
    new URL(`../content/blog/${slug}.mdx`, import.meta.url),
    "utf8",
  )
    .replace(/^---\n[\s\S]*?\n---\n/, "")
    .replaceAll(/<[^>]+>/g, "")
    .trim();
}

function xml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function sitemapXml(routes: readonly CanonicalRoute[]): string {
  const urls = routes
    .map(
      (route) =>
        `  <url>\n    <loc>${xml(route.canonical)}</loc>${route.lastModified ? `\n    <lastmod>${route.lastModified}</lastmod>` : ""}\n  </url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function rssXml(): string {
  const items = resourceEntries
    .map((entry) => {
      const url = `${siteUrl}/blog/${entry.slug}/`;
      const categories = entry.tags
        .map((tag) => `\n      <category>${xml(tag)}</category>`)
        .join("");
      return `    <item>\n      <title>${xml(entry.title)}</title>\n      <link>${url}</link>\n      <guid>${url}</guid>\n      <description>${xml(entry.description)}</description>\n      <dc:creator>${xml(entry.author.name)}</dc:creator>${categories}\n      <pubDate>${new Date(`${entry.published}T00:00:00Z`).toUTCString()}</pubDate>\n    </item>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel>\n    <title>Construct Computer Blog</title>\n    <link>${siteUrl}/blog/</link>\n    <description>AI employee guides, practical articles, and comparisons from Construct Computer.</description>\n${items}\n  </channel></rss>\n`;
}

function atomXml(): string {
  const updated = resourceEntries.reduce(
    (latest, entry) =>
      (entry.updated ?? entry.published) > latest
        ? (entry.updated ?? entry.published)
        : latest,
    "1970-01-01",
  );
  const entries = resourceEntries
    .map((entry) => {
      const url = `${siteUrl}/blog/${entry.slug}/`;
      const categories = entry.tags
        .map((tag) => `\n    <category term="${xml(tag)}"/>`)
        .join("");
      return `  <entry>\n    <title>${xml(entry.title)}</title>\n    <id>${url}</id>\n    <link href="${url}"/>\n    <author><name>${xml(entry.author.name)}</name></author>\n    <published>${entry.published}T00:00:00Z</published>\n    <updated>${entry.updated ?? entry.published}T00:00:00Z</updated>${categories}\n    <summary>${xml(entry.description)}</summary>\n  </entry>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom">\n  <title>Construct Computer Blog</title>\n  <id>${siteUrl}/blog/</id>\n  <link href="${siteUrl}/atom.xml" rel="self"/>\n  <updated>${updated}T00:00:00Z</updated>\n${entries}\n</feed>\n`;
}

const summary =
  "Construct Computer is an AI employee for startups, small businesses, and solo founders. It gets its own cloud computer, your tools connected, and a workspace where work finishes while you are away.";

const capabilities = [
  "Persistent files, inspectable memory, native email, schedules, and linear workflows",
  "Live browser runs and a sandbox terminal with durable workspace files",
  "Bounded Activity summaries and chat tool records for supervised execution",
  "Web, Slack, Telegram, and Discord slash-command access",
  "Custom MCP servers and private agent-authored workspace apps",
];

function llmsIndex(): string {
  const pages = canonicalRoutes
    .map(
      (route) =>
        `- [${route.displayTitle ?? route.title}](${route.canonical}): ${route.description}`,
    )
    .join("\n");
  return `# Construct Computer\n\n> ${summary}\n\n## Pages\n${pages}\n`;
}

/**
 * Unlike `llms.txt`, this inlines the full text of every resource so a model
 * that fetches one file gets the actual arguments rather than a link list.
 */
function llmsFull(): string {
  const sections = resourceEntries.map((entry) => {
    const url = `${siteUrl}/blog/${entry.slug}/`;
    const faqs = getResourceFaqs(entry.slug);
    const faqBlock = faqs.length
      ? `\n\n### Frequently asked questions\n\n${faqs
          .map((faq) => `**${faq.question}**\n\n${faq.answer}`)
          .join("\n\n")}`
      : "";
    return [
      `## ${entry.title}`,
      "",
      `URL: ${url}`,
      `Type: ${entry.kind}`,
      `Author: ${entry.author.name}`,
      `Published: ${entry.published}${entry.updated ? ` (updated ${entry.updated})` : ""}`,
      `Tags: ${entry.tags.join(", ")}`,
      "",
      bodyForSlug(entry.slug) + faqBlock,
    ].join("\n");
  });

  return [
    "# Construct Computer - full product context",
    "",
    `> ${summary}`,
    "",
    "## Capabilities",
    "",
    ...capabilities.map((item) => `- ${item}`),
    "",
    "## Product FAQ",
    "",
    ...landingFaq.map((item) => `**${item.question}**\n\n${item.answer}\n`),
    "## Company pages",
    "",
    ...canonicalRoutes
      .filter(({ kind }) => kind === "home" || kind === "page")
      .map(
        (route) =>
          `- [${route.displayTitle ?? route.title}](${route.canonical}): ${route.description}`,
      ),
    "",
    "# Resources",
    "",
    ...sections,
  ].join("\n");
}

/**
 * Content Signals (contentsignals.org), stated separately from access because
 * they answer a different question. `Allow: /` says a crawler may fetch the
 * page; the signals say what it may do with what it fetched.
 *
 * All three are yes. Reach is the constraint this site is under, not leakage:
 * being indexed, cited in answers, and learned from all end at the same place,
 * which is a model that knows what Construct is. Under clause (c) of the policy
 * an omitted signal grants nothing, so each permission is stated rather than
 * left blank.
 */
const contentSignal = "Content-Signal: search=yes, ai-input=yes, ai-train=yes";

/**
 * The policy text is reproduced as published rather than paraphrased. It is the
 * part that carries the legal weight, and a reworded copy would be a different
 * license than the one every other participating site is offering.
 */
const contentSignalsPolicy = [
  "# As a condition of accessing this website, you agree to",
  "# abide by the following content signals:",
  "",
  "# (a)  If a content-signal = yes, you may collect content",
  "# for the corresponding use.",
  "# (b)  If a content-signal = no, you may not collect content",
  "# for the corresponding use.",
  "# (c)  If the website operator does not include a content",
  "# signal for a corresponding use, the website operator",
  "# neither grants nor restricts permission via content signal",
  "# with respect to the corresponding use.",
  "",
  "# The content signals and their meanings are:",
  "",
  "# search: building a search index and providing search",
  "# results (e.g., returning hyperlinks and short excerpts",
  "# from your website's contents).  Search does not include",
  "# providing AI-generated search summaries.",
  "# ai-input: inputting content into one or more AI models",
  "# (e.g., retrieval augmented generation, grounding, or other",
  "# real-time taking of content for generative AI search",
  "# answers).",
  "# ai-train: training or fine-tuning AI models.",
  "",
  "# ANY RESTRICTIONS EXPRESSED VIA CONTENT SIGNALS ARE EXPRESS",
  "# RESERVATIONS OF RIGHTS UNDER ARTICLE 4 OF THE EUROPEAN",
  "# UNION DIRECTIVE 2019/790 ON COPYRIGHT AND RELATED RIGHTS",
  "# IN THE DIGITAL SINGLE MARKET.",
];

export const crawlerFiles = {
  "sitemap.xml": sitemapXml(canonicalRoutes),
  "rss.xml": rssXml(),
  "atom.xml": atomXml(),
  "robots.txt": [
    ...contentSignalsPolicy,
    "",
    "User-agent: *",
    contentSignal,
    "Allow: /",
    "",
    "# Answer engines and AI crawlers are welcome on all public content.",
    // The signal is repeated in every group on purpose: a crawler that matches
    // a named group ignores the `*` group entirely, and these named groups are
    // exactly the crawlers the signals are addressed to.
    ...[
      "GPTBot",
      "OAI-SearchBot",
      "ChatGPT-User",
      "ClaudeBot",
      "Claude-User",
      "PerplexityBot",
      "Google-Extended",
      "Applebot-Extended",
      "Bingbot",
      "CCBot",
    ].flatMap((agent) => [
      `User-agent: ${agent}`,
      contentSignal,
      "Allow: /",
      "",
    ]),
    `Sitemap: ${siteUrl}/sitemap.xml`,
    "",
  ].join("\n"),
  "llms.txt": llmsIndex(),
  "llms-full.txt": llmsFull(),
  ".well-known/security.txt": `Contact: mailto:security@construct.computer\nExpires: 2027-07-26T00:00:00.000Z\nPreferred-Languages: en\nCanonical: ${siteUrl}/.well-known/security.txt\n`,
  // RFC 9727 discovery: the catalog names the API, the OpenAPI document
  // describes it, and the HTML page documents it for humans. `_headers` serves
  // the catalog as application/linkset+json, which the RFC requires.
  ".well-known/api-catalog": `${JSON.stringify(apiCatalog, null, 2)}\n`,
  "openapi.json": `${JSON.stringify(openApiDocument, null, 2)}\n`,
  "docs/api/index.html": apiDocsHtml(),
} as const;
