import { describe, expect, it } from "vitest";

import type { BillingPlan } from "../../platform/api/schemas";
import {
  billedCatalogPriceLabel,
  billingReturnKind,
  billingReturnNotice,
  billingReturnSearch,
  canOpenBillingPortal,
  checkoutIntentPath,
  formatBytes,
  formatMemberSince,
  formatMoney,
  formatEpochDate,
  isPlanActivated,
  parseBillingInterval,
  planIntentAction,
  planStatusTone,
  planSummary,
  relativeTime,
  renewalLabel,
} from "./account-format";

function plan(overrides: Partial<BillingPlan> = {}): BillingPlan {
  return {
    plan: "pro",
    status: "active",
    access: true,
    grantSource: "dodo",
    interval: "year",
    trialEndsAt: null,
    trialUsed: false,
    cancelAtPeriodEnd: false,
    periodEnd: 1_800_000_000_000,
    canCheckout: false,
    canManage: true,
    canChangePlan: true,
    paymentError: null,
    limits: {
      maxAgents: 15,
      multiAgentEnabled: true,
      maxConcurrentSessionsPerAgent: 3,
      maxIterations: 100,
      maxStorageBytes: 3_221_225_472,
      maxScheduledTasks: 50,
      byokEnabled: true,
    },
    usage: { sessionPct: 12, monthlyPct: 40 },
    ...overrides,
  } as BillingPlan;
}

describe("formatBytes", () => {
  it("scales through the units", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(5 * 1024 ** 2)).toBe("5.0 MB");
    expect(formatBytes(3 * 1024 ** 3)).toBe("3.0 GB");
  });

  it("renders an em dash for absent values rather than 0 B", () => {
    expect(formatBytes(null)).toBe("-");
    expect(formatBytes(undefined)).toBe("-");
  });
});

describe("formatMoney", () => {
  it("converts minor units and drops cents", () => {
    expect(formatMoney({ amount: 19900, currency: "USD" })).toContain("199");
  });

  it("returns null when there is no price, so callers can show a skeleton", () => {
    expect(formatMoney(null)).toBeNull();
  });

  it("falls back rather than throwing on an unknown currency code", () => {
    expect(formatMoney({ amount: 1000, currency: "XYZ" })).toContain("10");
  });
});

describe("formatEpochDate", () => {
  it("reads the API's milliseconds", () => {
    // GET /billing/plan sends periodEnd as Date.parse() ms. Read as seconds
    // this landed in the year 58858.
    expect(formatEpochDate(1_795_213_203_430)).toMatch(/2026/);
  });

  it("still reads unix seconds", () => {
    expect(formatEpochDate(1_800_000_000)).toMatch(/2027/);
  });

  it("returns null for a missing period end", () => {
    expect(formatEpochDate(null)).toBeNull();
  });
});

describe("formatMemberSince", () => {
  it("formats an ISO timestamp as month and year", () => {
    expect(formatMemberSince("2026-03-14T10:00:00.000Z")).toMatch(/2026/);
  });

  it("returns null on an unparseable value", () => {
    expect(formatMemberSince("not-a-date")).toBeNull();
    expect(formatMemberSince(null)).toBeNull();
  });
});

describe("planSummary", () => {
  it("combines tier and interval", () => {
    expect(planSummary(plan())).toBe("pro · Annual");
    expect(planSummary(plan({ interval: "month" }))).toBe("pro · Monthly");
  });

  it("omits a null interval instead of printing 'null'", () => {
    expect(planSummary(plan({ interval: null, grantSource: "dodo" }))).toBe(
      "pro",
    );
  });

  it("labels non-Dodo grants without a billed interval", () => {
    expect(
      planSummary(
        plan({ interval: null, grantSource: "manual", plan: "pro" }),
      ),
    ).toBe("pro · Granted");
  });

  it("names the unsubscribed state explicitly", () => {
    expect(planSummary(plan({ plan: "unsubscribed" }))).toBe("No active plan");
  });
});

describe("billedCatalogPriceLabel", () => {
  it("returns null for admin grants even with a catalog price", () => {
    expect(
      billedCatalogPriceLabel(
        plan({ grantSource: "manual", interval: null }),
        { amount: 29900, currency: "USD" },
      ),
    ).toBeNull();
  });

  it("returns null when Dodo interval is unknown", () => {
    expect(
      billedCatalogPriceLabel(plan({ interval: null }), {
        amount: 29900,
        currency: "USD",
      }),
    ).toBeNull();
  });

  it("formats a Dodo billed price", () => {
    const label = billedCatalogPriceLabel(plan({ interval: "year" }), {
      amount: 238_800,
      currency: "USD",
    });
    expect(label).toMatch(/2,?388/);
    expect(label).toMatch(/\/yr/);
  });
});

describe("renewalLabel", () => {
  it("says renews while the subscription is continuing", () => {
    expect(renewalLabel(plan())).toMatch(/^Renews /);
  });

  it("says access until once cancellation is scheduled", () => {
    expect(renewalLabel(plan({ cancelAtPeriodEnd: true }))).toMatch(
      /^Access until /,
    );
  });

  it("shows nothing when there is no period end", () => {
    expect(renewalLabel(plan({ periodEnd: null }))).toBeNull();
  });
});

describe("relativeTime", () => {
  it("accepts ISO strings from the sessions API", () => {
    const recent = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    expect(relativeTime(recent)).toMatch(/minute|hour|ago|now/i);
  });

  it("still accepts unix seconds", () => {
    const seconds = Math.floor(Date.now() / 1000) - 120;
    expect(relativeTime(seconds)).toMatch(/minute|ago|now/i);
  });
});

