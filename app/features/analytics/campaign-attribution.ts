/**
 * Campaign attribution capture.
 *
 * Email campaigns land on `construct.computer` with `?ref=…&cid=…&sid=…&utm_*`,
 * but signup happens on `os.construct.computer` and the account row lives behind
 * `api.construct.computer`. This module owns the portable representation that
 * survives both hops: a compact cookie scoped to `.construct.computer`.
 *
 * Two deliberate constraints shape everything here:
 *
 * 1. Keys are one or two characters. The parsed values also ride along as
 *    PostHog super properties, which share a single ~4KB cookie — when it
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

export type CampaignAttribution = {
  /** `ref` — coarse channel, e.g. `mailinglist`. */
  r?: string;
  /** `cid` — listmonk campaign UUID. */
  c?: string;
  /** `sid` — listmonk subscriber UUID. Pseudonymous, never the email address. */
  s?: string;
  /** `utm_source` */
  us?: string;
  /** `utm_medium` */
  um?: string;
  /** `utm_campaign` */
  uc?: string;
  /** Promo code (`code` or `promo`), uppercased. */
  p?: string;
  /** Landing path of the first touch. */
  lp?: string;
  /** First-touch timestamp, epoch ms. */
  t?: number;
};

const PARAM_TO_KEY: ReadonlyArray<readonly [string, keyof CampaignAttribution]> =
  [
    ["ref", "r"],
    ["cid", "c"],
    ["sid", "s"],
    ["utm_source", "us"],
    ["utm_medium", "um"],
    ["utm_campaign", "uc"],
  ];

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
 * Parse campaign params out of a query string.
 *
 * Returns `null` when nothing recognisable was present, so callers can cheaply
 * distinguish "no campaign" from "campaign with empty fields" and avoid
 * rewriting the cookie on every ordinary pageview.
 */
export function parseCampaignParams(
  search: string,
  pathname?: string,
): CampaignAttribution | null {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );

  const parsed: CampaignAttribution = {};
  for (const [param, key] of PARAM_TO_KEY) {
    const value = clean(params.get(param));
    if (value) parsed[key] = value as never;
  }

  const promo = cleanPromo(params.get("code") ?? params.get("promo"));
  if (promo) parsed.p = promo;

  if (Object.keys(parsed).length === 0) return null;

  const path = cleanPath(pathname);
  if (path) parsed.lp = path;
  parsed.t = Date.now();
  return parsed;
}

/**
 * First touch wins.
 *
 * Someone who arrives from the email, leaves, and returns via Google should
 * still be credited to the email. The only field allowed to move is the promo
 * code: a visitor who later clicks a `/launch` code chip is expressing a fresh,
 * deliberate intent, and the code has to reach checkout to be worth anything.
 */
export function mergeFirstTouch(
  existing: CampaignAttribution | null,
  incoming: CampaignAttribution | null,
): CampaignAttribution | null {
  if (!existing) return incoming;
  if (!incoming) return existing;
  return { ...existing, ...(incoming.p ? { p: incoming.p } : {}) };
}

export function serializeAttribution(value: CampaignAttribution): string {
  return encodeURIComponent(JSON.stringify(value));
}

/**
 * Parse the cookie value. Tolerates anything — a malformed or hand-edited
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
    for (const key of ["r", "c", "s", "us", "um", "uc"] as const) {
      const value = source[key];
      if (typeof value === "string" && VALUE_PATTERN.test(value)) {
        out[key] = value;
      }
    }
    if (typeof source.p === "string" && PROMO_PATTERN.test(source.p)) {
      out.p = source.p;
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

/** Readable property names for PostHog. The short keys are a wire format only. */
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
  if (value.p) props.campaign_promo_code = value.p;
  if (value.lp) props.campaign_landing_path = value.lp;
  if (value.t) props.campaign_captured_at = value.t;
  return props;
}
