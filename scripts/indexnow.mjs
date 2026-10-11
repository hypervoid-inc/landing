// Tells Bing, Yandex, Seznam, Naver and Yep (IndexNow shares submissions
// between them) which pages changed in this deploy, so they recrawl now
// instead of whenever they next read the sitemap. Google does not take
// IndexNow; it reads the sitemap.
//
// Run after `wrangler pages deploy`, with the sitemap that was live before it:
//   node scripts/indexnow.mjs <previous-sitemap.xml>
// A missing or empty previous sitemap submits every URL, so
// `node scripts/indexnow.mjs /dev/null` resubmits the whole site.
//
// Cloudflare Crawler Hints cannot do this for us: it reports a URL on a cache
// MISS, and Pages serves our HTML as DYNAMIC, so it never sees one.
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

// Public by design: the key only proves we own the host, and it is served
// from public/<key>.txt for anyone to read.
export const indexNowKey = "4f4cf45200d8fc35b732a9af1c7df772";
const host = "construct.computer";

/** `<loc>` to `<lastmod>` for every URL in a sitemap we generated. */
export function sitemapEntries(xml) {
  const entries = new Map();
  for (const [, block] of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = /<loc>(.*?)<\/loc>/.exec(block)?.[1];
    if (!loc) continue;
    entries.set(
      loc.replaceAll("&amp;", "&").replaceAll("&apos;", "'"),
      /<lastmod>(.*?)<\/lastmod>/.exec(block)?.[1] ?? "",
    );
  }
  return entries;
}

/** URLs added, re-dated or removed between two sitemaps. */
export function changedUrls(previousXml, nextXml) {
  const previous = sitemapEntries(previousXml);
  const next = sitemapEntries(nextXml);
  const changed = [...next].filter(
    ([url, lastmod]) => previous.get(url) !== lastmod,
  );
  const removed = [...previous.keys()].filter((url) => !next.has(url));
  return [...changed.map(([url]) => url), ...removed];
}

async function main() {
  const previousPath = process.argv[2];
  if (!previousPath)
    throw new Error("Usage: node scripts/indexnow.mjs <previous-sitemap.xml>");
  const previous = await readFile(previousPath, "utf8").catch(() => "");
  const next = await readFile(
    path.join(process.cwd(), "build/client/sitemap.xml"),
    "utf8",
  );
  const urlList = changedUrls(previous, next);
  if (urlList.length === 0) {
    console.log("IndexNow: no sitemap changes, nothing to submit.");
    return;
  }

  const response = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host,
      key: indexNowKey,
      keyLocation: `https://${host}/${indexNowKey}.txt`,
      urlList,
    }),
  });
  // 200 accepted, 202 accepted while the key is still being verified.
  if (response.status === 200 || response.status === 202) {
    console.log(
      `IndexNow: submitted ${urlList.length} URL(s), HTTP ${response.status}.`,
    );
    for (const url of urlList) console.log(`  ${url}`);
    return;
  }
  // The site is already live, so a failed ping should not fail the deploy,
  // but it should show up on the run.
  console.log(
    `::warning::IndexNow returned HTTP ${response.status}: ${await response.text()}`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();
