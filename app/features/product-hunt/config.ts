/** Permanent Product Hunt social proof. No launch clock or temporary copy. */

export const PH_PRODUCT_NAME = "Construct Computer";
export const PH_PRODUCT_ORIGIN = "https://www.producthunt.com";
export const PH_PRODUCT_PATH = "/products/construct-computer";
export const PH_POST_ID = "1186033";
export const PH_DAILY_BADGE_IMG = `https://api.producthunt.com/widgets/embed-image/v1/top-post-badge.svg?post_id=${PH_POST_ID}&theme=light&period=daily&t=1788083021667`;
export const PH_WEEKLY_BADGE_IMG = `https://api.producthunt.com/widgets/embed-image/v1/top-post-topic-badge.svg?post_id=${PH_POST_ID}&theme=light&period=weekly&topic_id=46&t=1788083021667`;
export const PH_DAILY_AWARD = "#1 Product of the Day";
export const PH_WEEKLY_AWARD = "#5 Productivity App of the Week";
export const PH_BADGE_ALT =
  "Construct Computer - Your AI coworker gets a computer. You get your day back. | Product Hunt";

export type ProductHuntAward = "daily" | "weekly-productivity";

export type ProductHuntSurface =
  "home-corner" | "home-mobile-hero" | "footer" | "blog-article";

/**
 * Permanent award links go straight to the product page; there is no
 * clock-dependent redirect or campaign state to keep in sync.
 */
export function productHuntHref(
  surface: ProductHuntSurface,
  award: ProductHuntAward,
): string {
  const url = new URL(PH_PRODUCT_PATH, PH_PRODUCT_ORIGIN);
  url.searchParams.set("embed", "true");
  url.searchParams.set(
    "utm_source",
    award === "daily" ? "badge-top-post-badge" : "badge-top-post-topic-badge",
  );
  url.searchParams.set("utm_medium", "badge");
  url.searchParams.set("utm_campaign", "badge-construct-computer");
  url.searchParams.set("utm_content", surface);
  return url.toString();
}
