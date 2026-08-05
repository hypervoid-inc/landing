import { useEffect, useRef, useState } from "react";

import { usePrefersReducedMotion } from "./media";

/** Strong ease-out — same curve family as Clippy / pricing motion. */
export const PRICE_TICK_EASE = (t: number) => 1 - (1 - t) ** 3;

export const PRICE_TICK_MS = 280;

export function parsePrice(price: string): number {
  return Number(price.replace(/[^0-9.]/g, ""));
}

export function decimalPlaces(price: string): number {
  const dot = price.indexOf(".");
  return dot === -1 ? 0 : price.length - dot - 1;
}

export function formatPrice(value: number, places: number): string {
  if (places <= 0) return `$${Math.round(value)}`;
  return `$${value.toFixed(places)}`;
}

/**
 * Direction-aware price ticker: counts down when the target drops, up when it
 * rises. Interruptible — a new target retargets from the in-flight value.
 */
export function usePriceTicker(targetPrice: string): string {
  const reduced = usePrefersReducedMotion();
  const [display, setDisplay] = useState(targetPrice);
  const valueRef = useRef(parsePrice(targetPrice));
  const rafRef = useRef(0);

  useEffect(() => {
    const to = parsePrice(targetPrice);
    const from = valueRef.current;
    const places =
      Number.isInteger(from) && Number.isInteger(to)
        ? 0
        : Math.max(2, decimalPlaces(targetPrice));

    if (reduced || from === to) {
      valueRef.current = to;
      setDisplay(targetPrice);
      return;
    }

    const start = performance.now();
    cancelAnimationFrame(rafRef.current);

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / PRICE_TICK_MS);
      const value = from + (to - from) * PRICE_TICK_EASE(t);
      valueRef.current = value;
      if (t >= 1) {
        valueRef.current = to;
        setDisplay(targetPrice);
        return;
      }
      setDisplay(formatPrice(value, places));
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [targetPrice, reduced]);

  return display;
}
