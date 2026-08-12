import { useEffect, type RefObject } from "react";

import { usePrefersReducedMotion } from "./media";

/**
 * Publishes the pointer's offset from the viewport centre as `--mx` / `--my`
 * on `ref`, for layered hero art to consume with its own per-layer depth.
 *
 * Tracking is page-wide rather than hover-scoped so the art keeps responding
 * after the reader has moved away from it. Writes are coalesced into one frame
 * because pointermove fires far more often than the display refreshes.
 *
 * While tracking, consumers should transition transforms quickly so the layers
 * feel attached to the cursor. Crossing the window edge is the exception:
 * there is no stream of positions to follow, so the element is marked
 * `data-settling` for `settleMs` on the way out and on the first move back in,
 * letting consumers swap in a longer curve instead of snapping.
 */
export function usePointerParallax(
  ref: RefObject<HTMLElement | null>,
  {
    x = 22,
    y = 18,
    settleMs = 900,
  }: { x?: number; y?: number; settleMs?: number } = {},
) {
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    const node = ref.current;
    if (!node) return;

    let frame = 0;
    let settleTimer = 0;
    let away = true;
    let nx = 0;
    let ny = 0;

    const apply = () => {
      frame = 0;
      node.style.setProperty("--mx", `${nx * x}px`);
      node.style.setProperty("--my", `${ny * y}px`);
    };
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(apply);
    };
    /** Hold the slow curve long enough for the ease to finish, then release. */
    const settle = () => {
      node.dataset.settling = "";
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        delete node.dataset.settling;
      }, settleMs);
    };

    const onMove = (event: PointerEvent) => {
      // First move after re-entering: ease across the gap rather than jump to
      // wherever the pointer reappeared.
      if (away) {
        away = false;
        settle();
      }
      nx = event.clientX / Math.max(window.innerWidth, 1) - 0.5;
      ny = event.clientY / Math.max(window.innerHeight, 1) - 0.5;
      schedule();
    };
    // Pointer left the window entirely: drift back to centre.
    const onLeave = (event: PointerEvent) => {
      if (event.relatedTarget || away) return;
      away = true;
      settle();
      nx = 0;
      ny = 0;
      schedule();
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerout", onLeave);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.clearTimeout(settleTimer);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onLeave);
    };
  }, [ref, reducedMotion, x, y, settleMs]);
}
