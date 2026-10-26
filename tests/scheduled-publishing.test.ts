import { describe, expect, it } from "vitest";

import { blogMetadata } from "../app/content/blog/metadata.generated";
import { contentDate, contentTime } from "../app/content/content-date";
import {
  isLiveOn,
  resourceEntries,
  scheduledEntries,
} from "../app/content/resources";
import { canonicalRoutes, upcomingRoutes } from "../app/lib/route-manifest";
import { routeJsonLd } from "../app/lib/seo";
import {
  dueSlugs,
  nextPost,
  scheduleOf,
  timerPlan,
  unpublished,
} from "../scripts/due-posts.mjs";

/**
 * Scheduled publishing: a finished post (`draft: false`) dated ahead stays out
 * of the site until the first build on or after its date, then appears in
 * every list, feed, and route without anyone editing it.
 */
describe("scheduled publishing", () => {
  it("goes live on its date, not before, and never while a draft", () => {
    const post = { draft: false, published: "2026-10-05" };
    expect(isLiveOn(post, "2026-10-04")).toBe(false);
    expect(isLiveOn(post, "2026-10-05")).toBe(true);
    expect(isLiveOn(post, "2026-11-01")).toBe(true);
    expect(isLiveOn({ ...post, draft: true }, "2026-11-01")).toBe(false);
  });

  it("waits for its time on its date", () => {
    const post = { draft: false, published: "2026-11-03", time: "15:40" };
    expect(isLiveOn(post, "2026-11-03", "15:39")).toBe(false);
    expect(isLiveOn(post, "2026-11-03", "15:40")).toBe(true);
    expect(isLiveOn(post, "2026-11-02", "23:59")).toBe(false);
    expect(isLiveOn(post, "2026-11-04", "00:00")).toBe(true);
    // A day on its own means the whole day, as CONTENT_DATE previews do.
    expect(isLiveOn(post, "2026-11-03")).toBe(true);
  });

  it("builds for a real UTC moment", () => {
    expect(contentDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(contentTime).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
  });

  it("dates timed posts to the minute in structured data", () => {
    const timed = canonicalRoutes.find(
      (route) => route.publishedAt && route.publishedAt !== route.published,
    );
    if (!timed) return;
    const posting = routeJsonLd(timed).find(
      (node) => node["@type"] === "BlogPosting",
    );
    expect(posting?.datePublished).toBe(timed.publishedAt);
  });

  it("splits finished posts into live and scheduled by the build moment", () => {
    expect(
      resourceEntries.every((entry) =>
        isLiveOn({ ...entry, draft: false }, contentDate, contentTime),
      ),
    ).toBe(true);
    expect(
      scheduledEntries.every(
        (entry) =>
          !isLiveOn({ ...entry, draft: false }, contentDate, contentTime),
      ),
    ).toBe(true);
    const finished = blogMetadata.filter((post) => !post.draft).length;
    expect(resourceEntries.length + scheduledEntries.length).toBe(finished);
  });

  it("keeps scheduled posts out of the site until their date", () => {
    const live = new Set(canonicalRoutes.map((route) => route.path));
    for (const entry of scheduledEntries) {
      expect(live.has(`/blog/${entry.slug}`), entry.slug).toBe(false);
      expect(
        upcomingRoutes.some((route) => route.path === `/blog/${entry.slug}`),
        entry.slug,
      ).toBe(true);
    }
  });
});

/**
 * The quarter-hourly CI check (`scripts/due-posts.mjs`) deploys only when a
 * post has come due and the live sitemap does not list it yet.
 */
describe("due post check", () => {
  const posts = [
    { slug: "early", draft: false, published: "2026-11-03" },
    { slug: "timed", draft: false, published: "2026-11-03", time: "15:40" },
    { slug: "held", draft: true, published: "2026-11-01" },
  ];

  it("reads the schedule from frontmatter", () => {
    expect(
      scheduleOf(
        '---\ntitle: "A"\npublished: "2026-11-03"\ntime: "15:40"\ndraft: false\n---\nBody',
      ),
    ).toEqual({ published: "2026-11-03", time: "15:40", draft: false });
  });

  it("finds finished posts whose moment has passed", () => {
    expect(dueSlugs(posts, new Date("2026-11-03T15:39:00Z"))).toEqual([
      "early",
    ]);
    expect(dueSlugs(posts, new Date("2026-11-03T15:40:00Z"))).toEqual([
      "early",
      "timed",
    ]);
  });

  it("asks for a deploy only for due posts the live site lacks", () => {
    const sitemap =
      "<urlset><url><loc>https://construct.computer/blog/early/</loc></url></urlset>";
    expect(unpublished(["early", "timed"], sitemap)).toEqual(["timed"]);
    expect(unpublished(["early"], sitemap)).toEqual([]);
  });

  it("finds the next finished post after now", () => {
    expect(nextPost(posts, new Date("2026-11-03T12:00:00Z"))).toEqual({
      slug: "timed",
      at: new Date("2026-11-03T15:40:00Z"),
    });
    expect(nextPost(posts, new Date("2026-11-03T15:40:00Z"))).toBeUndefined();
  });

  it("plans the timer's wait: publish, hand over, or stop", () => {
    const at = new Date("2026-11-03T15:40:00Z");
    const hoursBefore = (hours: number) =>
      new Date(at.getTime() - hours * 60 * 60 * 1000);
    expect(timerPlan({ at }, hoursBefore(1))).toEqual({
      action: "publish",
      seconds: 3660,
    });
    expect(timerPlan({ at }, hoursBefore(10))).toEqual({
      action: "relay",
      seconds: 19800,
    });
    expect(timerPlan({ at }, hoursBefore(30))).toEqual({
      action: "stop",
      seconds: 0,
    });
    expect(timerPlan(undefined, at)).toEqual({ action: "stop", seconds: 0 });
  });
});
