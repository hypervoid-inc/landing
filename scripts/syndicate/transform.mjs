/**
 * Turns a blog post's MDX into a copy another platform can take. The site
 * renders posts with its own components (CTAs, captioned tables, figures,
 * calculators); none of those exist off-site, so each is either dropped or
 * rewritten as plain Markdown. Kept free of file and network access so
 * `tests/syndicate.test.ts` can run it directly.
 */
import { marked } from "marked";

export const siteUrl = "https://construct.computer";

/**
 * `length: "teaser"` marks platforms with no canonical-link setting. A full
 * copy there would compete with the original in search, so they get the intro
 * and a link back. `tables: false` marks editors that cannot hold a table.
 */
export const platforms = {
  devto: { label: "dev.to", format: "markdown", length: "full", tables: true },
  hashnode: {
    label: "Hashnode",
    format: "markdown",
    length: "full",
    tables: true,
  },
  medium: { label: "Medium", format: "html", length: "full", tables: false },
  substack: {
    label: "Substack",
    format: "html",
    length: "teaser",
    tables: false,
  },
  linkedin: {
    label: "LinkedIn",
    format: "html",
    length: "teaser",
    tables: false,
  },
  x: { label: "X Articles", format: "html", length: "teaser", tables: false },
};

/** Days a post must be live on the site before a copy goes anywhere else. */
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
 * Whether a post may be syndicated on `today` (YYYY-MM-DD, UTC). `hard`
 * reasons cannot be overridden: a post that is not live has no original for
 * the copy to point at.
 */
export function eligibility(post, today) {
  if (post.draft) return { ok: false, hard: true, reason: "it is a draft" };
  if (post.published > today)
    return {
      ok: false,
      hard: true,
      reason: `it is not live until ${post.published}`,
    };
  if (post.kind === "comparison")
    return {
      ok: false,
      hard: false,
      reason:
        "it is a comparison page, which should rank on our own domain only",
    };
  const age = Math.floor(
    (Date.parse(`${today}T00:00:00Z`) -
      Date.parse(`${post.published}T00:00:00Z`)) /
      86_400_000,
  );
  if (age < minimumAgeDays)
    return {
      ok: false,
      hard: false,
      reason: `it went live ${age} day(s) ago; wait ${minimumAgeDays} so the original is indexed first`,
    };
  return { ok: true };
}

/** dev.to allows four tags, letters and digits only. */
export function devtoTags(tags) {
  const cleaned = tags.map((tag) =>
    tag.toLowerCase().replace(/[^a-z0-9]/g, ""),
  );
  return [...new Set(["ai", ...cleaned])].filter(Boolean).slice(0, 4);
}

const fence = /(^```[^\n]*\n[\s\S]*?^```[ \t]*$)/m;

/** Applies `transform` to everything except fenced code blocks. */
function outsideCode(text, transform) {
  return text
    .split(fence)
    .map((part, index) => (index % 2 === 1 ? part : transform(part)))
    .join("");
}

function attribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
}

function trackedUrl(href, platform, slug) {
  const url = new URL(href, canonicalUrl(slug));
  if (url.origin !== siteUrl) return href;
  // Images, PDFs and data files are not pages, so there is no visit to tag.
  if (/\.[a-z0-9]+$/i.test(url.pathname)) return url.href;
  url.searchParams.set("utm_source", platform);
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

function splitRow(line) {
  return line
    .trim()
    .replace(/^\||\|$/g, "")
    .split(/(?<!\\)\|/)
    .map((cell) => cell.trim().replaceAll("\\|", "|"));
}

/** Rewrites GFM tables as lists, for editors that cannot hold a table. */
export function tablesToLists(markdown) {
  return outsideCode(markdown, (text) =>
    text.replaceAll(
      /^\|.*\|[ \t]*\n\|[ \t:|-]+\|[ \t]*\n(?:\|.*\|[ \t]*(?:\n|$))+/gm,
      (table) => {
        const [header, , ...rows] = table.trim().split("\n").map(splitRow);
        if (header.length === 2)
          return `${rows.map(([key, value]) => `- **${key}:** ${value}`).join("\n")}\n`;
        return `${rows
          .map(
            ([first, ...rest]) =>
              `**${first}**\n\n${rest.map((cell, index) => `- ${header[index + 1]}: ${cell}`).join("\n")}`,
          )
          .join("\n\n")}\n`;
      },
    ),
  );
}

/**
 * Plain Markdown for one platform. `titles` maps the slug of every live post
 * to its title, so a "read next" card can become a link; a card pointing at a
 * post that is not live is dropped. Throws on markup it does not recognise,
 * because publishing a stray component as literal text is worse than stopping.
 */
export function toMarkdown(body, { slug, platform, titles }) {
  const markdown = outsideCode(body, (text) =>
    text
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
          `](${trackedUrl(href, platform, slug)}${title})`,
      ),
  )
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

  return platforms[platform].tables ? markdown : tablesToLists(markdown).trim();
}

