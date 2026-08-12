import { useLayoutEffect, useState } from "react";
import { useLocation } from "react-router";

import {
  countdownParts,
  formatCountdownLabel,
  isProductHuntAuthPath,
  parsePhOverride,
  remainingUntilGoLive,
  resolveProductHuntPhase,
  type CountdownParts,
  type ProductHuntPhase,
} from "./phase";

export type ProductHuntPhaseState = {
  /** False only on the SSR/prerender pass — flips true before first paint. */
  mounted: boolean;
  phase: ProductHuntPhase;
  authPath: boolean;
  remainingMs: number;
  parts: CountdownParts;
  countdownLabel: string;
};

const INITIAL: ProductHuntPhaseState = {
  mounted: false,
  phase: "hidden",
  authPath: false,
  remainingMs: 0,
  parts: { days: 0, hours: 0, minutes: 0, seconds: 0 },
  countdownLabel: "0d 00h 00m 00s",
};

function snapshot(pathname: string, search: string): ProductHuntPhaseState {
  const override = parsePhOverride(search);
  const now = Date.now();
  const phase = resolveProductHuntPhase(now, override);
  const remainingMs = remainingUntilGoLive(now);
  const parts = countdownParts(remainingMs);
  return {
    mounted: true,
    phase,
    authPath: isProductHuntAuthPath(pathname),
    remainingMs,
    parts,
    countdownLabel: formatCountdownLabel(parts),
  };
}

/**
 * Phase clock. Stays `mounted: false` during SSR/prerender (no hydration
 * mismatch), then `useLayoutEffect` reveals campaign UI before first paint.
 */
export function useProductHuntPhase(): ProductHuntPhaseState {
  const { pathname, search } = useLocation();
  const [state, setState] = useState<ProductHuntPhaseState>(INITIAL);

  useLayoutEffect(() => {
    const tick = () => setState(snapshot(pathname, search));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [pathname, search]);

  return state;
}
