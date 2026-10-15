/**
 * Campaign attribution capture.
 *
 * Email campaigns land on `construct.computer` with short query keys
 * (`?s=…&uc=…&uo=…`) or legacy long names (`?ref=…&cid=…&sid=…&utm_*`).
 * Signup happens on `app.construct.computer` and the account row lives behind
 * `api.construct.computer`. This module owns the portable representation that
 * survives both hops: a compact cookie scoped to `.construct.computer`.
 *
 * Two deliberate constraints shape everything here:
 *
 * 1. Keys are one or two characters. The parsed values also ride along as
 *    PostHog super properties, which share a single ~4KB cookie, when it
 *    overflows, posthog-js drops properties silently. Short keys plus the length
 *    cap below keep the whole payload in the hundreds of bytes.
 * 2. Values are allowlisted and pattern-checked. Anything arriving from a query
 *    string is attacker-controlled; it ends up in a cookie, in analytics
 *    properties, and eventually in a D1 row.
 *
 * The API-side parser (`apps/api/src/domain/auth/attribution.ts` in the v2 repo)
 * must agree with `COOKIE_NAME` and the key shape. There is no shared package
 * between the repos, so both sides carry a test asserting these literals.
 */

/** Read by the v2 API at signup. Changing this breaks attribution silently. */
export const ATTRIBUTION_COOKIE_NAME = "construct_attr";

/** 90 days. Long enough for a considered B2B purchase, short enough to expire. */
export const ATTRIBUTION_MAX_AGE_SECONDS = 7_776_000;

/** Query-string values are untrusted input; keep them short and boring. */
const VALUE_PATTERN = /^[A-Za-z0-9._~-]{1,64}$/;
const PROMO_PATTERN = /^[A-Z0-9]{4,16}$/;
/** Paths can contain `/`, so they get their own rule. */
const PATH_PATTERN = /^\/[A-Za-z0-9._~\-/]{0,127}$/;
/** A bare hostname, already lowercased. Never a URL, never a path. */
const DOMAIN_PATTERN = /^[a-z0-9.-]{1,64}$/;
/**
 * The last label of a real domain starts with a letter. This rejects IPv4
 * literals (and anything else ending in digits), which must never reach the
 * cookie or analytics. IPv6 hosts already fail DOMAIN_PATTERN on the brackets.
 */
const TLD_PATTERN = /(^|\.)[a-z][a-z0-9-]*$/;

function isDomain(value: string): boolean {
  return DOMAIN_PATTERN.test(value) && TLD_PATTERN.test(value);
}
/** "How did you hear about us?" answers are fixed slugs, never free text. */
const HEARD_ABOUT_PATTERN = /^[a-z0-9-]{1,32}$/;

/**
 * Referrers that are a hop inside our own flow rather than a way people find
 * us: our own pages, the Google sign-in bounce, Gmail's Android app handing a
 * link to the browser, and returning from Stripe. Crediting any of these as a
 * "source" is how accounts.google.com ended up looking like a channel.
 */
const OWN_ROOT_DOMAIN = "construct.computer";
const IGNORED_REFERRER_HOSTS = new Set([
  "com.google.android.gm",
  "checkout.stripe.com",
  "billing.stripe.com",
  "accounts.youtube.com",
]);
/** accounts.google.com plus its country variants (accounts.google.co.in...). */
const GOOGLE_ACCOUNTS_HOST = /^accounts\.google\.[a-z.]+$/;

/**
 * `Domain=.construct.computer` is what carries a first-party cookie across the
 * hop to app.construct.computer and os.construct.computer. Preview builds run
 * on `*.pages.dev` and dev on `localhost`, where that attribute would make the
 * browser reject the cookie outright, so it is only added on the real domain.
 */
export function cookieDomainAttribute(hostname: string): string {
  return hostname === OWN_ROOT_DOMAIN ||
    hostname.endsWith(`.${OWN_ROOT_DOMAIN}`)
    ? `; Domain=.${OWN_ROOT_DOMAIN}`
    : "";
}

export type CampaignAttribution = {
  /** `ref`, coarse channel, e.g. `mailinglist`. */
  r?: string;
  /** `cid`, listmonk campaign UUID. */
  c?: string;
  /** `sid`, listmonk subscriber UUID. Pseudonymous, never the email address. */
  s?: string;
  /** `utm_source` */
  us?: string;
  /** `utm_medium` */
  um?: string;
  /** `utm_campaign` */
  uc?: string;
  /** `utm_content`, link placement, e.g. `cta-body-1`. */
  uo?: string;
  /** `utm_term` */
  ut?: string;
  /**
   * Referring domain of the first touch, hostname only with `www.` dropped.
   * Kept even without UTMs, so organic and social visits are not invisible.
   */
  rd?: string;
  /** Promo code (`code` or `promo`), uppercased. */
  p?: string;
  /** "How did you hear about us?" slug from the sign-in form. */
  h?: string;
  /** Landing path of the first touch. */
  lp?: string;
  /** First-touch timestamp, epoch ms. */
  t?: number;
};

