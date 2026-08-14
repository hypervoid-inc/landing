import { useLayoutEffect, useRef } from "react";

import { captureAnalytics } from "../analytics/analytics.client";
import {
  PH_BADGE_IMG,
  PH_PRODUCT_NAME,
  PH_TAGLINE,
  productHuntUrl,
  type ProductHuntSurface,
} from "./config";
import { registerPhHoloBadge, unregisterPhHoloBadge } from "./holo-pointer";
import { useProductHuntPhase } from "./use-product-hunt-phase";
import "./product-hunt.css";

export function ProductHuntBadge({
  surface = "footer",
  className = "",
}: {
  surface?: ProductHuntSurface;
  className?: string;
}) {
  const { mounted, phase } = useProductHuntPhase();
  const faceRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const face = faceRef.current;
    if (!face) return;
    // Temporarily disabled on the nav banner — do not delete.
    if (surface === "banner") return;
    registerPhHoloBadge(face);
    return () => unregisterPhHoloBadge(face);
  }, [mounted, phase, surface]);

  if (!mounted || (phase !== "pre" && phase !== "live")) {
    return null;
  }

  return (
    <a
      href={productHuntUrl(surface)}
      target="_blank"
      rel="noopener noreferrer"
      className={["ph-badge", className].filter(Boolean).join(" ")}
      onClick={() => {
        captureAnalytics("ph_badge_clicked", { phase, source: surface });
      }}
    >
      <span className="ph-badge-face" ref={faceRef}>
        <img
          alt={`${PH_PRODUCT_NAME} - ${PH_TAGLINE} | Product Hunt`}
          width={250}
          height={54}
          src={PH_BADGE_IMG}
          loading="lazy"
          decoding="async"
        />
        <span className="ph-badge-foil" aria-hidden="true" />
        <span className="ph-badge-sparkle" aria-hidden="true" />
        <span className="ph-badge-glare" aria-hidden="true" />
      </span>
    </a>
  );
}
