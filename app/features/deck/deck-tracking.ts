import { DECK_RECIPIENT_PATTERN } from "../../../shared/deck-schema";

/**
 * `?r=<id>` names who a deck link was sent to, so each investor gets their own
 * link and PostHog can say who opened it. It is the site's campaign `ref` too
 * (campaign-attribution.ts), so a signup that follows is credited to it.
 */
export function recipientFromSearch(search: string): string | null {
  const raw = new URLSearchParams(search).get("r")?.trim();
  return raw && DECK_RECIPIENT_PATTERN.test(raw) ? raw : null;
}

export type SlideTime = { slide: number; seconds: number };

/**
 * Attention per slide, counted only while the page is visible. Every stretch
 * on a slide closes into one `SlideTime`, so summing `seconds` by slide in
 * PostHog gives the total time spent on it without double counting.
 * Slides are 1-based, like the numbers people say out loud.
 */
export function createSlideClock(now: () => number) {
  let current: number | null = null;
  let since = 0;
  let paused = false;
  let total = 0;
  const seen = new Set<number>();
  const bySlide = new Map<number, number>();

  function close(): SlideTime | null {
    if (current === null || paused) return null;
    const seconds = Math.max(0, now() - since) / 1000;
    total += seconds;
    bySlide.set(current, (bySlide.get(current) ?? 0) + seconds);
    return { slide: current, seconds: Math.round(seconds * 10) / 10 };
  }

  return {
    /** Moves to `slide`; returns the stretch that just ended and whether it's new. */
    enter(slide: number): { left: SlideTime | null; firstView: boolean } {
      if (slide === current && !paused) return { left: null, firstView: false };
      const left = close();
      current = slide;
      since = now();
      paused = false;
      const firstView = !seen.has(slide);
      seen.add(slide);
      return { left, firstView };
    },
    /** The tab was hidden or is closing. */
    pause(): SlideTime | null {
      const left = close();
      paused = true;
      return left;
    },
    /** The tab is back; the slide it's on, if any. */
    resume(): number | null {
      if (!paused || current === null) return null;
      paused = false;
      since = now();
      return current;
    },
    get seenCount(): number {
      return seen.size;
    },
    /** Visible seconds across every slide so far, the open stretch included. */
    totalSeconds(): number {
      const open = current !== null && !paused ? (now() - since) / 1000 : 0;
      return Math.round((total + open) * 10) / 10;
    },
    /** Visible seconds on each of `count` slides, in order, the open stretch included. */
    secondsBySlide(count: number): number[] {
      return Array.from({ length: count }, (_, index) => {
        const slide = index + 1;
        const open = slide === current && !paused ? (now() - since) / 1000 : 0;
        return Math.round(((bySlide.get(slide) ?? 0) + open) * 10) / 10;
      });
    },
    /** The slide being read, if any. */
    get current(): number | null {
      return current;
    },
  };
}

/**
 * Which slide is being read. A reading line runs from the top of the screen
 * to the bottom as the page scrolls from start to end, so the first slide
 * counts at the top and the last at the bottom even when a phone shows three
 * at once; the slide on the line (or nearest it) is the one. `pinned` is
 * where a rail tap or key press is taking the reader, which wins while it's
 * on screen.
 */
export function readingIndex(
  rects: ReadonlyArray<{ top: number; bottom: number }>,
  progress: number,
  viewportHeight: number,
  pinned: number | null = null,
): number {
  const target = pinned === null ? undefined : rects[pinned];
  if (target && target.top < viewportHeight && target.bottom > 0) return pinned!;
  const line = Math.min(1, Math.max(0, progress)) * viewportHeight;
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  rects.forEach((rect, index) => {
    const distance = line < rect.top ? rect.top - line : line > rect.bottom ? line - rect.bottom : 0;
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  });
  return best;
}

/** Progress marks a watched video reports, once each. */
export const VIDEO_MARKS = [25, 50, 75, 100] as const;

/** Marks newly passed at `currentTime`, given the ones already reported. */
export function passedVideoMarks(
  currentTime: number,
  duration: number,
  reported: ReadonlySet<number>,
): number[] {
  if (!(duration > 0)) return [];
  // The last second counts as the end; YouTube rarely reports the exact duration.
  const percent = currentTime >= duration - 1 ? 100 : (currentTime / duration) * 100;
  return VIDEO_MARKS.filter((mark) => percent >= mark && !reported.has(mark));
}