/** Short cookie-key aliases first, then legacy long query names. */
const PARAM_ALIASES: ReadonlyArray<
  readonly [readonly string[], keyof CampaignAttribution]
> = [
  [["r", "ref"], "r"],
  [["c", "cid"], "c"],
  [["s", "sid"], "s"],
  [["us", "utm_source"], "us"],
  [["um", "utm_medium"], "um"],
  [["uc", "utm_campaign"], "uc"],
  [["uo", "utm_content"], "uo"],
  [["ut", "utm_term"], "ut"],
];

/**
 * Fields that come from a tagged link. They outrank a bare referring domain:
 * a visitor who once found us through search and later clicks a newsletter or
 * UTM link should still be credited to that campaign.
 */
const CAMPAIGN_KEYS = ["r", "c", "s", "us", "um", "uc", "uo", "ut"] as const;

/**
 * Fields that make a cookie a real first touch. `p` and `h` are excluded on
 * purpose: they can be written later by an explicit click, and a cookie holding
 * only one of them must not block the first real campaign or referrer.
 */
const FIRST_TOUCH_KEYS = [...CAMPAIGN_KEYS, "rd"] as const;

export function hasFirstTouch(value: CampaignAttribution | null): boolean {
  return !!value && FIRST_TOUCH_KEYS.some((key) => value[key] !== undefined);
}

/** True when the value carries fields from a tagged link, not just `rd`. */
export function hasCampaign(value: CampaignAttribution | null): boolean {
  return !!value && CAMPAIGN_KEYS.some((key) => value[key] !== undefined);
}

/** Filled when `s` is present so email CTAs can omit constant UTM noise. */
const EMAIL_CLICK_DEFAULTS = {
  r: "mailinglist",
  us: "newsletter",
  um: "email",
} as const;

function clean(value: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return VALUE_PATTERN.test(trimmed) ? trimmed : undefined;
}

function cleanPromo(value: string | null): string | undefined {
  if (!value) return undefined;
  const upper = value.trim().toUpperCase();
  return PROMO_PATTERN.test(upper) ? upper : undefined;
}

function cleanPath(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return PATH_PATTERN.test(value) ? value : undefined;
}

/**
 * Reduce `document.referrer` to a bare, lowercased hostname, or undefined when
 * it is empty, not http(s), or one of our own hops (see IGNORED_REFERRER_HOSTS).
 * `currentHost` covers previews and localhost, where our own pages are not on
 * construct.computer.
 */
export function referringDomain(
  referrer: string | null | undefined,
  currentHost?: string,
): string | undefined {
  if (!referrer) return undefined;
  let host: string;
  try {
    const url = new URL(referrer);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    host = url.hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    return undefined;
  }
  if (currentHost && host === currentHost.toLowerCase()) return undefined;
  if (host === OWN_ROOT_DOMAIN || host.endsWith(`.${OWN_ROOT_DOMAIN}`)) {
    return undefined;
  }
  if (IGNORED_REFERRER_HOSTS.has(host) || GOOGLE_ACCOUNTS_HOST.test(host)) {
    return undefined;
  }
  const domain = host.startsWith("www.") ? host.slice(4) : host;
  return isDomain(domain) ? domain : undefined;
}

function pickParam(
  params: URLSearchParams,
  names: readonly string[],
): string | undefined {
  for (const name of names) {
    const value = clean(params.get(name));
    if (value) return value;
  }
  return undefined;
}

/**
 * Parse campaign params out of a query string, plus the referring domain when
 * a referrer is passed.
 *
 * Returns `null` when nothing recognisable was present, so callers can cheaply
 * distinguish "no campaign" from "campaign with empty fields" and avoid
 * rewriting the cookie on every ordinary pageview.
 */
export function parseCampaignParams(
  search: string,
  pathname?: string,
  referrer?: { url: string; currentHost?: string },
): CampaignAttribution | null {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );

  const parsed: CampaignAttribution = {};
  for (const [names, key] of PARAM_ALIASES) {
    const value = pickParam(params, names);
    if (value) parsed[key] = value as never;
  }

  const promo = cleanPromo(params.get("code") ?? params.get("promo"));
  if (promo) parsed.p = promo;

  const domain = referrer
    ? referringDomain(referrer.url, referrer.currentHost)
    : undefined;
  if (domain) parsed.rd = domain;

  if (Object.keys(parsed).length === 0) return null;

  if (parsed.s) {
    if (!parsed.r) parsed.r = EMAIL_CLICK_DEFAULTS.r;
    if (!parsed.us) parsed.us = EMAIL_CLICK_DEFAULTS.us;
    if (!parsed.um) parsed.um = EMAIL_CLICK_DEFAULTS.um;
  }

  const path = cleanPath(pathname);
  if (path) parsed.lp = path;
  parsed.t = Date.now();
  return parsed;
}

