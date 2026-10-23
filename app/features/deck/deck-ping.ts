import {
  DECK_HOSTNAME_PATTERN,
  DECK_LANGUAGE_PATTERN,
  DECK_PING_LEAVE_EVERY_MS,
  DECK_PING_UPDATE_MS,
  DECK_SESSION_PATTERN,
  DECK_TAG_PATTERN,
  DECK_TIMEZONE_PATTERN,
  type DeckPingContext,
  type DeckPingEvent,
  type DeckPingSummary,
} from "../../../shared/deck-schema";
import { analyticsVisitor, isAnalyticsHost } from "../analytics/analytics.client";
import { DECK_VERSION } from "./slides";

/**
 * Tells the team's Discord when someone opens the deck, and keeps that
 * message current as they read (functions/api/deck/ping.ts): one ping on
 * opening, a refresh at most every 15 seconds while they read, and one as
 * they leave. Moments (PDF sent, finished, closed, back again, a video, a
 * click) go at once and post a message of their own, since an edit notifies
 * nobody. Only from the production site, never from an automated browser.
 */

const ENDPOINT = "/api/deck/ping";
const VISITS_KEY = "construct.deck.visits";

type Detail = "demo" | "launch" | "site" | "try";

export type DeckPing = {
  update(summary: DeckPingSummary): void;
  event(event: DeckPingEvent, summary: DeckPingSummary, detail?: Detail): void;
};

export function startDeckPing(recipient: string | null): DeckPing {
  const enabled = isAnalyticsHost(window.location.hostname) && !navigator.webdriver;
  if (!enabled) return { update() {}, event() {} };

  const visitId = crypto.randomUUID();
  const context = visitContext(recipient);
  let latest: DeckPingSummary | null = null;
  let lastSent = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastLeft = 0;
  let lastReturned = 0;
  let away = false;

  const send = (summary: DeckPingSummary | null, leaving: boolean, event?: DeckPingEvent, detail?: Detail) => {
    const body = JSON.stringify({
      visitId,
      context,
      ...(summary ? { summary } : {}),
      ...(event ? { event } : {}),
      ...(detail ? { detail } : {}),
    });
    if (leaving && navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: "application/json" }))) {
      return Promise.resolve();
    }
    return fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    }).then(
      () => undefined,
      () => undefined,
    );
  };

  // The replay link is worth a short wait: it's what makes the alert useful.
  const opened = analyticsVisitor().then(({ session, email }) => {
    if (session && DECK_SESSION_PATTERN.test(session)) context.session = session;
    if (email && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) context.email = email;
    lastSent = Date.now();
    return send(null, false);
  });

  const update = (summary: DeckPingSummary) => {
    latest = summary;
    clearTimeout(timer);
    if (summary.final) {
      lastSent = Date.now();
      void send(summary, true);
      return;
    }
    const wait = Math.max(0, lastSent + DECK_PING_UPDATE_MS - Date.now());
    timer = setTimeout(() => {
      lastSent = Date.now();
      void opened.then(() => latest && send(latest, false));
    }, wait);
  };

  return {
    update,
    event(event, summary, detail) {
      const now = Date.now();
      // Tab switching would otherwise post a close and a return every time.
      if (event === "left") {
        if (now - lastLeft < DECK_PING_LEAVE_EVERY_MS) return update(summary);
        lastLeft = now;
        away = true;
      }
      if (event === "returned") {
        if (!away || now - lastReturned < DECK_PING_LEAVE_EVERY_MS) return update(summary);
        lastReturned = now;
        away = false;
      }
      latest = summary;
      clearTimeout(timer);
      lastSent = now;
      // A closing tab can't wait for anything; the rest wait for the card to exist.
      if (event === "left") void send(summary, true, event, detail);
      else void opened.then(() => send(summary, false, event, detail));
    },
  };
}

function visitContext(recipient: string | null): DeckPingContext {
  const now = new Date().toISOString();
  const visits = countVisit(now);
  const params = new URLSearchParams(window.location.search);
  const utm: NonNullable<DeckPingContext["utm"]> = {};
  for (const key of ["source", "medium", "campaign", "content", "term"] as const) {
    const value = params.get(`utm_${key}`)?.trim();
    if (value && DECK_TAG_PATTERN.test(value)) utm[key] = value;
  }
  const referrer = referrerHost();
  const language = navigator.language;
  let timezone: string | undefined;
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    timezone = undefined;
  }
  return {
    ...(recipient ? { r: recipient } : {}),
    ...(referrer ? { referrer } : {}),
    ...(Object.keys(utm).length ? { utm } : {}),
    visit: visits.count,
    ...(visits.last ? { lastVisitAt: visits.last } : {}),
    openedAt: now,
    ...(window.screen?.width && window.screen?.height
      ? { screen: { width: Math.round(window.screen.width), height: Math.round(window.screen.height) } }
      : {}),
    ...(language && DECK_LANGUAGE_PATTERN.test(language) ? { language } : {}),
    ...(timezone && timezone.length <= 64 && DECK_TIMEZONE_PATTERN.test(timezone) ? { timezone } : {}),
    version: DECK_VERSION,
  };
}

/** The site that sent them, unless it's this one. */
function referrerHost(): string | undefined {
  try {
    const host = new URL(document.referrer).hostname.toLowerCase().replace(/^www\./, "");
    if (!host || host === window.location.hostname.replace(/^www\./, "")) return undefined;
    return DECK_HOSTNAME_PATTERN.test(host) ? host : undefined;
  } catch {
    return undefined;
  }
}

/** This browser's visits to the deck: this one's number, and when the last was. */
function countVisit(now: string): { count: number; last?: string } {
  try {
    const stored = JSON.parse(localStorage.getItem(VISITS_KEY) ?? "null") as { count?: number; last?: string } | null;
    const count = Math.min(100_000, (Number(stored?.count) || 0) + 1);
    localStorage.setItem(VISITS_KEY, JSON.stringify({ count, last: now }));
    const last = stored?.last && !Number.isNaN(Date.parse(stored.last)) ? new Date(stored.last).toISOString() : undefined;
    return { count, ...(last ? { last } : {}) };
  } catch {
    return { count: 1 };
  }
}
