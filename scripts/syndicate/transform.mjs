/**
 * Turns a blog post's MDX into plain Markdown that can be published somewhere
 * else. The site renders posts with its own components (CTAs, captioned
 * tables, figures, calculators); none of those exist off-site, so each is
 * either dropped or rewritten. Kept free of file and network access so
 * `tests/syndicate.test.ts` can run it directly.
 */
import { marked } from "marked";

export const siteUrl = "https://construct.computer";

/** Days a post must be live here before the full-text feed carries it. */
export const minimumAgeDays = 3;

export function canonicalUrl(slug) {
  return `${siteUrl}/blog/${slug}/`;
}

export function parsePost(source) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) throw new Error("missing frontmatter");
  const frontmatter = {};
  for (const line of match[1].split("\n")) {
    const separator = line.indexOf(":");
    frontmatter[line.slice(0, separator)] = JSON.parse(
      line.slice(separator + 1).trim(),
    );
  }
  return { frontmatter, body: source.slice(match[0].length) };
}

/**
 * Whether the full-text feed should carry a post on `today` (YYYY-MM-DD, UTC).
 * Comparison pages should rank on our own domain only, and a new post waits
 * so the original is indexed before any copy of it exists.
 */
export function inFeed(post, today) {
  if (post.draft || post.published > today || post.kind === "comparison")
    return false;
  const age =
    (Date.parse(`${today}T00:00:00Z`) -
      Date.parse(`${post.published}T00:00:00Z`)) /
    86_400_000;
  return age >= minimumAgeDays;
}

const fence = /(^```[^\n]*\n[\s\S]*?^```[ \t]*$)/m;

function attribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
}

function trackedUrl(href, utmSource, slug) {
  const url = new URL(href, canonicalUrl(slug));
  if (url.origin !== siteUrl) return href;
  // Images, PDFs and data files are not pages, so there is no visit to tag.
  if (/\.[a-z0-9]+$/i.test(url.pathname)) return url.href;
  url.searchParams.set("utm_source", utmSource);
  url.searchParams.set("utm_medium", "syndication");
  url.searchParams.set("utm_campaign", slug);
  return url.href;
}

function figureToMarkdown(figure, slug) {
  const caption = figure
    .match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/)?.[1]
    ?.replaceAll(/<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g, "[$2]($1)")
    .replaceAll(/<[^>]+>/g, "")
    .replaceAll(/\s+/g, " ")
    .trim();
  const image = figure.match(/<img\b[\s\S]*?\/>/)?.[0];
  const video = figure.match(/<video\b[\s\S]*?>/)?.[0];
  let media = "";
  if (image) {
    media = `![${attribute(image, "alt") ?? ""}](${attribute(image, "src")})`;
  } else if (video && attribute(video, "poster")) {
    // No platform takes our hosted video, so the poster links to the post.
    const label = attribute(video, "aria-label") ?? "Video";
    media = `[![${label}](${attribute(video, "poster")})](${canonicalUrl(slug)})`;
  }
  return [media, caption && `*${caption}*`].filter(Boolean).join("\n\n");
}

function convert(text, { slug, utmSource, titles }) {
  return text
    .replaceAll(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replaceAll(/\{(["']) \1\}/g, " ")
    .replaceAll(/<BetaCta\b[^>]*>[\s\S]*?<\/BetaCta>\n?/g, "")
    .replaceAll(/<ReadNext\s+slug="([^"]+)"\s*\/>/g, (_, next) =>
      titles[next] ? `**Read next:** [${titles[next]}](/blog/${next}/)` : "",
    )
    .replaceAll(/<ArticleFigure\b[\s\S]*?\/>/g, (tag) =>
      [
        `![${attribute(tag, "alt") ?? ""}](${attribute(tag, "src")})`,
        attribute(tag, "caption") && `*${attribute(tag, "caption")}*`,
      ]
        .filter(Boolean)
        .join("\n\n"),
    )
    .replaceAll(/<figure\b[\s\S]*?<\/figure>/g, (figure) =>
      figureToMarkdown(figure, slug),
    )
    .replaceAll(
      /<(?:ReliabilityCalculator|CostCalculator)\s*\/>/g,
      `**[Try the interactive calculator in the original post.](${canonicalUrl(slug)})**`,
    )
    .replaceAll(
      /<ArticleTable\b([^>]*)>\s*([\s\S]*?)\s*<\/ArticleTable>/g,
      (_, attributes, table) => {
        const caption = attribute(attributes, "caption");
        return caption ? `**${caption}**\n\n${table}` : table;
      },
    )
    .replaceAll(
      /\]\(((?:\/|#|https:\/\/construct\.computer)[^)\s]*)(\s+"[^"]*")?\)/g,
      (_, href, title = "") =>
        `](${trackedUrl(href, utmSource, slug)}${title})`,
    );
}

/**
 * A post's body as plain Markdown. `titles` maps the slug of every live post
 * to its title, so a "read next" card can become a link; a card pointing at a
 * post that is not live is dropped. `utmSource` tags links back to the site
 * with where the copy was read. Throws on markup it does not recognise,
 * because publishing a stray component as literal text is worse than stopping.
 */
export function toMarkdown(body, { slug, utmSource, titles }) {
  const parts = body.split(fence);
  const markdown = parts
    // Odd parts are fenced code blocks, which are left exactly as written.
    .map((part, index) =>
      index % 2 === 1 ? part : convert(part, { slug, utmSource, titles }),
    )
    .join("")
    .replaceAll(/[\t ]+$/gm, "")
    .replaceAll(/\n{3,}/g, "\n\n")
    .trim();

  const prose = markdown
    .split(fence)
    .filter((_, index) => index % 2 === 0)
    .join("")
    .replaceAll(/`[^`\n]*`/g, "");
  const leftover =
    prose.match(/<\/?[A-Za-z][\w-]*(?=[\s/>])[^>]*>?/) ??
    prose.match(/(?<!\\)\{[^\n]{0,40}/);
  if (leftover)
    throw new Error(
      `${slug}: markup the syndication script cannot convert: ${leftover[0]}`,
    );

  const original = trackedUrl(canonicalUrl(slug), utmSource, slug);
  return `${markdown}\n\n*Originally published at [construct.computer](${original}).*`;
}

/** HTML for the feed, which takes markup and not Markdown. */
export function toHtml(markdown) {
  return marked.parse(markdown, { gfm: true });
}
