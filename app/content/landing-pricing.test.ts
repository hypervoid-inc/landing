import { describe, expect, it } from "vitest";

import { annualMonthsFree } from "../platform/api/billing";
import { pricingPlans } from "./landing";

/**
 * The pricing page is prerendered, so its figures are hardcoded rather than
 * fetched — correct for SEO and first paint, but it means marketing copy can
 * drift from the live catalog that /account renders.
 *
 * These bind the copy to `annualMonthsFree`, the same function the account page
 * uses, so changing a price without changing its savings label fails the build.
 */

function dollarsToMinor(value: string): number {
  const parsed = Number(value.replace(/[^0-9.]/g, ""));
  expect(Number.isFinite(parsed)).toBe(true);
  return Math.round(parsed * 100);
}

describe("landing pricing copy", () => {
  it("covers the three paid tiers", () => {
    expect(pricingPlans.map((plan) => plan.name)).toEqual([
      "Lite",
      "Starter",
      "Pro",
    ]);
  });

  it.each(pricingPlans.map((plan) => [plan.name, plan] as const))(
    "%s: the savings label matches the advertised prices",
    (_name, plan) => {
      const monthly = {
        amount: dollarsToMinor(plan.price),
        currency: "USD",
      };
      // The annual figure is quoted per month, so a year costs 12x it.
      const annual = {
        amount: dollarsToMinor(plan.annualMonthlyPrice) * 12,
        currency: "USD",
      };

      const months = annualMonthsFree(monthly, annual);
      expect(months).not.toBeNull();
      expect(plan.annualSavingsLabel).toBe(
        `${months} months free`,
      );
    },
  );

  it.each(pricingPlans.map((plan) => [plan.name, plan] as const))(
    "%s: annual is cheaper per month than monthly",
    (_name, plan) => {
      expect(dollarsToMinor(plan.annualMonthlyPrice)).toBeLessThan(
        dollarsToMinor(plan.price),
      );
    },
  );

  it("orders tiers by increasing price", () => {
    const amounts = pricingPlans.map((plan) => dollarsToMinor(plan.price));
    expect([...amounts].sort((a, b) => a - b)).toEqual(amounts);
  });
});