/**
 * First touch wins.
 *
 * Someone who arrives from the email, leaves, and returns via Google should
 * still be credited to the email. Only two fields are allowed to move. The
 * promo code: a visitor who later clicks a `/launch` code chip is expressing a
 * fresh, deliberate intent, and the code has to reach checkout to be worth
 * anything. And the "how did you hear" answer, which is the person telling us
 * directly.
 *
 * A cookie holding only those two (a direct visitor who clicked a code chip)
 * has no first touch yet, so the next real campaign or referrer still lands.
 *
 * A cookie holding only a referring domain is a weaker first touch. The next
 * tagged link still writes its campaign fields, while the original `rd`, `lp`
 * and `t` stay put.
 */
export function mergeFirstTouch(
  existing: CampaignAttribution | null,
  incoming: CampaignAttribution | null,
): CampaignAttribution | null {
  if (!existing) return incoming;
  if (!incoming) return existing;
  const explicit = {
    ...(incoming.p ? { p: incoming.p } : {}),
    ...(incoming.h ? { h: incoming.h } : {}),
  };
  if (hasFirstTouch(existing)) {
    if (hasCampaign(existing) || !hasCampaign(incoming)) {
      return { ...existing, ...explicit };
    }
    const campaign: CampaignAttribution = {};
    for (const key of CAMPAIGN_KEYS) {
      const value = incoming[key];
      if (value !== undefined) campaign[key] = value;
    }
    return { ...existing, ...campaign, ...explicit };
  }
  return { ...existing, ...incoming, ...explicit };
}

export function serializeAttribution(value: CampaignAttribution): string {
  return encodeURIComponent(JSON.stringify(value));
}

/**
 * Parse the cookie value. Tolerates anything, a malformed or hand-edited
 * cookie must degrade to "no attribution", never throw during app boot.
 */
export function parseAttributionCookie(
  raw: string | null | undefined,
): CampaignAttribution | null {
  if (!raw) return null;
  try {
    const decoded = JSON.parse(decodeURIComponent(raw)) as unknown;
    if (!decoded || typeof decoded !== "object") return null;
    const source = decoded as Record<string, unknown>;
    const out: CampaignAttribution = {};
    for (const key of ["r", "c", "s", "us", "um", "uc", "uo", "ut"] as const) {
      const value = source[key];
      if (typeof value === "string" && VALUE_PATTERN.test(value)) {
        out[key] = value;
      }
    }
    if (typeof source.p === "string" && PROMO_PATTERN.test(source.p)) {
      out.p = source.p;
    }
    if (typeof source.rd === "string" && isDomain(source.rd)) {
      out.rd = source.rd;
    }
    if (typeof source.h === "string" && HEARD_ABOUT_PATTERN.test(source.h)) {
      out.h = source.h;
    }
    if (typeof source.lp === "string" && PATH_PATTERN.test(source.lp)) {
      out.lp = source.lp;
    }
    if (typeof source.t === "number" && Number.isFinite(source.t)) {
      out.t = source.t;
    }
    return Object.keys(out).length > 0 ? out : null;
  } catch {
    return null;
  }
}

/**
 * Readable property names for PostHog. The short keys are a wire format only.
 *
 * `rd` is deliberately not `referring_domain`, which would sit next to
 * PostHog's own `$referring_domain` and `$initial_referring_domain`. Those are
 * computed per session and per first pageview and do not skip our own hops,
 * which is how the Google sign-in bounce shows up as a source. `h` is left out
 * because the sign-in form sends it as its own `heard_about` property.
 */
export function toAnalyticsProperties(
  value: CampaignAttribution,
): Record<string, string | number> {
  const props: Record<string, string | number> = {};
  if (value.r) props.campaign_ref = value.r;
  if (value.c) props.campaign_id = value.c;
  if (value.s) props.campaign_subscriber_id = value.s;
  if (value.us) props.utm_source = value.us;
  if (value.um) props.utm_medium = value.um;
  if (value.uc) props.utm_campaign = value.uc;
  if (value.uo) props.utm_content = value.uo;
  if (value.ut) props.utm_term = value.ut;
  if (value.rd) props.referring_domain_first_touch = value.rd;
  if (value.p) props.campaign_promo_code = value.p;
  if (value.lp) props.campaign_landing_path = value.lp;
  if (value.t) props.campaign_captured_at = value.t;
  return props;
}
