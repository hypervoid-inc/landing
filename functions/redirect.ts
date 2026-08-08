import type { PagesFunction } from "./types";

const MAX_PARAM_LENGTH = 2048;

// The only thing we ever encode into `p` is the click-tracking URL listmonk generates for
// a campaign link, so that is the only host this endpoint will forward to. Without this,
// `/redirect` is an open redirect: anyone could hand out a construct.computer link that
// lands on their own page, borrowing our domain's reputation.
//
// Campaign links are built in the mail-campaign repo (see its redirect/README.md). If a
// campaign ever needs to point somewhere else, add the host here first.
const ALLOWED_HOSTS = new Set(["listmonk.construct.computer"]);

// Hosts allowed to receive the subscriber id. Everything else gets the destination only.
const FIRST_PARTY_HOSTS = new Set(["construct.computer", "www.construct.computer"]);

// A click should never hang on listmonk. Past this we hand the browser to listmonk instead.
const TRACKING_TIMEOUT_MS = 2500;

function reject(status: number): Response {
  return new Response(null, { status, headers: { "Cache-Control": "no-store" } });
}

function asHttpUrl(value: string): string | null {
  try {
    const target = new URL(value);
    if (target.protocol !== "https:" && target.protocol !== "http:") return null;
    if (!ALLOWED_HOSTS.has(target.hostname)) return null;
    return target.toString();
  } catch {
    return null;
  }
}

function asBase64Url(value: string): string | null {
  const normalized = value.replace(/[-_]/g, (c) => (c === "-" ? "+" : "/")).replace(/\s/g, "");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  if (!/^[A-Za-z0-9+/=]+$/.test(padded)) return null;
  try {
    return asHttpUrl(atob(padded));
  } catch {
    return null;
  }
}

function redirectTo(location: string): Response {
  return new Response(null, {
    status: 302,
    headers: {
      Location: location,
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/**
 * Follow listmonk's click-tracking URL far enough to record the click and learn where it
 * points, without handing the browser over.
 *
 * Owning this hop is what lets us put the subscriber and campaign ids on the landing page
 * URL. listmonk redirects to a URL it stored at send time, which is identical for every
 * recipient and cannot carry per-subscriber values, so if the browser followed it directly
 * that identity would be lost.
 *
 * Product email campaigns must NOT wrap destinations in `/redirect`: Listmonk then
 * attributes the click to the redirect URL instead of the real destination, which hides
 * which placement (`utm_content`) was clicked. Prefer plain `{{ TrackLink \`https://…\` }}`.
 *
 * Returns null if listmonk is slow, down, or answers with anything but a redirect. The
 * caller then falls back to handing the browser to listmonk, which is what it did before,
 * so a listmonk outage costs a click record but never the click itself.
 */
async function resolveTrackedLink(trackingUrl: string): Promise<string | null> {
  try {
    const response = await fetch(trackingUrl, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(TRACKING_TIMEOUT_MS),
    });
    if (response.status < 300 || response.status > 399) return null;
    const location = response.headers.get("Location");
    if (!location) return null;
    const resolved = new URL(location);
    // listmonk is the only writer of these URLs, but never redirect to a scheme a browser
    // could execute.
    if (resolved.protocol !== "https:" && resolved.protocol !== "http:") return null;
    return resolved.toString();
  } catch {
    return null;
  }
}

export const onRequest: PagesFunction<unknown> = async ({ request }) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return reject(405);
  }

  const params = new URL(request.url).searchParams;
  const raw = params.get("p");
  if (!raw || raw.length > MAX_PARAM_LENGTH) return reject(400);

  const target = asHttpUrl(raw) ?? asBase64Url(raw);
  if (!target) return reject(400);

  // Mail scanners issue HEAD. Skip the tracking hop so a prefetch does not book a click.
  if (request.method === "HEAD") return redirectTo(target);

  const destination = await resolveTrackedLink(target);
  if (!destination) return redirectTo(target);

  const final = new URL(destination);

  // Only our own pages get the subscriber id. Forwarding it to Discord, Product Hunt or
  // LinkedIn would hand a third party a stable per-person identifier for no benefit.
  if (FIRST_PARTY_HOSTS.has(final.hostname)) {
    const subscriber = params.get("s");
    const campaign = params.get("c");
    if (subscriber) final.searchParams.set("sid", subscriber);
    if (campaign) final.searchParams.set("cid", campaign);
  }

  return redirectTo(final.toString());
};