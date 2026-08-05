import { describe, expect, it } from "vitest";

import type { CatalogPlan } from "../../platform/api/schemas";
import {
  formatLandingPrice,
  maxAnnualMonthsFree,
  mergePricingPlans,
  pricingFloorLabel,
  trialHighlightForPeriod,
} from "./merge-pricing-catalog";

const CATALOG: CatalogPlan[] = [
  {
    id: "lite",
    name: "Lite",
    limits: {} as CatalogPlan["limits"],
    month: {
      price: { amount: 900, currency: "USD" },
      listPrice: null,
      display: null,
      trialDays: null,
    },
    year: {
      price: { amount: 9000, currency: "USD" },
      listPrice: null,
      display: null,
      trialDays: null,
    },
  },
  {
    id: "starter",
    name: "Starter",
    limits: {} as CatalogPlan["limits"],
    month: {
      price: { amount: 5900, currency: "USD" },
      listPrice: null,
      display: null,
      trialDays: null,
    },
    year: {
      price: { amount: 46800, currency: "USD" },
      listPrice: null,
      display: null,
      trialDays: null,
    },
  },
  {
    id: "pro",
    name: "Pro",
    limits: {} as CatalogPlan["limits"],
    month: {
      price: { amount: 29900, currency: "USD" },
      listPrice: null,
      display: null,
      trialDays: 7,
    },
    year: {
      price: { amount: 238800, currency: "USD" },
      listPrice: null,
      display: null,
      trialDays: 7,
    },
  },
];

describe("formatLandingPrice", () => {
  it("formats whole USD dollars without cents", () => {
    expect(formatLandingPrice({ amount: 900, currency: "USD" })).toBe("$9");
  });

  it("keeps cents for fractional USD", () => {
    expect(formatLandingPrice({ amount: 750, currency: "USD" })).toBe("$7.50");
  });
});

describe("mergePricingPlans", () => {
  it("falls back to static commercials when catalog is null", () => {
    const plans = mergePricingPlans(null, "starter");
    expect(plans.map((p) => p.price)).toEqual(["$9", "$59", "$299"]);
    expect(plans.find((p) => p.id === "starter")?.badge).toBe("Recommended");
    expect(plans.find((p) => p.id === "lite")?.highlight).toBe("7-day trial");
  });

  it("merges live prices, recommended badge, and trial days", () => {
    const plans = mergePricingPlans(CATALOG, "pro");
    expect(plans.find((p) => p.id === "lite")?.price).toBe("$9");
    expect(plans.find((p) => p.id === "starter")?.annualMonthlyPrice).toBe(
      "$39",
    );
    expect(plans.find((p) => p.id === "pro")?.annualMonthlyPrice).toBe("$199");
    expect(plans.find((p) => p.id === "pro")?.badge).toBe("Recommended");
    expect(plans.find((p) => p.id === "starter")?.badge).toBeNull();
    expect(trialHighlightForPeriod(plans.find((p) => p.id === "pro")!, "monthly")).toBe(
      "7-day trial",
    );
    expect(trialHighlightForPeriod(plans.find((p) => p.id === "lite")!, "monthly")).toBeNull();
  });

  it("computes annual savings labels from live prices", () => {
    const plans = mergePricingPlans(CATALOG, "starter");
    expect(plans.find((p) => p.id === "lite")?.annualSavingsLabel).toBe(
      "2 months free",
    );
    expect(plans.find((p) => p.id === "starter")?.annualSavingsLabel).toBe(
      "4 months free",
    );
  });
});

describe("pricingFloorLabel / maxAnnualMonthsFree", () => {
  it("reads the lite floor and max months-free chip", () => {
    const plans = mergePricingPlans(CATALOG, "starter");
    expect(pricingFloorLabel(plans)).toBe("$9");
    expect(maxAnnualMonthsFree(plans)).toBe(4);
  });
});
