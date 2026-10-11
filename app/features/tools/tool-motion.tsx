import { useEffect, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";

import { readSiteChromeHeightPx } from "../../components/layout/site-chrome";
import { scrollPageTo } from "../../lib/page-scroll";
import "./tools.css";

/**
 * Motion for the free tools. Every animation here answers an action, and all
 * of it gives way to `prefers-reduced-motion`: the CSS in tools.css only
 * moves under `no-preference`, and the JS below skips view transitions and
 * smooth scrolling when the reader asked for less motion.
 */

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Counts how many times `value` has changed since mount. Zero on the first
 * render, including the prerender, so nothing animates on page load; use the
 * count as a React `key` to replay an animation on each change after that.
 * Updating state during render is React's pattern for reacting to a changed
 * value without an extra effect pass.
 */
export function useChangeCount(value: string | number | boolean): number {
  const [seen, setSeen] = useState({ value, count: 0 });
  if (seen.value !== value) {
    const next = { value, count: seen.count + 1 };
    setSeen(next);
    return next.count;
  }
  return seen.count;
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => { finished: Promise<void> };
};

/**
 * Applies a list change (add, remove) inside a view transition, so the item
 * animates and its siblings glide to their new place instead of jumping.
 * Browsers without view transitions, and readers who asked for less motion,
 * get the same change instantly. Resolves once the DOM shows the change.
 */
export function layoutTransition(update: () => void): Promise<void> {
  const doc = document as ViewTransitionDocument;
  if (!doc.startViewTransition || prefersReducedMotion()) {
    flushSync(update);
    return Promise.resolve();
  }
  return doc
    .startViewTransition(() => flushSync(update))
    .finished.catch(() => undefined);
}

/** `style` for an item that takes part in add and remove transitions. */
export function transitionName(name: string) {
  return { viewTransitionName: name } as const;
}

/**
 * Brings a just-added item into view when it landed off screen, clearing the
 * sticky header. Goes through the site's scroller so Lenis stays in charge.
 */
export function revealElement(id: string) {
  const element = document.getElementById(id);
  if (!element) return;
  const box = element.getBoundingClientRect();
  const chrome = readSiteChromeHeightPx();
  // Only when its start is out of sight. A tall card that starts on screen
  // stays put, so the controls that added it stay within reach.
  if (box.top >= chrome && box.top <= window.innerHeight - 96) return;
  scrollPageTo(window.scrollY + box.top - chrome - 16, {
    immediate: prefersReducedMotion(),
  });
}

/**
 * A brand ring and tint that fade out of the parent each time `value`
 * changes. The parent needs `relative isolate` so it sits behind the text.
 */
export function ChangeFlash({ value }: { value: string }) {
  const changes = useChangeCount(value);
  return changes ? (
    <span key={changes} aria-hidden className="tool-change" />
  ) : null;
}

/**
 * The tick icon. With `draw`, it draws itself stroke first when motion is
 * allowed; leave it off for ticks that are on screen at page load.
 */
export function CheckIcon({
  className = "",
  draw = true,
}: {
  className?: string;
  draw?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className={`${draw ? "tool-check" : ""} h-3.5 w-3.5 shrink-0 ${className}`}
    >
      <path
        d="M3.5 8.5l3 3 6-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** True for two seconds after `flash()` is called. */
export function useConfirm(): [boolean, () => void] {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!on) return;
    const timer = window.setTimeout(() => setOn(false), 2000);
    return () => window.clearTimeout(timer);
  }, [on]);
  return [on, () => setOn(true)];
}

/**
 * Two labels stacked in one grid cell, so the button keeps the width of the
 * longer one and nothing beside it shifts when it says "Copied".
 */
export function SwapLabel({
  done,
  idle,
  confirmed,
}: {
  done: boolean;
  idle: ReactNode;
  confirmed: ReactNode;
}) {
  return (
    <span className="grid place-items-center [&>*]:col-start-1 [&>*]:row-start-1">
      <span
        className={`inline-flex items-center gap-1.5 ${done ? "invisible" : ""}`}
      >
        {idle}
      </span>
      {/* `invisible` also drops the hidden label from the accessibility
          tree, so the button's name is always the label you can see. */}
      <span
        className={`inline-flex items-center gap-1.5 ${done ? "tool-pop" : "invisible"}`}
      >
        {done ? confirmed : null}
      </span>
    </span>
  );
}
