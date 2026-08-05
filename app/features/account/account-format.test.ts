import { describe, expect, it } from "vitest";

import type { BillingPlan } from "../../platform/api/schemas";
import {
  formatBytes,
  formatMemberSince,
  formatMoney,
  formatUnixDate,
  planStatusTone,
  planSummary,
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
    periodEnd: 1_800_000_000,
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
    expect(formatBytes(null)).toBe("—");
    expect(formatBytes(undefined)).toBe("—");
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

describe("formatUnixDate", () => {
  it("treats the value as seconds, not milliseconds", () => {
    // 1_800_000_000s is 2027; misreading it as ms would land in January 1970.
    expect(formatUnixDate(1_800_000_000)).toMatch(/2027/);
  });

  it("returns null for a missing period end", () => {
    expect(formatUnixDate(null)).toBeNull();
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
    expect(planSummary(plan({ interval: null }))).toBe("pro");
  });

  it("names the unsubscribed state explicitly", () => {
    expect(planSummary(plan({ plan: "unsubscribed" }))).toBe("No active plan");
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
