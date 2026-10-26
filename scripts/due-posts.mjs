// Decides whether a scheduled CI run should rebuild and deploy: yes when a
// finished post's go-live moment (`published` plus `time`, UTC) has passed
// but the live sitemap does not list it yet. Comparing with the live site
// rather than a time window means a delayed or skipped run is caught up by
// the next one. Also plans the publish timer's wait for the next post. Runs
// before `pnpm install`, so it uses Node built-ins only.
//
//   node scripts/due-posts.mjs            prints publish=true|false
//   node scripts/due-posts.mjs --always   prints publish=true (the daily run)
//   node scripts/due-posts.mjs --next     prints action= and seconds= (the timer)
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const siteUrl = "https://construct.computer";

/** Longest single wait: a GitHub job may run six hours, setup included. */
const maxWait = 5.5 * 60 * 60;
/**
 * A post further off than this is left to a later run of the timer, so a
 * week with no posts does not keep a runner asleep the whole time.
 */
const horizon = 20 * 60 * 60;

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

const momentOf = ({ published, time }) =>
  new Date(`${published}T${time ?? "00:00"}:00Z`);

const finished = (posts) =>
  posts.filter(({ draft, published }) => draft === false && published);

/** Slugs of finished posts whose go-live moment is at or before `now`. */
export function dueSlugs(posts, now) {
  return finished(posts)
    .filter((post) => momentOf(post) <= now)
    .map(({ slug }) => slug);
}

/** The finished post that goes live next after `now`, with its moment. */
export function nextPost(posts, now) {
  return finished(posts)
    .map((post) => ({ slug: post.slug, at: momentOf(post) }))
    .filter(({ at }) => at > now)
    .sort((a, b) => a.at - b.at)[0];
}

/**
 * What one run of the publish timer does: sleep until a minute past the next
 * moment and start CI ("publish"), sleep as long as a job may and hand over
 * to a fresh run ("relay"), or end when nothing is due soon ("stop").
 */
export function timerPlan(next, now) {
  if (!next) return { action: "stop", seconds: 0 };
  const seconds = Math.ceil((next.at - now) / 1000) + 60;
  if (seconds > horizon) return { action: "stop", seconds: 0 };
  if (seconds > maxWait) return { action: "relay", seconds: maxWait };
  return { action: "publish", seconds };
}

/** Due slugs the live sitemap does not list yet. */
export function unpublished(slugs, sitemapXml) {
  return slugs.filter(
    (slug) => !sitemapXml.includes(`<loc>${siteUrl}/blog/${slug}/</loc>`),
  );
}

async function readPosts() {
  const directory = path.join(process.cwd(), "app/content/blog");
  const posts = [];
  for (const file of await readdir(directory)) {
    if (!file.endsWith(".mdx")) continue;
    const schedule = scheduleOf(
      await readFile(path.join(directory, file), "utf8"),
    );
    if (schedule) posts.push({ slug: file.slice(0, -4), ...schedule });
  }
  return posts;
}

async function main() {
  if (process.argv.includes("--always")) {
    console.log("publish=true");
    return;
  }
  const posts = await readPosts();
  if (process.argv.includes("--next")) {
    const now = new Date();
    const next = nextPost(posts, now);
    if (next) console.error(`Next: ${next.slug} at ${next.at.toISOString()}`);
    const { action, seconds } = timerPlan(next, now);
    console.log(`action=${action}`);
    console.log(`seconds=${seconds}`);
    return;
  }
  const response = await fetch(`${siteUrl}/sitemap.xml`);
  if (!response.ok) {
    // Cannot tell what is live, so publish rather than risk a missed post.
    console.error(`Live sitemap returned HTTP ${response.status}`);
    console.log("publish=true");
    return;
  }
  const missing = unpublished(
    dueSlugs(posts, new Date()),
    await response.text(),
  );
  for (const slug of missing) console.error(`Due and not live: ${slug}`);
  console.log(`publish=${missing.length > 0}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await main();
}
