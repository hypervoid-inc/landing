import { useEffect, useRef } from "react";

import { captureAnalytics } from "../analytics/analytics.client";
import { usePrefersReducedMotion } from "../landing/media";
import { fireProductHuntConfetti } from "./confetti";
import { useProductHuntPhase } from "./use-product-hunt-phase";

/**
 * Fires once per tab session when the campaign is live. Skips auth routes and
 * reduced motion. Mount alongside the banner from root.
 */
export function ProductHuntConfetti() {
  const { mounted, phase } = useProductHuntPhase();
  const reducedMotion = usePrefersReducedMotion();
  const firedRef = useRef(false);

  useEffect(() => {
    if (!mounted || phase !== "live" || reducedMotion) return;
    if (firedRef.current) return;
    firedRef.current = true;
    const fired = fireProductHuntConfetti();
    if (fired) captureAnalytics("ph_confetti_fired", { phase: "live" });
  }, [mounted, phase, reducedMotion]);

  return null;
}
