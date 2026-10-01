import { describe, expect, it } from "vitest";

import { blogMetadata } from "../app/content/blog/metadata.generated";
import { contentDate } from "../app/content/content-date";
import {
  isLiveOn,
  resourceEntries,
  scheduledEntries,
} from "../app/content/resources";
import { canonicalRoutes, upcomingRoutes } from "../app/lib/route-manifest";

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

  it("builds for a real UTC day", () => {
    expect(contentDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("splits finished posts into live and scheduled by the build date", () => {
    expect(
      resourceEntries.every((entry) => entry.published <= contentDate),
    ).toBe(true);
    expect(
      scheduledEntries.every((entry) => entry.published > contentDate),
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
