import { useCallback, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";

/**
 * Light or dark for `/app/`. The page follows the system through CSS
 * (`color-scheme: light dark` and `light-dark()`), so the prerendered HTML is
 * already right before any script runs; this only adds the visitor's own
 * choice, remembered in this browser, as `data-theme` on the page. Zen Mode
 * keeps its own setting on app.construct.computer, which this page can't read.
 */
export type Theme = "light" | "dark";

const STORAGE_KEY = "construct.appChooser.theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";
/** On <html> only while a switch animates; scopes the view-transition CSS. */
const SWITCHING_CLASS = "ac-theme-switching";

const listeners = new Set<() => void>();
/** This visit's choice, for when storage is blocked (private windows). */
let chosenThisVisit: Theme | null = null;

function readChosen(): Theme | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : chosenThisVisit;
  } catch {
    return chosenThisVisit;
  }
}

function subscribeChosen(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readSystem(): Theme {
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

function subscribeSystem(listener: () => void) {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

/** Store the choice and render it now, so a view transition snapshots it. */
function choose(next: Theme) {
  chosenThisVisit = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Kept for this visit only.
  }
  flushSync(() => {
    for (const listener of listeners) listener();
  });
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => { finished: Promise<void> };
};

/**
 * A plain crossfade of the whole page from one theme to the other. A view
 * transition rather than CSS transitions, because the gradients and the
 * day and night wallpapers can't transition on their own, and fading
 * everything as one picture keeps both halves in step. The timing lives in
 * app-chooser.css. Without view transitions, or for readers who asked for
 * less motion, it changes instantly.
 */
function switchTheme(next: Theme) {
  const doc = document as ViewTransitionDocument;
  if (
    !doc.startViewTransition ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    choose(next);
    return;
  }
  const root = document.documentElement;
  root.classList.add(SWITCHING_CLASS);
  const transition = doc.startViewTransition(() => choose(next));
  void transition.finished.finally(() =>
    root.classList.remove(SWITCHING_CLASS),
  );
}

export function useChooserTheme(): {
  /** The theme on screen. */
  theme: Theme;
  /** Only the visitor's explicit choice, for `data-theme`. */
  chosen: Theme | null;
  /** Flip the theme, crossfading when it can animate. */
  toggle: () => void;
} {
  // Null and light on the server and while hydrating, which see the one
  // prerendered file; CSS has already drawn the system theme by then.
  const chosen = useSyncExternalStore(subscribeChosen, readChosen, () => null);
  const system = useSyncExternalStore(
    subscribeSystem,
    readSystem,
    (): Theme => "light",
  );
  const theme = chosen ?? system;

  const toggle = useCallback(
    () => switchTheme(theme === "dark" ? "light" : "dark"),
    [theme],
  );

  return { theme, chosen, toggle };
}
