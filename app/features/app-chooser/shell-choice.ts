import {
  billingReturnKind,
  type BillingReturnKind,
} from "../account/account-format";
import { cookieDomainAttribute } from "../analytics/campaign-attribution";
import { getAppOrigin, getAppUrl, getOsOrigin } from "../../platform/env";

/**
 * The two ways into Construct: the desktop (Construct OS, feels like a Mac)
 * and the dashboard (Zen Mode, works on a phone). Same account, same agents.
 * The dashboard is the one we recommend.
 */
export type Shell = "desktop" | "dashboard";

/**
 * Which one this browser last opened, set on `.construct.computer` by the
 * chooser and both apps. The chooser marks it "Last used", and a return from
 * a checkout or the billing portal (`continuationParams`) goes straight back
 * to it. A plain visit to `/app/` never opens anything by itself.
 */
export const SHELL_COOKIE_NAME = "construct_shell";
const SHELL_COOKIE_MAX_AGE_SECONDS = 31_536_000;

export function parseShellCookie(cookie: string): Shell | null {
  const value = cookie
    .split("; ")
    .find((row) => row.startsWith(`${SHELL_COOKIE_NAME}=`))
    ?.slice(SHELL_COOKIE_NAME.length + 1);
  return value === "desktop" || value === "dashboard" ? value : null;
}

export function serializeShellCookie(shell: Shell, hostname: string): string {
  return (
    `${SHELL_COOKIE_NAME}=${shell}${cookieDomainAttribute(hostname)}` +
    `; Path=/; Max-Age=${SHELL_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax; Secure`
  );
}

/**
 * Query keys the chooser hands on to the app if a browser comes back here
 * with them: our `billing_status` and Dodo's `status` after a checkout, or an
 * open-link destination (`open` and its fields) after the billing portal.
 * Today the API (apps/api/src/platform/urls.ts and domain/links/open-link.ts)
 * sends landing returns to /account and app returns to the app, so only a
 * portal opened from an unknown origin lands here, and `billing_status` only
 * once the billingReturnUrl ponytail points it here. The apps validate every
 * value; the chooser only copies them, and the destination origin is always
 * one of our two apps, so this is no open redirect.
 */
const CONTINUATION_KEYS = [
  "billing_status",
  "status",
  "open",
  "section",
  "agentId",
  "sessionKey",
  "workflowId",
  "runId",
  "itemId",
  "path",
  "appId",
] as const;
const CONTINUATION_VALUE_MAX = 1024;

/** The params to carry on, or null when this visit is not a return. */
export function continuationParams(search: string): URLSearchParams | null {
  const from = new URLSearchParams(search);
  if (!from.has("billing_status") && !from.has("open")) return null;
  const out = new URLSearchParams();
  for (const key of CONTINUATION_KEYS) {
    const value = from.get(key)?.trim();
    if (value && value.length <= CONTINUATION_VALUE_MAX) out.set(key, value);
  }
  return out.size ? out : null;
}

/** What the visitor just came back from, for the chooser's one-line note. */
export type ReturnKind = BillingReturnKind | "billing" | "link";

export function returnKind(params: URLSearchParams): ReturnKind {
  const billing = billingReturnKind(params);
  if (billing) return billing;
  return params.get("open") === "settings" ? "billing" : "link";
}

/** Phones get the dashboard: the desktop shell is built for a big screen. */
const PHONE_OR_TABLET = /Mobi|Android|iPhone|iPad|iPod/i;

/**
 * Where a return goes without asking: the app this browser used last, but
 * never the desktop on a phone (the same rule as the API's `chooseShell`).
 * Null means nothing is remembered, so the visitor picks.
 */
export function returnShell(
  last: Shell | null,
  userAgent: string,
): Shell | null {
  if (last === "desktop" && PHONE_OR_TABLET.test(userAgent)) return "dashboard";
  return last;
}

/**
 * Where each shell opens, carrying `?prompt=` through when the link had one
 * and the continuation params when the visit is a return.
 */
export function shellUrl(
  shell: Shell,
  prompt?: string | null,
  continuation?: URLSearchParams | null,
): string {
  const origin = shell === "desktop" ? getOsOrigin() : getAppOrigin();
  const withPrompt = getAppUrl(prompt ?? undefined, origin);
  const query = continuation?.toString();
  if (!query) return withPrompt;
  return withPrompt === origin
    ? `${origin}/?${query}`
    : `${withPrompt}&${query}`;
}
