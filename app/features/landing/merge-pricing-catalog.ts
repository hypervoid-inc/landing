import {
  annualMonthsFree,
  annualMonthlyEquivalent,
} from "../../platform/api/billing";
import type {
  CatalogMoney,
  CatalogPlan,
  PaidPlanId,
} from "../../platform/api/schemas";
import { pricingPlans, type PricingIcon } from "../../content/landing";

export type PricingPlanView = {
  id: PaidPlanId;
  name: string;
  price: string;
  annualMonthlyPrice: string;
  annualSavingsLabel: string;
  cta: string;
  description: string;
  badge: string | null;
  /** Fallback highlight when live trial days are unknown. */
  highlight: string | null;
  trialDaysMonth: number | null;
  trialDaysYear: number | null;
  image: string;
  imageAlt: string;
  features: ReadonlyArray<readonly [string, PricingIcon]>;
};

const NAME_TO_ID: Record<string, PaidPlanId> = {
  Lite: "lite",
  Starter: "starter",
  Pro: "pro",
};

/** Landing ticker style: `$9` / `$7.50` for USD; Intl otherwise. */
export function formatLandingPrice(
  money: CatalogMoney | null | undefined,
): string | null {
  if (!money) return null;
  const major = money.amount / 100;
  const hasCents = money.amount % 100 !== 0;
  if (money.currency.toUpperCase() === "USD") {
    return hasCents ? `$${major.toFixed(2)}` : `$${Math.round(major)}`;
  }
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: money.currency,
      minimumFractionDigits: hasCents ? 2 : 0,
      maximumFractionDigits: hasCents ? 2 : 0,
    }).format(major);
  } catch {
    return `${major.toFixed(hasCents ? 2 : 0)} ${money.currency}`;
  }
}

function trialHighlight(days: number | null | undefined): string | null {
  if (days == null || days <= 0) return null;
  return `${days}-day trial`;
}

export function trialHighlightForPeriod(
  plan: PricingPlanView,
  period: "monthly" | "annual",
): string | null {
  return trialHighlight(
    period === "annual" ? plan.trialDaysYear : plan.trialDaysMonth,
  );
}

function savingsLabel(months: number | null): string {
  if (months == null) return "";
  return `${months} ${months === 1 ? "month" : "months"} free`;
}

/** Static marketing + optional live catalog → cards for `#pricing`. */
export function mergePricingPlans(
  catalog: CatalogPlan[] | null,
  recommendedPlan: PaidPlanId | "starter" | "pro" | null,
): PricingPlanView[] {
  const byId = new Map(catalog?.map((p) => [p.id, p]) ?? []);

  return pricingPlans.map((staticPlan) => {
    const id = NAME_TO_ID[staticPlan.name] ?? "lite";
    const live = byId.get(id);
    if (!live) {
      return {
        id,
        name: staticPlan.name,
        price: staticPlan.price,
        annualMonthlyPrice: staticPlan.annualMonthlyPrice,
        annualSavingsLabel: staticPlan.annualSavingsLabel,
        cta: staticPlan.cta,
        description: staticPlan.description,
        badge: staticPlan.badge,
        highlight: staticPlan.highlight,
        trialDaysMonth: null,
        trialDaysYear: null,
        image: staticPlan.image,
        imageAlt: staticPlan.imageAlt,
        features: staticPlan.features,
      };
    }

    const monthPrice = formatLandingPrice(live.month.price) ?? staticPlan.price;
    const yearEquiv =
      formatLandingPrice(annualMonthlyEquivalent(live.year?.price ?? null)) ??
      staticPlan.annualMonthlyPrice;
    const months = annualMonthsFree(live.month.price, live.year?.price);
    const badge =
      recommendedPlan && id === recommendedPlan ? "Recommended" : null;

    return {
      id,
      name: staticPlan.name,
      price: monthPrice,
      annualMonthlyPrice: yearEquiv,
      annualSavingsLabel:
        months != null ? savingsLabel(months) : staticPlan.annualSavingsLabel,
      cta: staticPlan.cta,
      description: staticPlan.description,
      badge,
      highlight: null,
      trialDaysMonth: live.month.trialDays,
      trialDaysYear: live.year?.trialDays ?? null,
      image: staticPlan.image,
      imageAlt: staticPlan.imageAlt,
      features: staticPlan.features,
    };
  });
}

/** Floor monthly price for the section intro; null if unknown. */
export function pricingFloorLabel(plans: PricingPlanView[]): string | null {
  const lite = plans.find((p) => p.id === "lite");
  return lite?.price ?? plans[0]?.price ?? null;
}

/** Max annual months-free across cards (toggle chip). */
export function maxAnnualMonthsFree(plans: PricingPlanView[]): number | null {
  let max: number | null = null;
  for (const plan of plans) {
    const m = Number(plan.annualSavingsLabel.replace(/[^0-9]/g, ""));
    if (!Number.isFinite(m) || m <= 0) continue;
    if (max == null || m > max) max = m;
  }
  return max;
}
