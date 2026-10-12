/**
 * "How did you hear about us?" on the sign-in form.
 *
 * Accounts are created by the API, so for now the answer goes to PostHog as
 * person properties and the slug rides along in the attribution cookie (`h`)
 * for the API to pick up later. Deliberately separate from REFERRAL_SOURCES in
 * shared/beta-signup-schema.ts, which backs a D1 column and must not move.
 */

export const HEARD_ABOUT_OPTIONS = [
  ["x", "X (Twitter)"],
  ["google-search", "Google search"],
  ["ai-assistant", "ChatGPT or another AI assistant"],
  ["friend", "A friend or colleague"],
  ["product-hunt", "Product Hunt"],
  ["hacker-news", "Hacker News"],
  ["reddit", "Reddit"],
  ["linkedin", "LinkedIn"],
  ["community", "A Slack or Discord community"],
  ["youtube", "YouTube"],
  ["other", "Other"],
] as const;

export type HeardAbout = (typeof HEARD_ABOUT_OPTIONS)[number][0];

const HEARD_ABOUT_SLUGS = new Set<string>(
  HEARD_ABOUT_OPTIONS.map(([slug]) => slug),
);

export function isHeardAbout(value: string): value is HeardAbout {
  return HEARD_ABOUT_SLUGS.has(value);
}

export const HEARD_ABOUT_DETAIL_MAX = 120;

const EMAIL_LIKE = /[^\s@]+@[^\s@]+\.[^\s@]+/;
/** A host or URL followed by a non-empty query string. */
const URL_WITH_QUERY = /(?:https?:\/\/)?[a-z0-9-]+(?:\.[a-z0-9-]+)+\S*\?\S/i;

/**
 * Free text from the "Other" box. Trimmed and capped, and dropped entirely when
 * it looks like it holds an email address or a URL with a query string, since
 * those are where personal data and tokens hide.
 */
export function cleanHeardAboutDetail(
  value: string | null | undefined,
): string | undefined {
  if (!value) return undefined;
  const text = value.replace(/\s+/g, " ").trim();
  if (!text) return undefined;
  if (EMAIL_LIKE.test(text) || URL_WITH_QUERY.test(text)) return undefined;
  return text.slice(0, HEARD_ABOUT_DETAIL_MAX).trim();
}

/**
 * Remembered per browser so the question is asked once. Set when the reader
 * answers, and also when they sign in without answering: the form can't tell
 * a new account from a returning one, and a browser that has signed in before
 * is almost always a returning one.
 */
const STORAGE_KEY = "construct_heard_about_v1";

export function shouldAskHeardAbout(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === null;
  } catch {
    return true;
  }
}

export function markHeardAboutSettled(): void {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // Storage blocked: the question may show again, which is harmless.
  }
}
