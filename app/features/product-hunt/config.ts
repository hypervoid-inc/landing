/**
 * Product Hunt launch campaign constants.
 *
 * Go-live is stored as an absolute UTC instant (Aug 23, 2026 12:01 AM PDT).
 * Do not re-derive “local PT” on the client — clocks and DST parsing disagree.
 */

export const PH_GO_LIVE_MS = Date.parse("2026-08-23T07:01:00.000Z");
/** Campaign chrome hides after go-live + 7 days. */
export const PH_END_MS = PH_GO_LIVE_MS + 7 * 24 * 60 * 60 * 1000;

export const PH_PRODUCT_PATH = "/products/construct-computer";
export const PH_PRODUCT_ORIGIN = "https://www.producthunt.com";

export const PH_POST_ID = "1186033";
export const PH_BADGE_IMG = `https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=${PH_POST_ID}&theme=light&t=1786520703789`;
export const PH_LOGO_IMG =
  "https://ph-files.imgix.net/a30c48be-7563-43ac-8434-5babf5ffa7ef.png?auto=compress,format&codec=mozjpeg&cs=strip&fit=crop&h=80&w=80";

export const PH_TAGLINE =
  "An AI employee with a computer, an email, and a to-do list";
export const PH_PRODUCT_NAME = "Construct Computer";

export const PH_CONFETTI_SESSION_KEY = "ph_confetti_2026";

export type ProductHuntSurface =
  | "banner"
  | "footer"
  | "embed"
  | "hero"
  | "launch"
  | "blog";

export function productHuntUrl(surface: ProductHuntSurface): string {
  const url = new URL(PH_PRODUCT_PATH, PH_PRODUCT_ORIGIN);
  url.searchParams.set("embed", "true");
  url.searchParams.set("utm_source", surface === "footer" ? "badge-featured" : surface);
  url.searchParams.set(
    "utm_medium",
    surface === "footer" || surface === "banner" ? "badge" : "embed",
  );
  url.searchParams.set("utm_campaign", "badge-construct-computer");
  url.searchParams.set("utm_content", surface);
  return url.toString();
}

export function productHuntCopy(phase: "pre" | "live") {
  if (phase === "pre") {
    return {
      eyebrow: "Launching on Product Hunt",
      cta: "Follow our launch",
      bannerLead: "Launching on Product Hunt in",
      homepageLead:
        "We’re launching on Product Hunt soon. Follow Construct so you don’t miss day one.",
      launchSecondary: "Follow our Product Hunt launch",
    } as const;
  }
  return {
    eyebrow: "Live on Product Hunt",
    cta: "Upvote our launch",
    bannerLead: "We’re live on Product Hunt",
    homepageLead:
      "We’re live on Product Hunt. Your upvote helps more founders find Construct.",
    launchSecondary: "Upvote our Product Hunt launch",
  } as const;
}
