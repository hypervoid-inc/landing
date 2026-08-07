import { getRoute, type RouteKind } from "../../lib/route-manifest";

export const CLIPPY_DELAY_MS = 15_000;
/** Never pop the instant a page paints, even with time banked from a prior page. */
export const CLIPPY_MIN_DWELL_MS = 5_000;

export type ClippyPageKind = "blog-post" | "blog-browse" | "home" | "page";

/**
 * Legal pages, the error page, and support. A popup sell on a policy page reads
 * as a dark pattern, and pitching someone who came here with a problem is worse.
 */
const SUPPRESSED = new Set([
  "/privacy",
  "/terms",
  "/editorial-policy",
  "/support",
  "/404",
]);

export function normalizePath(pathname: string): string {
  if (pathname === "/") return "/";
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

/**
 * Classification comes from the canonical route manifest rather than hand-rolled
 * path matching, so unknown paths fall through to null for free and a new
 * RouteKind surfaces as a type error instead of silently becoming "page".
 *
 * Returns null when the widget should stay silent.
 */
export function getClippyPageKind(pathname: string): ClippyPageKind | null {
  const path = normalizePath(pathname);
  if (SUPPRESSED.has(path)) return null;

  const kind: RouteKind | undefined = getRoute(path)?.kind;
  if (!kind) return null;
  if (kind === "home") return "home";
  if (kind === "blog-post" || kind === "guide" || kind === "comparison") {
    return "blog-post";
  }
  if (
    kind === "blog-index" ||
    kind === "tag" ||
    kind === "author" ||
    kind === "author-index"
  ) {
    return "blog-browse";
  }
  return "page";
}

export type ClippyBeat = {
  /** Speech bubble copy. Clamped to 2 lines in a ~248px bubble, so cap at 70 chars. */
  readonly line: string;
  /** Reply chip label. Absent on the final beat, where only the CTA remains. */
  readonly advance?: string;
};

export const CLIPPY_CTA_LABEL = "Try Construct";
export const CLIPPY_MINIMIZE_LABEL = "Minimize Construct";
export const CLIPPY_REOPEN_LABEL = "Open Construct message";
export const CLIPPY_HIDE_LABEL = "Hide Construct";

/**
 * The original Clippy opener was "It looks like you're writing a letter". Keeping
 * that construction across every page kind is what makes this read as a bit
 * rather than an ad, so change the endings but leave the opener alone.
 */
const OPENERS: Record<ClippyPageKind, string> = {
  "blog-post": "It looks like you're researching AI agents. Want to meet one?",
  "blog-browse":
    "It looks like you're browsing. I could read all of this for you.",
  home: "It looks like you're still deciding. Start Now is quicker.",
  page: "It looks like you're exploring Construct. Want to try it?",
};

const SHARED_BEATS: readonly ClippyBeat[] = [
  {
    line: "I am Construct, your AI coworker with a cloud computer.",
    advance: "Show me",
  },
  { line: "Research, inbox, reports, done while your hours go elsewhere." },
];

export function beatsFor(pageKind: ClippyPageKind): readonly ClippyBeat[] {
  return [
    { line: OPENERS[pageKind], advance: "What are you?" },
    ...SHARED_BEATS,
  ];
}

/** Every reader facing string, for the house style dash check. */
export const clippyCopy: readonly string[] = [
  ...Object.values(OPENERS),
  ...SHARED_BEATS.flatMap((beat) => [beat.line, beat.advance ?? ""]),
  "What are you?",
  CLIPPY_CTA_LABEL,
  CLIPPY_MINIMIZE_LABEL,
  CLIPPY_REOPEN_LABEL,
  CLIPPY_HIDE_LABEL,
];

/** Threaded into StartLink analytics so the auth funnel shows which beat converts. */
export function ctaSource(pageKind: ClippyPageKind, beat: number): string {
  return `clippy_${pageKind.replace("-", "_")}_${beat + 1}`;
}

export type ClippyTimer = {
  readonly elapsedMs: number;
  readonly lastTickMs: number | null;
};

export const initialClippyTimer: ClippyTimer = {
  elapsedMs: 0,
  lastTickMs: null,
};

/**
 * Only foreground time counts. A tab parked in the background is not reading, and
 * the per-tick delta is capped so a sleeping laptop cannot bank an hour at once.
 */
export function tickClippyTimer(
  timer: ClippyTimer,
  now: number,
  visible: boolean,
): ClippyTimer {
  if (!visible) return { elapsedMs: timer.elapsedMs, lastTickMs: null };
  if (timer.lastTickMs === null) {
    return { elapsedMs: timer.elapsedMs, lastTickMs: now };
  }
  const delta = Math.max(0, Math.min(now - timer.lastTickMs, 2_000));
  return { elapsedMs: timer.elapsedMs + delta, lastTickMs: now };
}

export type ClippyVisibleState = "open" | "collapsed" | "hidden";

export type ClippyRecord = {
  readonly state: ClippyVisibleState;
  readonly beat: number;
  readonly position: { readonly x: number; readonly y: number } | null;
};

export const initialClippyRecord: ClippyRecord = {
  state: "open",
  beat: 0,
  position: null,
};

/**
 * Playwright cannot reach a root mounted widget to stub the delay, and a build
 * flag would need bundler surgery, so the override rides on the query string.
 * Returns null when the widget should never arm on this page load.
 *
 * `clippy=off` latches for the lifetime of the JS module so SPA navigations in
 * the site e2e suite stay quiet after the first `goto` injects the param.
 * A hard refresh clears the latch, matching how dismiss itself works.
 */
let clippyForcedOff = false;

export function resolveClippyDelay(
  search: string,
  fallback = CLIPPY_DELAY_MS,
): number | null {
  const value = new URLSearchParams(search).get("clippy");
  if (value === "off" || value === "0") {
    clippyForcedOff = true;
    return null;
  }
  if (clippyForcedOff) return null;
  if (value === "now") return 0;
  return fallback;
}

/** Test-only: clear the off latch between unit cases. */
export function resetClippyDelayOverride() {
  clippyForcedOff = false;
}
