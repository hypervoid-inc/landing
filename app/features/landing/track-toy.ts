import { captureAnalytics } from "../analytics/analytics.client";

const seen = new Set<string>();

/** Counts a homepage toy the first time it is played with in a page view. */
export function trackToy(toy: string) {
  if (seen.has(toy)) return;
  seen.add(toy);
  captureAnalytics("landing_toy_used", { toy });
}
