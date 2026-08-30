import { describe, expect, it } from "vitest";

import {
  PH_DAILY_AWARD,
  PH_WEEKLY_AWARD,
  productHuntHref,
  type ProductHuntSurface,
} from "./config";

const SURFACES: ProductHuntSurface[] = [
  "home-corner",
  "home-mobile-hero",
  "footer",
  "blog-article",
];

describe("permanent Product Hunt proof", () => {
  it("links every placement directly to the product page", () => {
    for (const surface of SURFACES) {
      for (const award of ["daily", "weekly-productivity"] as const) {
        const url = new URL(productHuntHref(surface, award));
        expect(url.origin).toBe("https://www.producthunt.com");
        expect(url.pathname).toBe("/products/construct-computer");
        expect(url.searchParams.get("embed")).toBe("true");
        expect(url.searchParams.get("utm_content")).toBe(surface);
        expect(url.searchParams.get("utm_campaign")).toBe(
          "badge-construct-computer",
        );
      }
    }
  });

  it("keeps both permanent award claims explicit", () => {
    expect(PH_DAILY_AWARD).toBe("#1 Product of the Day");
    expect(PH_WEEKLY_AWARD).toBe("#5 Productivity App of the Week");
  });
});
