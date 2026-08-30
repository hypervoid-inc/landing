/**
 * Measured height of the sticky site header.
 *
 * Consumers subscribe instead of hardcoding the responsive 48/56px header so
 * sticky rails, anchor scrolling, workflow stages, and floating UI continue to
 * agree if the navigation changes size.
 */

const chromeHeightListeners = new Set<(heightPx: number) => void>();
const SITE_CHROME_HEIGHT_VAR = "--site-chrome-height";

function notifyChromeHeight(heightPx: number) {
  for (const listener of chromeHeightListeners) listener(heightPx);
}

export function readSiteHeaderHeightPx(): number {
  if (typeof window === "undefined") return 56;
  return window.matchMedia("(min-width: 1024px)").matches ? 56 : 48;
}

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
  return readSiteHeaderHeightPx();
}

export function subscribeSiteChromeHeight(
  listener: (heightPx: number) => void,
): () => void {
  chromeHeightListeners.add(listener);
  return () => chromeHeightListeners.delete(listener);
}
