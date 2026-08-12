import { PH_END_MS, PH_GO_LIVE_MS } from "./config";

export type ProductHuntPhase = "pre" | "live" | "hidden";
export type ProductHuntOverride = "off" | "pre" | "live";

export function parsePhOverride(
  search: string,
): ProductHuntOverride | null {
  const value = new URLSearchParams(search).get("ph");
  if (value === "off" || value === "pre" || value === "live") return value;
  return null;
}

/**
 * Resolve campaign phase from wall clock + optional test override.
 * `?ph=off|pre|live` forces the phase so CI does not depend on Date.now().
 */
export function resolveProductHuntPhase(
  nowMs: number,
  override: ProductHuntOverride | null = null,
): ProductHuntPhase {
  if (override === "off") return "hidden";
  if (override === "pre") return "pre";
  if (override === "live") return "live";
  if (nowMs < PH_GO_LIVE_MS) return "pre";
  if (nowMs < PH_END_MS) return "live";
  return "hidden";
}

export function remainingUntilGoLive(nowMs: number): number {
  return Math.max(0, PH_GO_LIVE_MS - nowMs);
}

export type CountdownParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

export function countdownParts(remainingMs: number): CountdownParts {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds };
}

export function formatCountdownLabel(parts: CountdownParts): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${parts.days}d ${pad(parts.hours)}h ${pad(parts.minutes)}m ${pad(parts.seconds)}s`;
}

/** Auth flows should not carry marketing chrome. */
export function isProductHuntAuthPath(pathname: string): boolean {
  const path =
    pathname.endsWith("/") && pathname.length > 1
      ? pathname.slice(0, -1)
      : pathname;
  return path === "/login" || path === "/account";
}
