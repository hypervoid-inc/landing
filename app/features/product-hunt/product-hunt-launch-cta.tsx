import { ProductHuntBadge } from "./product-hunt-badge";
import {
  productHuntCopy,
  type ProductHuntSurface,
} from "./config";
import { useProductHuntPhase } from "./use-product-hunt-phase";
import "./product-hunt.css";

/**
 * Compact Product Hunt launch CTA for blog rail, post body, and other niches.
 * Badge is the action — no duplicate pill button.
 */
export function ProductHuntLaunchCta({
  surface = "blog",
  className = "",
}: {
  surface?: ProductHuntSurface;
  className?: string;
}) {
  const { mounted, phase } = useProductHuntPhase();
  if (!mounted || (phase !== "pre" && phase !== "live")) return null;

  const copy = productHuntCopy(phase);

  return (
    <aside
      className={`ph-blog-cta ${className}`.trim()}
      aria-label="Product Hunt launch"
    >
      <p className="ph-blog-cta-eyebrow">{copy.eyebrow}</p>
      <p className="ph-blog-cta-title">
        {phase === "pre"
          ? "Follow our Product Hunt launch"
          : "Upvote our Product Hunt launch"}
      </p>
      <p className="ph-blog-cta-lead">{copy.homepageLead}</p>
      <div className="ph-blog-cta-actions">
        <ProductHuntBadge surface={surface} />
      </div>
    </aside>
  );
}
