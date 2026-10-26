// Decides whether a scheduled CI run should rebuild and deploy: yes when a
// finished post's go-live moment (`published` plus `time`, UTC) has passed
// but the live sitemap does not list it yet. Comparing with the live site
// rather than a time window means a delayed or skipped run is caught up by
// the next one. Runs before `pnpm install`, so it uses Node built-ins only.
//
//   node scripts/due-posts.mjs            prints publish=true|false
//   node scripts/due-posts.mjs --always   prints publish=true (the daily run)
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const siteUrl = "https://construct.computer";

/** The scheduling fields of one post, from its single-line JSON frontmatter. */
export function scheduleOf(source) {
  const match = /^---\n([\s\S]*?)\n---/.exec(source);
  if (!match) return undefined;
  const values = {};
  for (const line of match[1].split("\n")) {
    const separator = line.indexOf(":");
    const key = line.slice(0, separator).trim();
    if (["published", "time", "draft"].includes(key)) {
      values[key] = JSON.parse(line.slice(separator + 1).trim());
    }
  }
  return values;
}

/** Slugs of finished posts whose go-live moment is at or before `now`. */
export function dueSlugs(posts, now) {
  return posts
    .filter(
      ({ draft, published, time }) =>
        draft === false &&
        published &&
        new Date(`${published}T${time ?? "00:00"}:00Z`) <= now,
    )
    .map(({ slug }) => slug);
}

/** Due slugs the live sitemap does not list yet. */
export function unpublished(slugs, sitemapXml) {
  return slugs.filter(
    (slug) => !sitemapXml.includes(`<loc>${siteUrl}/blog/${slug}/</loc>`),
  );
}

async function main() {
  if (process.argv.includes("--always")) {
    console.log("publish=true");
    return;
  }
  const directory = path.join(process.cwd(), "app/content/blog");
  const posts = [];
  for (const file of await readdir(directory)) {
    if (!file.endsWith(".mdx")) continue;
    const schedule = scheduleOf(
      await readFile(path.join(directory, file), "utf8"),
    );
    if (schedule) posts.push({ slug: file.slice(0, -4), ...schedule });
  }
  const response = await fetch(`${siteUrl}/sitemap.xml`);
  if (!response.ok) {
    // Cannot tell what is live, so publish rather than risk a missed post.
    console.error(`Live sitemap returned HTTP ${response.status}`);
    console.log("publish=true");
    return;
  }
  const missing = unpublished(dueSlugs(posts, new Date()), await response.text());
  for (const slug of missing) console.error(`Due and not live: ${slug}`);
  console.log(`publish=${missing.length > 0}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await main();
}
