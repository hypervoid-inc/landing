import type {
  BillingInterval,
  BillingPlan,
  CatalogMoney,
} from "../../platform/api/schemas";

export function formatBytes(n: number | undefined | null): string {
  if (n == null) return "-";
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(1)} GB`;
}

/** Minor units to a localized amount. Whole currency units only, no cents. */
export function formatMoney(money: CatalogMoney | null | undefined): string | null {
  if (!money) return null;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: money.currency,
      maximumFractionDigits: 0,
    }).format(money.amount / 100);
  } catch {
    return `${Math.round(money.amount / 100)} ${money.currency.toUpperCase()}`;
  }
}

export function intervalSuffix(interval: BillingInterval): string {
  return interval === "year" ? "/yr" : "/mo";
}

/**
 * The billing API sends epoch milliseconds (Date.parse of Dodo's dates).
 * Unix seconds still read correctly, the same way relativeTime tells them apart.
 */
export function formatEpochDate(value: number | null | undefined): string | null {
  if (value == null) return null;
  const ms = value > 1e12 ? value : value * 1000;
  if (!Number.isFinite(ms)) return null;
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
      new Date(ms),
    );
  } catch {
    return null;
  }
}

/** ISO timestamp (users.created_at) to "March 2026". */
export function formatMemberSince(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "long",
      year: "numeric",
    }).format(new Date(ms));
  } catch {
    return null;
  }
}

/** Relative label for a session instant (ISO string or unix seconds/ms). */
export function relativeTime(
  value: string | number | null | undefined,
): string {
  if (value == null) return "-";
  const epochMs =
    typeof value === "number"
      ? value > 1e12
        ? value
        : value * 1000
      : Date.parse(value);
  if (!Number.isFinite(epochMs)) return "-";
  const deltaMs = epochMs - Date.now();
  const abs = Math.abs(deltaMs);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["minute", 60_000],
  ];
  try {
    const format = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
    for (const [unit, ms] of units) {
      if (abs >= ms) return format.format(Math.round(deltaMs / ms), unit);
    }
    return format.format(0, "minute");
  } catch {
    return "recently";
  }
}

export type PlanTone = "positive" | "warning" | "danger" | "neutral";

/** Status colour never stands alone, the label is always rendered beside it. */
export function planStatusTone(plan: BillingPlan): PlanTone {
  if (plan.paymentError) return "danger";
  if (plan.cancelAtPeriodEnd) return "warning";
  if (plan.status === "on_hold" || plan.status === "past_due") return "danger";
  if (plan.access) return "positive";
  return "neutral";
}

/**
 * The single line answering "what am I on": tier, billing interval, and whether
 * it is ending. Previously this was three separate fragments of prose.
 */
export function planSummary(plan: BillingPlan): string {
  if (plan.plan === "unsubscribed") return "No active plan";
  const interval =
    plan.interval === "year"
      ? "Annual"
      : plan.interval === "month"
        ? "Monthly"
        : null;
  // Non-Dodo grants (admin/manual) aren't a billed cycle, say so instead of
  // implying Monthly/Annual from a missing interval.
  const grant =
    !interval && plan.grantSource !== "dodo" && plan.grantSource !== "none"
      ? "Granted"
      : null;
  return [plan.plan, interval ?? grant].filter(Boolean).join(" · ");
}

/**
 * Catalog list price for the hero, only when we know the real billed interval
 * on a Dodo subscription. Never invent a price from the Monthly/Annual toggle.
 */
export function billedCatalogPriceLabel(
  plan: BillingPlan,
  catalogPrice: CatalogMoney | null | undefined,
): string | null {
  if (plan.grantSource !== "dodo" || plan.interval == null) return null;
  const money = formatMoney(catalogPrice ?? null);
  if (!money) return null;
  return `${money}${intervalSuffix(plan.interval)}`;
}

/** "Renews 12 Mar 2027" vs "Access until 12 Mar 2027", the distinction matters. */
export function renewalLabel(plan: BillingPlan): string | null {
  const date = formatEpochDate(plan.periodEnd);
  if (!date) return null;
  if (plan.cancelAtPeriodEnd) return `Access until ${date}`;
  if (plan.plan === "unsubscribed") return null;
  return `Renews ${date}`;
}

/**
 * Whether to offer the Dodo customer portal. Prefer the API flag; fall back to
 * an active Dodo grant so owners still get Manage plan when capability bits lag.
 */
export function canOpenBillingPortal(plan: BillingPlan): boolean {
  if (plan.canManage) return true;
  return (
    plan.grantSource === "dodo" &&
    plan.plan !== "unsubscribed" &&
    plan.access
  );
}

/** Show the Lite/Starter/Pro picker only when the user can act on it. */
export function canChangeBillingPlan(plan: BillingPlan): boolean {
  return plan.canCheckout || plan.canChangePlan;
}

/**
 * Dodo appends its own `status` to the checkout return URL. These mean the
 * charge didn't go through even though the browser came back on our success
 * URL, so the page must not say the subscription is activating. Same set as
 * the apps' `parseBillingReturn` (packages/construct-domain in v2).
 */
const DECLINED_RETURN_STATUSES = new Set([
  "failed",
  "cancelled",
  "canceled",
  "expired",
  "requires_payment_method",
]);

export type BillingReturnKind = "paid" | "declined" | "card" | "canceled";

/**
 * What a Dodo return means, for /account and the app chooser alike: a
 * canceled checkout first, then our failed status or a declined Dodo status.
 * Null for no `billing_status` or one we don't know, as in the apps.
 */
export function billingReturnKind(
  params: URLSearchParams,
): BillingReturnKind | null {
  const billing = params.get("billing_status")?.toLowerCase();
  if (!billing) return null;
  if (billing === "cancel" || billing === "canceled" || billing === "cancelled") {
    return "canceled";
  }
  if (billing === "failed") return "declined";
  const declined = DECLINED_RETURN_STATUSES.has(
    params.get("status")?.toLowerCase() ?? "",
  );
  if (billing === "success" || billing === "succeeded" || billing === "active") {
    return declined ? "declined" : "paid";
  }
  if (billing === "payment_method") return declined ? "declined" : "card";
  return null;
}

/** Query params a Dodo return adds, dropped once the notice is read. */
export const BILLING_RETURN_PARAMS = [
  "billing_status",
  "subscription_id",
  "payment_id",
  "status",
  "email",
  "license_key",
];

/** A Dodo return's params as `?...`, kept through sign-in; "" for none. */
export function billingReturnSearch(params: URLSearchParams): string {
  if (!params.get("billing_status")) return "";
  const kept = new URLSearchParams();
  for (const key of BILLING_RETURN_PARAMS) {
    const value = params.get(key);
    if (value != null) kept.set(key, value);
  }
  return `?${kept.toString()}`;
}

export type BillingReturnNotice = {
  tone: "info" | "error";
  text: string;
  /** Checkout came back paid; the page polls until the plan turns on. */
  activating?: true;
} | null;

export function billingReturnNotice(
  params: URLSearchParams,
): BillingReturnNotice {
  switch (billingReturnKind(params)) {
    case "canceled":
      return { tone: "info", text: "Checkout canceled. Nothing was charged." };
    case "declined":
      return {
        tone: "error",
        text: "Your payment didn't go through. Nothing was charged. Try again with a different card.",
      };
    case "paid":
      return {
        tone: "info",
        text: "Subscription activating, refreshing...",
        activating: true,
      };
    case "card":
      return { tone: "info", text: "Payment method updated." };
    default:
      return null;
  }
}

/** Dodo's webhook usually lands within seconds; past a minute something is stuck. */
export const ACTIVATION_POLL_MS = 2_500;
export const ACTIVATION_TIMEOUT_MS = 60_000;

/** Paid and live. Trialing counts, since a Pro trial starts that way. */
export function isPlanActivated(plan: BillingPlan): boolean {
  return (
    plan.plan !== "unsubscribed" &&
    (plan.status === "active" || plan.status === "trialing")
  );
}

/** `?interval=` from a plan CTA; anything else falls back to the default. */
export function parseBillingInterval(
  value: string | null | undefined,
): BillingInterval | null {
  return value === "month" || value === "year" ? value : null;
}

/**
 * What a `?plan=` handoff does once the plan loads: start checkout, tell a
 * paid reader they're already on a plan, confirm the price when the Pro trial
 * is spent (the CTA said free), or nothing for an unknown plan.
 */
export function planIntentAction(
  plan: BillingPlan,
  wanted: string,
): "checkout" | "subscribed" | "trial-used" | "ignore" {
  if (wanted !== "lite" && wanted !== "starter" && wanted !== "pro") {
    return "ignore";
  }
  if (!plan.canCheckout) {
    return plan.plan !== "unsubscribed" ? "subscribed" : "ignore";
  }
  // ponytail: Pro is the only plan with a trial today; read trialDays from
  // the catalog here if another plan gets one.
  if (wanted === "pro" && plan.trialUsed) return "trial-used";
  return "checkout";
}

/** `?plan=&interval=` carried from a plan CTA through sign-in. */
export function planIntentSearch(
  plan: string,
  interval?: BillingInterval | null,
): string {
  const params = new URLSearchParams({ plan });
  if (interval) params.set("interval", interval);
  return `?${params.toString()}`;
}

/**
 * Where a plan CTA lands once the reader is signed in. /account starts
 * checkout from these params, so the interval picked on pricing survives.
 */
export function checkoutIntentPath(
  plan: string,
  interval?: BillingInterval | null,
): string {
  return `/account/${planIntentSearch(plan, interval)}`;
}
