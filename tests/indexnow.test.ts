import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { changedUrls, indexNowKey } from "../scripts/indexnow.mjs";

const sitemap = (entries: Record<string, string>) =>
  `<urlset>${Object.entries(entries)
    .map(
      ([loc, lastmod]) =>
        `<url><loc>${loc}</loc><lastmod>${lastmod}</lastmod></url>`,
    )
    .join("")}</urlset>`;

describe("IndexNow", () => {
  it("submits only URLs a deploy added, re-dated or removed", () => {
    const before = sitemap({
      "https://construct.computer/": "2026-10-01",
      "https://construct.computer/blog/": "2026-10-11",
      "https://construct.computer/blog/kept/": "2026-10-01",
      "https://construct.computer/blog/gone/": "2026-10-01",
    });
    const after = sitemap({
      "https://construct.computer/": "2026-10-01",
      "https://construct.computer/blog/": "2026-10-12",
      "https://construct.computer/blog/kept/": "2026-10-01",
      "https://construct.computer/blog/new/": "2026-10-12",
    });
    expect(changedUrls(before, after)).toEqual([
      "https://construct.computer/blog/",
      "https://construct.computer/blog/new/",
      "https://construct.computer/blog/gone/",
    ]);
  });

  it("submits everything when there is no previous sitemap", () => {
    const after = sitemap({ "https://construct.computer/": "2026-10-01" });
    expect(changedUrls("", after)).toEqual(["https://construct.computer/"]);
  });

  it("serves the key file the submissions point at", () => {
    const file = new URL(`../public/${indexNowKey}.txt`, import.meta.url);
    expect(readFileSync(file, "utf8").trim()).toBe(indexNowKey);
  });
});
