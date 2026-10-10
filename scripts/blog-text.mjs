/**
 * Writes a blog post as plain Markdown, ready to paste into another platform.
 *
 *   pnpm blog:text <slug> [--source medium]
 *
 * The site's own components are removed or rewritten, links back to the site
 * are made absolute, and `--source` names the platform in their UTM tags. The
 * file lands in `syndication/<slug>.md`, which is not committed. Set the
 * platform's canonical link to the post's URL where it offers one.
 */
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { parseArgs } from "node:util";

import { canonicalUrl, parsePost, toMarkdown } from "./syndicate/transform.mjs";

const root = process.cwd();
const blogDirectory = path.join(root, "app/content/blog");
const today = new Date().toISOString().slice(0, 10);

const { values: options, positionals } = parseArgs({
  allowPositionals: true,
  options: { source: { type: "string", default: "syndication" } },
});

const posts = await Promise.all(
  (await readdir(blogDirectory))
    .filter((name) => name.endsWith(".mdx"))
    .map(async (filename) => ({
      slug: filename.slice(0, -4),
      ...parsePost(await readFile(path.join(blogDirectory, filename), "utf8")),
    })),
);

const [slug] = positionals;
const post = posts.find((candidate) => candidate.slug === slug);
if (!post) {
  console.error(
    slug
      ? `No post named "${slug}" in app/content/blog/.`
      : "Usage: pnpm blog:text <slug> [--source medium]",
  );
  process.exit(1);
}

const titles = Object.fromEntries(
  posts
    .filter(
      ({ frontmatter }) => !frontmatter.draft && frontmatter.published <= today,
    )
    .map((candidate) => [candidate.slug, candidate.frontmatter.title]),
);
const markdown = toMarkdown(post.body, {
  slug,
  utmSource: options.source,
  titles,
});

const file = path.join(root, "syndication", `${slug}.md`);
await mkdir(path.dirname(file), { recursive: true });
await writeFile(file, `# ${post.frontmatter.title}\n\n${markdown}\n`);
console.log(`Wrote ${path.relative(root, file)}`);
console.log(`Canonical link: ${canonicalUrl(slug)}`);
