import { readFileSync } from "node:fs";

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
  "Construct Computer is a supervised workspace for an AI employee that researches, operates tools, creates files, and runs recurring work through supported apps from a live integration catalog.";

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
    "# Construct Computer — full product context",
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

export const crawlerFiles = {
  "sitemap.xml": sitemapXml(canonicalRoutes),
  "rss.xml": rssXml(),
  "atom.xml": atomXml(),
  "robots.txt": [
    "User-agent: *",
    "Allow: /",
    "",
    "# Answer engines and AI crawlers are welcome on all public content.",
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
    ].flatMap((agent) => [`User-agent: ${agent}`, "Allow: /", ""]),
    `Sitemap: ${siteUrl}/sitemap.xml`,
    "",
  ].join("\n"),
  "llms.txt": llmsIndex(),
  "llms-full.txt": llmsFull(),
  ".well-known/security.txt": `Contact: mailto:security@construct.computer\nExpires: 2027-07-26T00:00:00.000Z\nPreferred-Languages: en\nCanonical: ${siteUrl}/.well-known/security.txt\n`,
} as const;
