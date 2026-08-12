import { useEffect, useState } from "react";
import { Link } from "react-router";

import { cn } from "../../lib/cn";
import { captureAnalytics } from "../analytics/analytics.client";
import { readAttributionCookie } from "../analytics/campaign-attribution.client";
import type { CampaignAttribution } from "../analytics/campaign-attribution";
import { isPhBannerActive } from "../product-hunt/chrome";
import { useProductHuntPhase } from "../product-hunt/use-product-hunt-phase";

/**
 * In-memory only — survives SPA remounts while the JS context lives, clears on
 * hard refresh. Matches Clippy: dismiss for this visit, not across reloads.
 */
let dismissedThisVisit = false;

/**
 * Campaign banner for visitors arriving from the email.
 *
 * Renders `null` on the first pass and only reveals after mount. That is
 * required, not stylistic: the whole site is prerendered to static HTML, so the
 * server-side markup contains no banner. Emitting one during the first client
 * render would be a hydration mismatch. Same pattern as ClippyCta and the
 * scrolled state in SiteHeader.
 *
 * Suppressed while the Product Hunt sticky bar is active so strips never stack.
 */
export function CampaignBanner() {
  const [attribution, setAttribution] = useState<CampaignAttribution | null>(
    null,
  );
  const { mounted, phase } = useProductHuntPhase();

  useEffect(() => {
    const reveal = () => {
      if (dismissedThisVisit) return;
      const stored = readAttributionCookie();
      // Any campaign id qualifies, not just `ref=mailinglist`, so future
      // campaigns work without a code change.
      if (!stored?.c && stored?.r !== "mailinglist") return;
      setAttribution(stored);
      captureAnalytics("campaign_banner_shown", {
        ...(stored.c ? { cid: stored.c } : {}),
      });
    };
    reveal();
  }, []);

  if (mounted && isPhBannerActive(phase)) return null;
  if (!attribution) return null;

  return (
    <div
      className={cn(
        "w-full border-b border-[var(--color-line)] bg-[var(--color-surface-subtle,#f7fbfc)]",
        "px-5 py-3",
      )}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
        <span className="text-sm text-[var(--color-ink)]">
          Your pre-launch offer is still open: 7 days of Pro, free.
        </span>
        <Link
          to="/launch/"
          className="text-sm font-semibold text-[var(--color-brand)] underline"
          onClick={() => {
            captureAnalytics("campaign_banner_clicked", {
              ...(attribution.c ? { cid: attribution.c } : {}),
            });
          }}
        >
          See the offer
        </Link>
        <button
          type="button"
          aria-label="Dismiss offer banner"
          className="ml-1 text-sm text-[var(--color-ink-subtle)]"
          onClick={() => {
            dismissedThisVisit = true;
            setAttribution(null);
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