describe("planStatusTone", () => {
  it("flags a payment error above every other state", () => {
    expect(
      planStatusTone(
        plan({ paymentError: { code: "card_declined", message: "Declined" } }),
      ),
    ).toBe("danger");
  });

  it("warns on a pending cancellation", () => {
    expect(planStatusTone(plan({ cancelAtPeriodEnd: true }))).toBe("warning");
  });

  it("treats an active plan as positive", () => {
    expect(planStatusTone(plan())).toBe("positive");
  });

  it("stays neutral when there is no access", () => {
    expect(planStatusTone(plan({ access: false, plan: "unsubscribed" }))).toBe(
      "neutral",
    );
  });
});

describe("canOpenBillingPortal", () => {
  it("follows the API canManage flag", () => {
    expect(canOpenBillingPortal(plan({ canManage: true }))).toBe(true);
    expect(
      canOpenBillingPortal(
        plan({ canManage: false, grantSource: "none", access: false }),
      ),
    ).toBe(false);
  });

  it("falls back for an active Dodo grant when canManage lags", () => {
    expect(
      canOpenBillingPortal(
        plan({
          canManage: false,
          grantSource: "dodo",
          access: true,
          plan: "pro",
        }),
      ),
    ).toBe(true);
  });

  it("does not open the portal for non-Dodo grants without canManage", () => {
    expect(
      canOpenBillingPortal(
        plan({
          canManage: false,
          grantSource: "manual",
          access: true,
          plan: "pro",
        }),
      ),
    ).toBe(false);
  });
});

describe("billingReturnNotice", () => {
  const read = (search: string) =>
    billingReturnNotice(new URLSearchParams(search));

  it("treats Dodo's failed status on the success URL as a declined charge", () => {
    expect(
      read("billing_status=success&subscription_id=sub_1&status=failed"),
    ).toMatchObject({ tone: "error" });
    expect(
      read("billing_status=success&status=requires_payment_method")?.tone,
    ).toBe("error");
  });

  it("keeps the activation and payment-method notices", () => {
    expect(read("billing_status=success&status=active")).toEqual({
      tone: "info",
      text: "Subscription activating, refreshing...",
      activating: true,
    });
    expect(read("billing_status=payment_method")?.text).toBe(
      "Payment method updated.",
    );
    expect(read("")).toBeNull();
  });

  it("matches the chooser on canceled and failed returns", () => {
    expect(read("billing_status=canceled")).toEqual({
      tone: "info",
      text: "Checkout canceled. Nothing was charged.",
    });
    expect(read("billing_status=cancelled&status=cancelled")?.tone).toBe(
      "info",
    );
    expect(read("billing_status=failed")?.tone).toBe("error");
  });

  it("ignores a billing status it does not know, as the apps do", () => {
    expect(read("billing_status=weird")).toBeNull();
    expect(billingReturnKind(new URLSearchParams("billing_status=weird"))).toBeNull();
    expect(
      billingReturnKind(new URLSearchParams("billing_status=weird&status=failed")),
    ).toBeNull();
    expect(
      billingReturnKind(new URLSearchParams("billing_status=payment_method&status=failed")),
    ).toBe("declined");
  });
});

describe("billingReturnSearch", () => {
  it("keeps only a Dodo return's params, for the trip through sign-in", () => {
    expect(
      billingReturnSearch(
        new URLSearchParams("billing_status=success&status=failed&utm_source=x"),
      ),
    ).toBe("?billing_status=success&status=failed");
  });

  it("is empty without a billing_status", () => {
    expect(billingReturnSearch(new URLSearchParams("status=failed"))).toBe("");
  });
});

describe("planIntentAction", () => {
  it("starts checkout only for an unsubscribed reader who can pay", () => {
    const free = plan({ plan: "unsubscribed", status: "none", canCheckout: true });
    expect(planIntentAction(free, "pro")).toBe("checkout");
    expect(planIntentAction(free, "lite")).toBe("checkout");
    expect(planIntentAction(free, "enterprise")).toBe("ignore");
    expect(planIntentAction({ ...free, trialUsed: true }, "pro")).toBe(
      "trial-used",
    );
    expect(planIntentAction({ ...free, trialUsed: true }, "starter")).toBe(
      "checkout",
    );
  });

  it("never starts a second checkout for a paid or trialing reader", () => {
    expect(planIntentAction(plan(), "pro")).toBe("subscribed");
    expect(planIntentAction(plan({ status: "trialing" }), "lite")).toBe(
      "subscribed",
    );
    expect(
      planIntentAction(
        plan({ plan: "unsubscribed", status: "none", canCheckout: false }),
        "pro",
      ),
    ).toBe("ignore");
  });
});

describe("checkout intent", () => {
  it("carries the interval with the plan and drops anything unknown", () => {
    expect(checkoutIntentPath("pro", "year")).toBe(
      "/account/?plan=pro&interval=year",
    );
    expect(checkoutIntentPath("lite")).toBe("/account/?plan=lite");
    expect(parseBillingInterval("year")).toBe("year");
    expect(parseBillingInterval("annual")).toBeNull();
    expect(parseBillingInterval(null)).toBeNull();
  });

  it("counts a paid or trialing plan as activated, not a pending one", () => {
    expect(isPlanActivated(plan())).toBe(true);
    expect(isPlanActivated(plan({ status: "trialing" }))).toBe(true);
    expect(
      isPlanActivated(plan({ plan: "unsubscribed", status: "none" })),
    ).toBe(false);
    expect(isPlanActivated(plan({ status: "on_hold" }))).toBe(false);
  });
});
