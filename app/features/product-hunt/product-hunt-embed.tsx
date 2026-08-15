import { captureAnalytics } from "../analytics/analytics.client";
import {
  PH_LOGO_IMG,
  PH_PRODUCT_NAME,
  PH_TAGLINE,
  productHuntHref,
  type ProductHuntSurface,
} from "./config";
import { useProductHuntPhase } from "./use-product-hunt-phase";
import "./product-hunt.css";

/**
 * Accessible rebuild of the Product Hunt post embed. Gates on campaign phase
 * unless `force` is set (authors almost never need force).
 */
export function ProductHuntEmbed({
  surface = "embed",
  className = "my-8",
  force = false,
}: {
  surface?: ProductHuntSurface;
  className?: string;
  force?: boolean;
}) {
  const { mounted, phase } = useProductHuntPhase();
  const active = phase === "pre" || phase === "live";
  if (!force && (!mounted || !active)) return null;

  const resolvedPhase = active ? phase : "pre";

  return (
    <div className={`${className} ph-embed font-sans`}>
      <div className="ph-embed-header">
        <img
          alt=""
          src={PH_LOGO_IMG}
          width={64}
          height={64}
          loading="lazy"
          decoding="async"
          className="h-16 w-16 shrink-0 rounded-lg object-cover"
        />
        <div className="ph-embed-copy">
          <h3 className="m-0 text-lg font-semibold leading-snug text-[#1a1a1a]">
            {PH_PRODUCT_NAME}
          </h3>
          <p className="mt-1 text-sm leading-snug text-[#666]">
            {PH_TAGLINE}
          </p>
        </div>
      </div>
      <a
        href={productHuntHref(surface)}
        target="_blank"
        rel="noopener noreferrer"
        className="ph-embed-cta"
        onClick={() => {
          captureAnalytics("ph_embed_clicked", {
            phase: resolvedPhase,
            source: surface,
          });
        }}
      >
        {resolvedPhase === "pre"
          ? "Check out our Product Hunt launch →"
          : "Upvote our Product Hunt launch →"}
      </a>
    </div>
  );
}
