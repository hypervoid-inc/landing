import type {
  BillingInterval,
  BillingPlan,
  CatalogMoney,
} from "../../platform/api/schemas";

export function formatBytes(n: number | undefined | null): string {
  if (n == null) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(1)} GB`;
}

/** Minor units to a localized amount. Whole currency units only — no cents. */
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

/** The API sends unix *seconds*; `new Date(n)` would land in 1970. */
export function formatUnixDate(seconds: number | null | undefined): string | null {
  if (seconds == null) return null;
  const ms = seconds * 1000;
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

export function relativeTime(seconds: number | null | undefined): string {
  if (seconds == null) return "—";
  const deltaMs = seconds * 1000 - Date.now();
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

/** Status colour never stands alone — the label is always rendered beside it. */
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
  return [plan.plan, interval].filter(Boolean).join(" · ");
}

/** "Renews 12 Mar 2027" vs "Access until 12 Mar 2027" — the distinction matters. */
export function renewalLabel(plan: BillingPlan): string | null {
  const date = formatUnixDate(plan.periodEnd);
  if (!date) return null;
  if (plan.cancelAtPeriodEnd) return `Access until ${date}`;
  if (plan.plan === "unsubscribed") return null;
  return `Renews ${date}`;
}
