import { describe, expect, it } from "vitest";

import {
  productHuntCopy,
  productHuntFollowUrl,
  productHuntHref,
  productHuntUrl,
  type ProductHuntSurface,
} from "./config";

const SURFACES: ProductHuntSurface[] = [
  "banner",
  "footer",
  "embed",
  "hero",
  "launch",
  "blog",
  "shortlink",
];

describe("productHuntHref", () => {
  it("sends every on-site surface through /ph, never straight to Product Hunt", () => {
    for (const surface of SURFACES) {
      const href = productHuntHref(surface);
      expect(href.startsWith("/ph?")).toBe(true);
      expect(href).not.toContain("producthunt.com");
    }
  });

  it("carries the same attribution /ph forwards to Product Hunt", () => {
    const banner = new URL(productHuntHref("banner"), "https://construct.computer");
    expect(banner.pathname).toBe("/ph");
    expect(banner.searchParams.get("utm_source")).toBe("banner");
    expect(banner.searchParams.get("utm_medium")).toBe("badge");
    expect(banner.searchParams.get("utm_campaign")).toBe(
      "badge-construct-computer",
    );
    expect(banner.searchParams.get("utm_content")).toBe("banner");

    const footer = new URL(productHuntHref("footer"), "https://construct.computer");
    expect(footer.searchParams.get("utm_source")).toBe("badge-featured");
    expect(footer.searchParams.get("utm_medium")).toBe("badge");
  });
});

describe("productHuntCopy", () => {
  it("keeps pre-launch follow language", () => {
    expect(productHuntCopy("pre")).toEqual({
      eyebrow: "Launching on Product Hunt",
      cta: "Follow our launch",
      bannerRegion: "Launching on Product Hunt",
      bannerLead: "Launching on Product Hunt in",
      bannerLeadShort: "Launching in",
      homepageLead:
        "We’re launching on Product Hunt soon. Follow Construct so you don’t miss day one.",
      launchSecondary: "Follow our Product Hunt launch",
    });
  });

  it("celebrates product of the day in live, without asking for upvotes", () => {
    const copy = productHuntCopy("live");
    const joined = Object.values(copy).join(" ");
    expect(copy.bannerRegion).toMatch(/#1 Product of the Day/i);
    // Never name the mechanic: thank supporters, don’t talk about votes.
    expect(joined).not.toMatch(/upvote|\bvot(e|es|ed|ers?|ing)\b/i);
    expect(joined).not.toMatch(/we’re live|we're live/i);
  });

  it("never repeats a visible line across fields, in either phase", () => {
    // Reusing one string across eyebrow / title / lead is how a card ends up
    // printing the same sentence three times. `bannerRegion` is an accessible
    // name rather than visible copy, so it is allowed to echo a visible line.
    for (const phase of ["pre", "live"] as const) {
      const values = Object.entries(productHuntCopy(phase))
        .filter(([field]) => field !== "bannerRegion")
        .map(([, line]) => line);
      expect(new Set(values).size, phase).toBe(values.length);
    }
  });

  it("keeps every visible live line off the award the badge already states", () => {
    const { bannerRegion, ...visible } = productHuntCopy("live");
    // `bannerRegion` is the accessible name, not visible copy, so it is the
    // one field that may name the award in words.
    expect(bannerRegion).toMatch(/#1 Product of the Day/i);
    for (const line of Object.values(visible)) {
      expect(line, line).not.toMatch(/product of the day/i);
    }
  });
});

describe("productHuntUrl / productHuntFollowUrl", () => {
  it("remain the Product Hunt destinations /ph itself redirects to", () => {
    expect(new URL(productHuntUrl("shortlink")).origin).toBe(
      "https://www.producthunt.com",
    );
    expect(new URL(productHuntFollowUrl("shortlink")).origin).toBe(
      "https://www.producthunt.com",
    );
  });
});
