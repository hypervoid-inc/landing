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
/**
 * The discussion page. Before go-live it is the ONLY surface carrying a
 * Follow button — /products/ has nothing to follow until a launch is live —
 * so every pre-launch "follow us" CTA has to point here, not there.
 */
export const PH_FORUM_PATH = "/p/construct-computer";
export const PH_PRODUCT_ORIGIN = "https://www.producthunt.com";

export const PH_POST_ID = "1186033";
export const PH_FEATURED_BADGE_IMG = `https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=${PH_POST_ID}&theme=light&t=1786520703789`;
/** Won #1 Product of the Day. Replaces the featured badge for `live`. */
export const PH_TOP_POST_BADGE_IMG = `https://api.producthunt.com/widgets/embed-image/v1/top-post-badge.svg?post_id=${PH_POST_ID}&theme=light&period=daily&t=1787555825007`;
export const PH_LOGO_IMG =
  "https://ph-files.imgix.net/a30c48be-7563-43ac-8434-5babf5ffa7ef.png?auto=compress,format&codec=mozjpeg&cs=strip&fit=crop&h=80&w=80";

export const PH_TAGLINE =
  "A real computer for your AI coworker";
export const PH_PRODUCT_NAME = "Construct Computer";

export const PH_CONFETTI_SESSION_KEY = "ph_confetti_2026";

export type ProductHuntSurface =
  | "banner"
  | "footer"
  | "embed"
  | "hero"
  | "launch"
  | "blog"
  /** The /ph shortlink — printed on the livestream, read off a screen. */
  | "shortlink";

function phAttribution(surface: ProductHuntSurface): URLSearchParams {
  const params = new URLSearchParams();
  params.set(
    "utm_source",
    surface === "footer" ? "badge-featured" : surface,
  );
  params.set(
    "utm_medium",
    surface === "footer" || surface === "banner" ? "badge" : "embed",
  );
  params.set("utm_campaign", "badge-construct-computer");
  params.set("utm_content", surface);
  return params;
}

function phUrl(
  path: string,
  surface: ProductHuntSurface,
  { embed = true }: { embed?: boolean } = {},
): string {
  const url = new URL(path, PH_PRODUCT_ORIGIN);
  if (embed) url.searchParams.set("embed", "true");
  for (const [key, value] of phAttribution(surface)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

/**
 * On-site href for every Product Hunt CTA. `/ph` is a Pages Function that
 * picks the real destination from the clock (discussion page before go-live,
 * product page after) so badges do not hardcode a URL that goes stale at
 * 12:01 AM PT.
 */
export function productHuntHref(surface: ProductHuntSurface): string {
  return `/ph?${phAttribution(surface).toString()}`;
}

export function productHuntUrl(surface: ProductHuntSurface): string {
  return phUrl(PH_PRODUCT_PATH, surface);
}

/**
 * Where to send someone who wants to be told when we launch. `embed=true` is
 * omitted deliberately: this is a link a person follows, not a badge embed.
 */
export function productHuntFollowUrl(surface: ProductHuntSurface): string {
  return phUrl(PH_FORUM_PATH, surface, { embed: false });
}

export function productHuntCopy(phase: "pre" | "live") {
  if (phase === "pre") {
    return {
      eyebrow: "Launching on Product Hunt",
      cta: "Follow our launch",
      bannerRegion: "Launching on Product Hunt",
      bannerLead: "Launching on Product Hunt in",
      // Narrow phones: the badge beside it already reads "Product Hunt".
      bannerLeadShort: "Launching in",
      homepageLead:
        "We’re launching on Product Hunt soon. Follow Construct so you don’t miss day one.",
      launchSecondary: "Follow our Product Hunt launch",
    } as const;
  }
  /**
   * Every surface that shows one of these lines also shows the top-post badge,
   * and that badge already reads “#1 Product of the Day”. So the words never
   * restate the award — they say thanks once and point at the post. Keeping
   * each field distinct is what stops a card from printing the same sentence
   * as eyebrow, title, and image all at once.
   */
  return {
    eyebrow: "Launch week",
    cta: "See the launch",
    // Region name, not visible copy: screen readers get the fact the badge
    // carries visually.
    bannerRegion: `${PH_PRODUCT_NAME} is #1 Product of the Day on Product Hunt`,
    // The badge sits directly beside these two, so neither echoes the rank.
    bannerLead: "Thank you for the support today",
    bannerLeadShort: "Thank you for the support",
    homepageLead: "You put Construct at #1 on Product Hunt. Thank you.",
    launchSecondary: "Thank you to everyone who showed up",
  } as const;
}
