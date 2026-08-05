import { useCallback, useEffect, useState } from "react";

import * as authApi from "../../platform/api/auth";
import * as billingApi from "../../platform/api/billing";
import * as llmApi from "../../platform/api/llm";
import { isRetryable, type ApiResult } from "../../platform/api/client";
import type {
  AuthSession,
  BillingPlan,
  ByokModel,
  ByokSettings,
  CatalogPlan,
  WorkspaceSummary,
} from "../../platform/api/schemas";

/**
 * One resource's fetch state. The old page did `if (res.success) setPlan(...)`,
 * so any failure left "Loading plan…" on screen forever with no error and no
 * retry. Modelling the failure explicitly is what makes a retry possible.
 */
export type Resource<T> =
  | { state: "loading" }
  | { state: "ready"; data: T }
  | { state: "error"; message: string; retryable: boolean };

function toResource<T>(result: ApiResult<T>): Resource<T> {
  if (result.success) return { state: "ready", data: result.data };
  return {
    state: "error",
    message: result.error,
    retryable: isRetryable(result),
  };
}

export type AccountData = {
  plan: Resource<BillingPlan>;
  catalog: Resource<{
    plans: CatalogPlan[];
    recommendedPlan: "starter" | "pro";
  }>;
  workspaces: Resource<{
    workspaces: WorkspaceSummary[];
    activeWorkspaceId: string | null;
  }>;
  sessions: Resource<AuthSession[]>;
  hasPassword: Resource<boolean>;
  byok: Resource<ByokSettings> | null;
  byokModels: Resource<ByokModel[]>;
};

const LOADING = { state: "loading" } as const;

export function useAccountData(enabled: boolean) {
  const [data, setData] = useState<AccountData>({
    plan: LOADING,
    catalog: LOADING,
    workspaces: LOADING,
    sessions: LOADING,
    hasPassword: LOADING,
    byok: LOADING,
    byokModels: LOADING,
  });

  const load = useCallback(async (signal?: { cancelled: boolean }) => {
    const [plan, catalog, workspaces, sessions, password, byok] =
      await Promise.all([
        billingApi.getPlan(),
        billingApi.getPlanCatalog(),
        billingApi.listWorkspaces(),
        authApi.listSessions(),
        authApi.passwordStatus(),
        llmApi.getByokSettings(),
      ]);
    if (signal?.cancelled) return;

    // Only worth listing models once a key can actually serve them; the
    // endpoint returns nothing useful otherwise.
    const anyReady =
      byok.success && Object.values(byok.data.providersReady).some(Boolean);
    const models = anyReady ? await llmApi.getByokModels() : null;
    if (signal?.cancelled) return;

    setData({
      plan: toResource(plan),
      catalog: catalog.success
        ? {
            state: "ready",
            data: {
              plans: catalog.data.plans,
              recommendedPlan: catalog.data.recommendedPlan,
            },
          }
        : toResource(catalog as ApiResult<never>),
      workspaces: toResource(workspaces),
      sessions: sessions.success
        ? { state: "ready", data: sessions.data.sessions }
        : toResource(sessions as ApiResult<never>),
      hasPassword: password.success
        ? { state: "ready", data: password.data.hasPassword }
        : toResource(password as ApiResult<never>),
      // A 403 means the plan doesn't include BYOK, which is a hidden section
      // rather than an error worth showing.
      byok: !byok.success && byok.status === 403 ? null : toResource(byok),
      byokModels:
        models == null
          ? { state: "ready", data: [] }
          : models.success
            ? { state: "ready", data: models.data.models }
            : toResource(models as ApiResult<never>),
    });
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const signal = { cancelled: false };
    // Kicked off inside the effect rather than called directly, so no state
    // update can happen synchronously during the effect body.
    void (async () => {
      await load(signal);
    })();
    return () => {
      signal.cancelled = true;
    };
  }, [enabled, load]);

  const refresh = useCallback(() => load(), [load]);

  return { data, refresh };
}

/** Per-action pending keys, so one request doesn't disable every other button. */
export function usePendingActions() {
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());

  const run = useCallback(
    async (
      key: string,
      fn: () => Promise<{ success: boolean; error?: string }>,
    ): Promise<{ success: boolean; error?: string }> => {
      setPending((current) => new Set(current).add(key));
      try {
        return await fn();
      } finally {
        setPending((current) => {
          const next = new Set(current);
          next.delete(key);
          return next;
        });
      }
    },
    [],
  );

  return {
    isPending: useCallback((key: string) => pending.has(key), [pending]),
    run,
  };
}
