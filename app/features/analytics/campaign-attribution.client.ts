import {
  ATTRIBUTION_COOKIE_NAME,
  ATTRIBUTION_MAX_AGE_SECONDS,
  mergeFirstTouch,
  parseAttributionCookie,
  parseCampaignParams,
  serializeAttribution,
  type CampaignAttribution,
} from "./campaign-attribution";

const ROOT_DOMAIN = "construct.computer";
const TOUCH_SESSION_KEY = "construct_campaign_touch";

/**
 * `Domain=.construct.computer` is what carries attribution across the hop to
 * os.construct.computer. Preview builds run on `*.pages.dev` and dev on
 * `localhost`, where that attribute would make the browser reject the cookie
 * outright — so it is only added when we're actually on the real domain.
 */
function cookieDomainAttribute(hostname: string): string {
  return hostname === ROOT_DOMAIN || hostname.endsWith(`.${ROOT_DOMAIN}`)
    ? `; Domain=.${ROOT_DOMAIN}`
    : "";
}

export function readAttributionCookie(): CampaignAttribution | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${ATTRIBUTION_COOKIE_NAME}=`));
  return parseAttributionCookie(match?.slice(ATTRIBUTION_COOKIE_NAME.length + 1));
}

function writeAttributionCookie(value: CampaignAttribution): void {
  const domain = cookieDomainAttribute(window.location.hostname);
  // SameSite=Lax so it still rides the top-level navigation to os.* and the
  // Google OAuth round-trip through api.construct.computer.
  document.cookie =
    `${ATTRIBUTION_COOKIE_NAME}=${serializeAttribution(value)}` +
    `${domain}; Path=/; Max-Age=${ATTRIBUTION_MAX_AGE_SECONDS}; SameSite=Lax; Secure`;
}

/**
 * Attach a promo code to the stored attribution.
 *
 * Used by the `/launch` code chips. `mergeFirstTouch` deliberately lets the
 * promo code move even though every other field is first-touch-immutable:
 * clicking a code is a fresh, explicit intent, and the code has to reach the
 * checkout session to be worth anything. Writes a cookie even when there is no
 * prior campaign, so a direct visitor to /launch still gets their discount.
 */
export function writePromoCode(code: string): void {
  if (typeof window === "undefined") return;
  const existing = readAttributionCookie();
  const merged = mergeFirstTouch(existing, { p: code, t: Date.now() });
  if (merged) writeAttributionCookie(merged);
}

/**
 * Capture campaign params on load and persist first touch.
 *
 * Called synchronously from the `<Analytics />` mount effect rather than inside
 * the idle callback: a recipient who clicks the hero CTA within a couple of
 * hundred milliseconds must still carry attribution to os.construct.computer.
 * PostHog initialisation can wait; this cannot.
 *
 * Returns the merged attribution (or null), whether this load was the first
 * touch, and the raw this-navigation parse when it carried `s` (for campaign-
 * touch — do not use first-touch-merged cookie fields for that).
 */
export function captureCampaignOnLoad(): {
  attribution: CampaignAttribution | null;
  isFirstTouch: boolean;
  /** This URL's parse when it includes `s`; null for cookie-only returns. */
  click: CampaignAttribution | null;
} {
  if (typeof window === "undefined") {
    return { attribution: null, isFirstTouch: false, click: null };
  }

  const existing = readAttributionCookie();
  const incoming = parseCampaignParams(
    window.location.search,
    window.location.pathname,
  );
  const click = incoming?.s ? incoming : null;

  if (!incoming) {
    return { attribution: existing, isFirstTouch: false, click: null };
  }

  const merged = mergeFirstTouch(existing, incoming);
  if (merged) writeAttributionCookie(merged);
  return {
    attribution: merged,
    isFirstTouch: existing === null,
    click,
  };
}

/**
 * Resolve Listmonk subscriber UUID → email via first-party campaign-touch.
 * One attempt per tab session for a given sid. Pass the **this-click** sid and
 * UTMs from the URL — not first-touch-merged cookie fields (those may omit `s`).
 */
export async function touchCampaignSubscriber(input: {
  sid: string;
  utmCampaign?: string;
  utmContent?: string;
  landingPath?: string;
}): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const sid = input.sid.trim();
  if (!sid) return null;

  try {
    if (sessionStorage.getItem(TOUCH_SESSION_KEY) === sid) return null;
  } catch {
    // sessionStorage may be blocked; still attempt the touch once.
  }

  try {
    const response = await fetch("/api/campaign-touch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        sid,
        ...(input.utmCampaign ? { utm_campaign: input.utmCampaign } : {}),
        ...(input.utmContent ? { utm_content: input.utmContent } : {}),
        ...(input.landingPath ? { landing_path: input.landingPath } : {}),
      }),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { email?: unknown };
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email.includes("@")) return null;
    try {
      sessionStorage.setItem(TOUCH_SESSION_KEY, sid);
    } catch {
      // ignore
    }
    return email;
  } catch {
    return null;
  }
}
