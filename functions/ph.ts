import {
  PH_GO_LIVE_MS,
  productHuntFollowUrl,
  productHuntUrl,
} from "../app/features/product-hunt/config";
import type { PagesFunction } from "./types";

/**
 * `construct.computer/ph` — the Product Hunt shortlink.
 *
 * This exists because the destination is not one URL. Before go-live the only
 * page carrying a Follow button is the discussion page (/p/<slug>); the upvote
 * only appears on the product page (/products/<slug>) once the launch is live.
 * A link printed on the livestream, in the OG copy, and in email cannot be
 * repointed at 12:01 AM PT, so the switch is decided here from the same
 * PH_GO_LIVE_MS every other surface reads.
 *
 * This is the exception to "do not add a runtime server for content that can be
 * prerendered": the answer depends on wall-clock time, so it cannot be baked.
 * The static counterpart, /discord, stays in public/_redirects where it belongs.
 *
 * 302, never 301: a permanent redirect would be cached by browsers and
 * intermediaries past go-live and strand people on the pre-launch page for the
 * one day it matters.
 */

/** `?ph=pre|live` forces a phase so the destination is testable without clocks. */
function overrideFrom(search: URLSearchParams): "pre" | "live" | null {
  const value = search.get("ph");
  return value === "pre" || value === "live" ? value : null;
}

export function destinationFor(nowMs: number, search: URLSearchParams): string {
  const phase = overrideFrom(search) ?? (nowMs < PH_GO_LIVE_MS ? "pre" : "live");
  const base =
    phase === "pre" ? productHuntFollowUrl("shortlink") : productHuntUrl("shortlink");

  // Let a caller tag its own placement — construct.computer/ph?utm_content=stream
  // — without letting it rewrite the destination itself.
  const url = new URL(base);
  for (const [key, value] of search) {
    if (key === "ph") continue;
    if (!key.startsWith("utm_")) continue;
    url.searchParams.set(key, value);
  }
  return url.toString();
}

export const onRequest: PagesFunction<unknown> = ({ request }) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
  }

  const { searchParams } = new URL(request.url);
  return new Response(null, {
    status: 302,
    headers: {
      Location: destinationFor(Date.now(), searchParams),
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
};
