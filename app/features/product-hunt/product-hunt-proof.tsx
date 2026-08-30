import { useLayoutEffect, useRef } from "react";

import { captureAnalytics } from "../analytics/analytics.client";
import {
  PH_DAILY_AWARD,
  PH_DAILY_BADGE_IMG,
  PH_BADGE_ALT,
  PH_PRODUCT_NAME,
  PH_WEEKLY_AWARD,
  PH_WEEKLY_BADGE_IMG,
  productHuntHref,
  type ProductHuntAward,
  type ProductHuntSurface,
} from "./config";
import "./product-hunt.css";

export type ProductHuntProofVariant =
  "corner" | "footer" | "hero-mobile" | "rail";
type ProductHuntProofMotion = "inherit" | "viewport";

/**
 * One quiet, permanent proof unit: Product Hunt's official daily badge plus
 * the category-week result. Variants only change placement and scale; the
 * message and interaction stay identical across the site.
 */
export function ProductHuntProof({
  surface,
  variant,
  awards = "both",
  motion,
  revealDelay,
  revealOnMount = false,
  className = "",
}: {
  surface: ProductHuntSurface;
  variant: ProductHuntProofVariant;
  awards?: "daily" | "both";
  motion?: ProductHuntProofMotion;
  revealDelay?: "1" | "2" | "3" | "4";
  revealOnMount?: boolean;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const resolvedMotion =
    motion ??
    (variant === "corner" || variant === "hero-mobile"
      ? "inherit"
      : "viewport");

  useLayoutEffect(() => {
    if (resolvedMotion !== "viewport") return;
    const node = rootRef.current;
    if (!node) return;
    const revealTarget = variant === "footer" ? node.parentElement : node;
    if (!revealTarget) return;

    node.dataset.proofMotion = "viewport";
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced || typeof IntersectionObserver === "undefined") {
      node.dataset.proofVisible = "";
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        node.dataset.proofVisible = "";
        observer.disconnect();
      },
      { rootMargin: "-8% 0px" },
    );
    observer.observe(revealTarget);
    return () => observer.disconnect();
  }, [resolvedMotion, variant]);

  useLayoutEffect(() => {
    if (variant !== "corner") return;
    const corner = rootRef.current;
    const footer = document.querySelector<HTMLElement>(
      '[data-product-hunt-proof="footer"]',
    );
    const handoffZone = footer?.parentElement;
    if (!corner || !footer || !handoffZone) return;

    // On the landing page the footer unit is the in-flow continuation of the
    // fixed corner unit. Coordinate both from one geometry check so they never
    // read as two competing badges while the footer is on screen.
    footer.dataset.proofCoordinated = "";
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = handoffZone.getBoundingClientRect();
      const active = rect.top < window.innerHeight && rect.bottom > 0;
      corner.toggleAttribute("data-proof-handoff", active);
      footer.toggleAttribute("data-proof-handoff", active);
    };
    const scheduleUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    // Geometry is read from the stable partner row, not the translated badge.
    // A scroll calculation is more reliable than IntersectionObserver here at
    // extremely short desktop viewport heights.
    update();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      corner.removeAttribute("data-proof-handoff");
      footer.removeAttribute("data-proof-handoff");
      delete footer.dataset.proofCoordinated;
    };
  }, [variant]);

  const allBadges: ReadonlyArray<{
    award: ProductHuntAward;
    label: string;
    src: string;
  }> = [
    { award: "daily", label: PH_DAILY_AWARD, src: PH_DAILY_BADGE_IMG },
    {
      award: "weekly-productivity",
      label: PH_WEEKLY_AWARD,
      src: PH_WEEKLY_BADGE_IMG,
    },
  ];
  const badges = allBadges.filter(
    (badge) => awards === "both" || badge.award === "daily",
  );

  return (
    <div
      ref={rootRef}
      className={["ph-proof", `ph-proof--${variant}`, className]
        .filter(Boolean)
        .join(" ")}
      data-product-hunt-proof={surface}
      role="group"
      aria-label={
        awards === "daily" ? "Product Hunt award" : "Product Hunt awards"
      }
      data-reveal={
        resolvedMotion === "inherit" && revealOnMount ? "mount" : undefined
      }
      data-reveal-delay={resolvedMotion === "inherit" ? revealDelay : undefined}
    >
      <div className="ph-proof-badges">
        {badges.map((badge) => (
          <a
            key={badge.award}
            href={productHuntHref(surface, badge.award)}
            target="_blank"
            rel="noopener noreferrer"
            className="ph-proof-link"
            data-product-hunt-award={badge.award}
            aria-label={`${PH_PRODUCT_NAME}: ${badge.label}. View on Product Hunt`}
            onClick={() => {
              captureAnalytics("product_hunt_proof_clicked", {
                source: surface,
                award: badge.award,
              });
            }}
          >
            <img
              className="ph-proof-badge"
              src={badge.src}
              alt={PH_BADGE_ALT}
              width={250}
              height={54}
              loading={variant === "corner" ? "eager" : "lazy"}
              decoding="async"
            />
          </a>
        ))}
      </div>
    </div>
  );
}
