import { getReturnOrigin } from "../env";
import { apiRequest } from "./client";
import {
  BillingPlanSchema,
  CheckoutSchema,
  PaymentMethodSchema,
  PlanCatalogSchema,
  PortalSchema,
  WorkspaceListSchema,
  type BillingInterval,
  type CatalogIntervalCommercial,
  type CatalogMoney,
  type CatalogPlan,
  type PaidPlanId,
} from "./schemas";
import { z } from "zod";

export type {
  BillingInterval,
  BillingPlan,
  CatalogIntervalCommercial,
  CatalogMoney,
  CatalogPlan,
  PaidPlanId,
  PlanId,
  WorkspaceSummary,
} from "./schemas";

export async function getPlan() {
  return apiRequest("/v1/billing/plan", { schema: BillingPlanSchema });
}

export async function getPlanCatalog() {
  return apiRequest("/v1/billing/plans", { schema: PlanCatalogSchema });
}

export async function createCheckout(
  plan: PaidPlanId,
  interval: BillingInterval = "month",
) {
  return apiRequest("/v1/billing/checkout", {
    method: "POST",
    schema: CheckoutSchema,
    body: JSON.stringify({
      plan,
      interval,
      returnOrigin: getReturnOrigin(),
    }),
  });
}

export async function createPortal() {
  return apiRequest("/v1/billing/portal", {
    method: "POST",
    schema: PortalSchema,
  });
}

export async function changePlan(
  plan: PaidPlanId,
  interval: BillingInterval = "month",
) {
  return apiRequest("/v1/billing/change-plan", {
    method: "POST",
    schema: z.object({ ok: z.literal(true) }),
    body: JSON.stringify({ plan, interval }),
  });
}

export async function cancelSubscription() {
  return apiRequest("/v1/billing/cancel", {
    method: "POST",
    schema: z.object({ ok: z.literal(true) }),
  });
}

export async function resumeSubscription() {
  return apiRequest("/v1/billing/resume", {
    method: "POST",
    schema: z.object({ ok: z.literal(true) }),
  });
}

export async function updatePaymentMethod() {
  return apiRequest("/v1/billing/payment-method", {
    method: "POST",
    schema: PaymentMethodSchema,
    body: JSON.stringify({ returnOrigin: getReturnOrigin() }),
  });
}

export async function listWorkspaces() {
  return apiRequest("/v1/workspaces", { schema: WorkspaceListSchema });
}

export async function switchWorkspace(id: string) {
  return apiRequest(`/v1/workspaces/${encodeURIComponent(id)}/switch`, {
    method: "POST",
    schema: z.object({
      workspaceId: z.string(),
      token: z.string().optional(),
    }),
  });
}

/** True when every tier has annual pricing, so the interval toggle is meaningful. */
export function catalogHasAnnual(plans: CatalogPlan[]): boolean {
  return plans.length > 0 && plans.every((plan) => plan.year?.price != null);
}

export function catalogIntervalView(
  plan: CatalogPlan,
  interval: BillingInterval,
): CatalogIntervalCommercial {
  if (interval === "year" && plan.year) return plan.year;
  return plan.month;
}

/** Whole months free when paying annually vs 12x monthly. */
export function annualMonthsFree(
  monthly: CatalogMoney | null | undefined,
  annual: CatalogMoney | null | undefined,
): number | null {
  if (!monthly || !annual || monthly.amount <= 0) return null;
  if (monthly.currency !== annual.currency) return null;
  const saved = monthly.amount * 12 - annual.amount;
  if (saved <= 0) return null;
  return Math.max(1, Math.round(saved / monthly.amount));
}

export function annualMonthlyEquivalent(
  annual: CatalogMoney | null | undefined,
): CatalogMoney | null {
  if (!annual) return null;
  return {
    amount: Math.round(annual.amount / 12),
    currency: annual.currency,
  };
}
