import { useEffect, useState } from "react";

import { getPlanCatalog } from "../../platform/api/billing";
import type { CatalogPlan } from "../../platform/api/schemas";

export type PlanCatalogState = {
  plans: CatalogPlan[] | null;
  recommendedPlan: "starter" | "pro";
  /** True after the first fetch settles (success or failure). */
  settled: boolean;
};

const INITIAL: PlanCatalogState = {
  plans: null,
  recommendedPlan: "starter",
  settled: false,
};

/**
 * Shared in-flight request. The catalog is public, immutable for the life of a
 * page view, and now read by more than one section (hero price anchor and the
 * pricing grid), so every consumer waits on the same fetch instead of issuing
 * its own.
 */
let pending: ReturnType<typeof getPlanCatalog> | null = null;

function loadCatalog() {
  pending ??= getPlanCatalog();
  return pending;
}

/** One-shot public catalog fetch for the marketing homepage. No polling. */
export function usePlanCatalog(): PlanCatalogState {
  const [state, setState] = useState<PlanCatalogState>(INITIAL);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await loadCatalog();
      if (cancelled) return;
      if (!res.success) {
        setState((s) => ({ ...s, settled: true }));
        return;
      }
      setState({
        plans: res.data.plans,
        recommendedPlan: res.data.recommendedPlan,
        settled: true,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
