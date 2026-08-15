import { useEffect } from "react";
import Lenis from "lenis";

import {
  readSiteChromeHeightPx,
  subscribeSiteChromeHeight,
} from "../../features/product-hunt/chrome";
import { setPageScroller } from "../../lib/page-scroll";

/** Mermail's expo ease-out — also Lenis's own default curve. */
const expoOut = (t: number) => Math.min(1, 1.001 - 2 ** (-10 * t));

function isBodyScrollLocked() {
  const { body } = document;
  return (
    body.hasAttribute("data-scroll-locked") || body.style.overflow === "hidden"
  );
}

/**
 * Site-wide Lenis: interpolates wheel/trackpad into real document scroll so
 * CSS sticky keeps working. Skipped entirely under reduced motion.
 */
export function SmoothScroll() {
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let lenis: Lenis | null = null;

    const syncLock = () => {
      if (!lenis) return;
      if (isBodyScrollLocked()) lenis.stop();
      else lenis.start();
    };

    const setAnchorOffset = (heightPx: number) => {
      if (!lenis) return;
      const anchors = lenis.options.anchors;
      if (anchors && typeof anchors === "object") {
        anchors.offset = -heightPx;
      }
    };

    const start = () => {
      if (lenis || motion.matches) return;
      lenis = new Lenis({
        duration: 1,
        easing: expoOut,
        smoothWheel: true,
        syncTouch: false,
        stopInertiaOnNavigate: true,
        autoRaf: true,
        anchors: { offset: -readSiteChromeHeightPx() },
      });
      setPageScroller(lenis);
      syncLock();
    };

    const stop = () => {
      if (!lenis) return;
      setPageScroller(null);
      lenis.destroy();
      lenis = null;
    };

    const onMotionChange = () => {
      if (motion.matches) stop();
      else start();
    };

    start();
    motion.addEventListener("change", onMotionChange);
    const unsubChrome = subscribeSiteChromeHeight(setAnchorOffset);
    const lockObserver = new MutationObserver(syncLock);
    lockObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-scroll-locked", "style"],
    });

    return () => {
      motion.removeEventListener("change", onMotionChange);
      unsubChrome();
      lockObserver.disconnect();
      stop();
    };
  }, []);

  return null;
}
