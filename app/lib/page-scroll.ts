import type Lenis from "lenis";

let pageScroller: Lenis | null = null;

export function getPageScroller() {
  return pageScroller;
}

export function setPageScroller(instance: Lenis | null) {
  pageScroller = instance;
}

/** Smooth jump to a page Y. Uses Lenis when it is running, native otherwise. */
export function scrollPageTo(top: number, options?: { immediate?: boolean }) {
  const immediate = options?.immediate ?? false;
  const scroller = pageScroller;
  if (scroller) {
    scroller.scrollTo(top, { offset: 0, immediate });
    return;
  }
  window.scrollTo({ top, behavior: immediate ? "instant" : "smooth" });
}

declare global {
  interface Window {
    __scrollPageTo?: typeof scrollPageTo;
  }
}

if (typeof window !== "undefined") {
  window.__scrollPageTo = scrollPageTo;
}
