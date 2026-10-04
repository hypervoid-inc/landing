/**
 * "Did you mean" for the 404 page. The page is one prerendered file served at
 * every unmatched URL, so the guess is made in the browser from the pathname
 * and the canonical route list, never on a server.
 */

export type SuggestableRoute = { readonly path: string };

export type RouteSuggestion<T extends SuggestableRoute> = {
  readonly route: T;
  /** `match` is a near miss on one page; `section` is only the index above it. */
  readonly kind: "match" | "section";
};

/** Below this a guess is more likely to mislead than to help. */
const MATCH_THRESHOLD = 0.72;

/** Words every path in a section shares, so they say nothing about the page. */
const SECTION_WORDS = new Set(["blog", "tag", "use", "cases", "authors"]);

export function normalizeRequestedPath(pathname: string): string {
  let path = pathname;
  try {
    path = decodeURIComponent(pathname);
  } catch {
    // A malformed escape is still a path worth guessing at.
  }
  path = path
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/\/{2,}/g, "/")
    .replace(/\/index$/, "/")
    .replace(/\.(html?|php|aspx?)$/, "");
  if (!path.startsWith("/")) path = `/${path}`;
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

function editDistance(left: string, right: string): number {
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= right.length; column += 1) {
      const cost = left[row - 1] === right[column - 1] ? 0 : 1;
      current[column] = Math.min(
        previous[column]! + 1,
        current[column - 1]! + 1,
        previous[column - 1]! + cost,
      );
    }
    previous = current;
  }
  return previous[right.length]!;
}

function editSimilarity(left: string, right: string): number {
  const longest = Math.max(left.length, right.length);
  return longest ? 1 - editDistance(left, right) / longest : 1;
}

function lastSegment(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}

function words(path: string): string[] {
  return path
    .split(/[/-]/)
    .filter((word) => word.length >= 3 && !SECTION_WORDS.has(word));
}

function commonPrefix(left: string, right: string): number {
  let length = 0;
  while (
    length < left.length &&
    length < right.length &&
    left[length] === right[length]
  ) {
    length += 1;
  }
  return length;
}

/** 0 to 1. Takes the kindest of four readings of "these look alike". */
export function pathSimilarity(requested: string, candidate: string): number {
  if (requested === candidate) return 1;

  const requestedSlug = lastSegment(requested);
  const candidateSlug = lastSegment(candidate);

  // Judged on the slug as well as the whole path: two pages under /blog/tag/
  // share most of their characters before either slug has started.
  const spelling = Math.min(
    editSimilarity(requested, candidate),
    editSimilarity(requestedSlug, candidateSlug),
  );

  // The right slug under the wrong parent: /zen-mode for /blog/zen-mode.
  const sameSlug =
    requestedSlug.length >= 4 && requestedSlug === candidateSlug ? 0.95 : 0;

  // A truncated or re-suffixed slug: /price for /pricing.
  const prefix = commonPrefix(requestedSlug, candidateSlug);
  const shorter = Math.min(requestedSlug.length, candidateSlug.length);
  const truncated = prefix >= 4 && prefix / shorter >= 0.8 ? 0.75 : 0;

  // Most of the same words: /blog/zen for /blog/zen-mode.
  const asked = words(requested);
  const offered = new Set(words(candidate));
  const shared = asked.filter((word) => offered.has(word)).length;
  const wording =
    asked.length && offered.size
      ? (shared / asked.length + shared / offered.size) / 2
      : 0;

  return Math.max(spelling, sameSlug, truncated, wording);
}

export function suggestRoute<T extends SuggestableRoute>(
  pathname: string,
  routes: readonly T[],
): RouteSuggestion<T> | null {
  const requested = normalizeRequestedPath(pathname);
  if (requested === "/") return null;

  let best: T | undefined;
  let bestScore = 0;
  for (const route of routes) {
    if (route.path === "/") continue;
    const score = pathSimilarity(requested, route.path);
    if (score > bestScore) {
      best = route;
      bestScore = score;
    }
  }
  if (best && bestScore >= MATCH_THRESHOLD) {
    return { route: best, kind: "match" };
  }

  // Nothing close, but the first segment is a section we do have.
  const section = `/${requested.split("/")[1]}`;
  const index = routes.find((route) => route.path === section);
  return index && section !== requested
    ? { route: index, kind: "section" }
    : null;
}
