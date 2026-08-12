import { useEffect, useRef } from "react";

import { captureAnalytics } from "../analytics/analytics.client";
import { usePrefersReducedMotion } from "../landing/media";
import { setPhBannerHeightPx } from "./chrome";
import { productHuntCopy } from "./config";
import { ProductHuntBadge } from "./product-hunt-badge";
import { useProductHuntPhase } from "./use-product-hunt-phase";
import "./product-hunt.css";

/**
 * Product Hunt strip. Renders inside the sticky SiteHeader stack below the nav
 * (null until mounted / outside campaign — prerender-safe).
 */
export function ProductHuntBanner() {
  const { mounted, phase, parts, countdownLabel } = useProductHuntPhase();
  const reducedMotion = usePrefersReducedMotion();
  const barRef = useRef<HTMLDivElement>(null);
  const shownRef = useRef(false);

  const visible = mounted && (phase === "pre" || phase === "live");

  useEffect(() => {
    if (!visible) {
      setPhBannerHeightPx(0);
      return;
    }
    const node = barRef.current;
    if (!node) return;

    const measure = () =>
      setPhBannerHeightPx(node.getBoundingClientRect().height);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onResize);
      setPhBannerHeightPx(0);
    };
  }, [visible, phase]);

  useEffect(() => {
    if (!visible || shownRef.current) return;
    shownRef.current = true;
    captureAnalytics("ph_banner_shown", { phase });
  }, [visible, phase]);

  // Spotlight tracks the pointer anywhere on the page (not only over the bar).
  useEffect(() => {
    if (!visible || reducedMotion) return;
    const node = barRef.current;
    if (!node) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    let frame = 0;
    const onMove = (event: PointerEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const x = (event.clientX / Math.max(window.innerWidth, 1)) * 100;
        const y = (event.clientY / Math.max(window.innerHeight, 1)) * 100;
        node.style.setProperty("--mx", `${x}%`);
        node.style.setProperty("--my", `${y}%`);
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [visible, reducedMotion]);

  if (!visible) return null;

  const copy = productHuntCopy(phase);
  const ariaLabel =
    phase === "pre"
      ? `${copy.bannerLead} ${countdownLabel}`
      : copy.bannerLead;

  return (
    <div
      ref={barRef}
      className="ph-banner"
      role="region"
      aria-label={ariaLabel}
    >
      <div className="ph-banner-inner">
        <span className="text-[13px] font-semibold leading-5 sm:text-sm">
          {copy.bannerLead}
        </span>
        {phase === "pre" && (
          <span className="ph-countdown" aria-hidden="true">
            <span className="ph-countdown-unit">{parts.days}d</span>
            <span className="ph-countdown-unit">
              {String(parts.hours).padStart(2, "0")}h
            </span>
            <span className="ph-countdown-unit">
              {String(parts.minutes).padStart(2, "0")}m
            </span>
            <span className="ph-countdown-unit">
              {String(parts.seconds).padStart(2, "0")}s
            </span>
          </span>
        )}
        <ProductHuntBadge surface="banner" className="ph-banner-badge" />
      </div>
    </div>
  );
}
