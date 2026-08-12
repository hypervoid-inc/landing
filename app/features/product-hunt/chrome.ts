/**
 * Chrome height for sticky consumers (PH banner + site header).
 */

const chromeHeightListeners = new Set<(heightPx: number) => void>();

function notifyChromeHeight(heightPx: number) {
  for (const listener of chromeHeightListeners) listener(heightPx);
}

/** Matches SiteHeader `h-12` / `lg:h-14`. Do not parse rem from CSS custom props. */
export function readSiteHeaderHeightPx(): number {
  if (typeof window === "undefined") return 56;
  return window.matchMedia("(min-width: 1024px)").matches ? 56 : 48;
}

/**
 * True when the sticky PH bar would occupy chrome (phase window).
 * Used by CampaignBanner to avoid stacking strips.
 */
export function isPhBannerActive(phase: "pre" | "live" | "hidden"): boolean {
  return phase === "pre" || phase === "live";
}

const PH_BANNER_HEIGHT_VAR = "--ph-banner-height";
const SITE_CHROME_HEIGHT_VAR = "--site-chrome-height";

export function setPhBannerHeightPx(heightPx: number): void {
  if (typeof document === "undefined") return;
  const safe = Math.max(0, Math.round(heightPx));
  document.documentElement.style.setProperty(PH_BANNER_HEIGHT_VAR, `${safe}px`);
}

/** Full sticky stack (banner + header) — drives rail / workflow / Clippy. */
export function setSiteChromeHeightPx(heightPx: number): void {
  if (typeof document === "undefined") return;
  const safe = Math.max(0, Math.round(heightPx));
  document.documentElement.style.setProperty(
    SITE_CHROME_HEIGHT_VAR,
    `${safe}px`,
  );
  notifyChromeHeight(safe);
}

export function readSiteChromeHeightPx(fallback = 56): number {
  if (typeof document === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(SITE_CHROME_HEIGHT_VAR)
    .trim();
  if (raw.endsWith("px")) {
    const parsed = Number.parseFloat(raw);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  const bannerRaw = getComputedStyle(document.documentElement)
    .getPropertyValue(PH_BANNER_HEIGHT_VAR)
    .trim();
  const bannerPx = bannerRaw.endsWith("px")
    ? Number.parseFloat(bannerRaw) || 0
    : 0;
  return bannerPx + readSiteHeaderHeightPx();
}

export function subscribeSiteChromeHeight(
  listener: (heightPx: number) => void,
): () => void {
  chromeHeightListeners.add(listener);
  return () => {
    chromeHeightListeners.delete(listener);
  };
}

export function clearPhBannerChrome(): void {
  setPhBannerHeightPx(0);
}
