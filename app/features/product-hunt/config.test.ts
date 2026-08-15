import { describe, expect, it } from "vitest";

import {
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