const closingSections =
  /^(sources|references|faq|frequently asked questions)$/i;

/** The intro, the section list, and a link to the rest. */
export function toTeaser(markdown, url) {
  const intro = markdown.split(/^## /m)[0].trim();
  const sections = [...markdown.matchAll(/^## (.+)$/gm)]
    .map((match) => match[1].trim())
    .filter((heading) => !closingSections.test(heading));
  return [
    intro,
    sections.length > 0 &&
      `**In the full post:**\n\n${sections.map((heading) => `- ${heading}`).join("\n")}`,
    `**[Read the full post on construct.computer](${url})**`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** HTML for feeds and paste pages, which take markup and not Markdown. */
export function toHtml(markdown) {
  return marked.parse(markdown, { gfm: true });
}

function html(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const pasteNotes = {
  medium: (canonical) =>
    `Paste into a new story. Then open Story settings, Advanced settings, Customize canonical link, and set it to <code>${canonical}</code> before publishing.`,
  teaser: () =>
    "This platform has no canonical-link setting, so this is the intro with a link to the full post. Do not paste the full article here.",
};

/**
 * A page to open in a browser and copy from. Rich-text editors keep headings,
 * links and lists from copied HTML, which they do not from pasted Markdown.
 */
function pastePage({ platform, title, description, markdown, canonical }) {
  const { label, length } = platforms[platform];
  const note = (pasteNotes[platform] ?? pasteNotes[length])(canonical);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${html(title)} (${label})</title>
    <style>
      body { font: 17px/1.6 system-ui, sans-serif; max-width: 44rem; margin: 2rem auto; padding: 0 1rem; }
      aside { background: #f4f4f5; border-radius: 8px; padding: 1rem; margin-bottom: 2rem; font-size: 15px; }
      img { max-width: 100%; height: auto; }
      button { font: inherit; padding: 0.4rem 0.9rem; cursor: pointer; }
    </style>
  </head>
  <body>
    <aside>
      <p><strong>${label}.</strong> ${note}</p>
      <p><strong>Title:</strong> ${html(title)}</p>
      <p><strong>Subtitle:</strong> ${html(description)}</p>
      <button type="button" id="copy">Copy article</button>
    </aside>
    <article id="article">
${toHtml(markdown)}
    </article>
    <script>
      document.getElementById("copy").addEventListener("click", (event) => {
        const range = document.createRange();
        range.selectNodeContents(document.getElementById("article"));
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        document.execCommand("copy");
        event.target.textContent = "Copied";
      });
    </script>
  </body>
</html>
`;
}

/**
 * Everything needed to post `source` (a post's raw MDX) to one platform: the
 * file to write, and the fields the publishing APIs take.
 */
export function buildCopy({ slug, source, platform, titles, coverImage }) {
  const { frontmatter, body } = parsePost(source);
  const { format, length } = platforms[platform];
  const canonical = canonicalUrl(slug);
  const tracked = trackedUrl(canonical, platform, slug);
  const converted = toMarkdown(body, { slug, platform, titles });
  const markdown =
    length === "teaser"
      ? toTeaser(converted, tracked)
      : `${converted}\n\n*Originally published at [construct.computer](${tracked}).*`;
  const copy = {
    platform,
    title: frontmatter.title,
    description: frontmatter.description,
    tags: frontmatter.tags,
    canonical,
    coverImage,
    markdown,
  };

  if (format === "html")
    return {
      ...copy,
      filename: `${platform}.html`,
      content: pastePage({ ...copy, platform }),
    };
  if (platform !== "devto")
    return { ...copy, filename: `${platform}.md`, content: `${markdown}\n` };
  const header = [
    `title: ${JSON.stringify(frontmatter.title)}`,
    "published: false",
    `description: ${JSON.stringify(frontmatter.description)}`,
    `tags: ${devtoTags(frontmatter.tags).join(", ")}`,
    `canonical_url: ${canonical}`,
    coverImage && `cover_image: ${coverImage}`,
  ].filter(Boolean);
  return {
    ...copy,
    filename: "devto.md",
    content: `---\n${header.join("\n")}\n---\n\n${markdown}\n`,
  };
}
