import { getReturnOrigin } from "../env";
import { apiRequest } from "./client";

export type PaidPlanId = "lite" | "starter" | "pro";
export type PlanId = "unsubscribed" | PaidPlanId;
export type BillingInterval = "month" | "year";

export type BillingPlan = {
  plan: PlanId;
  status: string;
  interval?: BillingInterval | null;
  canCheckout?: boolean;
  canManage?: boolean;
  canChangePlan?: boolean;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: string | null;
  usage?: {
    sessionPct?: number;
    monthlyPct?: number;
  };
  limits?: Record<string, unknown>;
  ownerUsage?: {
    agentsUsed?: number;
    agentsMax?: number;
    storageBytesUsed?: number;
    storageBytesMax?: number;
  };
};

export type CatalogPlan = {
  id: PaidPlanId;
  name: string;
  prices: {
    month?: { amount: number; currency: string };
    year?: { amount: number; currency: string };
  };
};

export async function getPlan() {
  return apiRequest<BillingPlan>("/v1/billing/plan");
}

export async function getPlanCatalog() {
  return apiRequest<{ plans: CatalogPlan[] }>("/v1/billing/plans", {
    auth: false,
  });
}

export async function createCheckout(
  plan: PaidPlanId,
  interval: BillingInterval = "month",
) {
  return apiRequest<{ checkoutUrl: string }>("/v1/billing/checkout", {
    method: "POST",
    body: JSON.stringify({
      plan,
      interval,
      returnOrigin: getReturnOrigin(),
    }),
  });
}

export async function createPortal() {
  return apiRequest<{ portalUrl: string }>("/v1/billing/portal", {
    method: "POST",
  });
}

export async function changePlan(
  plan: PaidPlanId,
  interval: BillingInterval = "month",
) {
  return apiRequest<{ ok: true }>("/v1/billing/change-plan", {
    method: "POST",
    body: JSON.stringify({ plan, interval }),
  });
}

export async function cancelSubscription() {
  return apiRequest<{ ok: true }>("/v1/billing/cancel", { method: "POST" });
}

export async function resumeSubscription() {
  return apiRequest<{ ok: true }>("/v1/billing/resume", { method: "POST" });
}

export async function updatePaymentMethod() {
  return apiRequest<{ url: string }>("/v1/billing/payment-method", {
    method: "POST",
    body: JSON.stringify({ returnOrigin: getReturnOrigin() }),
  });
}

export type WorkspaceSummary = {
  id: string;
  name: string;
  kind: "personal" | "team";
  role?: string;
};

export async function listWorkspaces() {
  return apiRequest<{
    workspaces: WorkspaceSummary[];
    activeWorkspaceId: string | null;
  }>("/v1/workspaces");
}

export async function switchWorkspace(id: string) {
  return apiRequest<{ token?: string; workspaceId: string }>(
    `/v1/workspaces/${encodeURIComponent(id)}/switch`,
    { method: "POST" },
  );
}
