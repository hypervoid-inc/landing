import { useEffect, type RefObject } from "react";

import { readSiteChromeHeightPx } from "../layout/site-chrome";

/** Space kept between the rail and the header above it or the screen edge below. */
const GAP_PX = 12;

type Direction = "down" | "up";

/**
 * Lets a sidebar taller than the screen scroll with the page instead of in a
 * box of its own.
 *
 * A rail that fits simply sticks under the header. One that does not moves
 * with the article until its far edge comes into view, then holds there:
 * scrolling down it holds once its bottom is on screen, scrolling up once its
 * top is, and at the very top and bottom of the page it sits where it belongs.
 *
 * The browser does all of the moving with `position: sticky`, so the rail
 * never trails the scroll by a frame. Script only acts when the reader
 * changes direction: it grows `spacer`, an empty block above the rail, until
 * the rail's place in the flow is exactly where it is drawn, then switches
 * which edge it sticks by. Neither step moves it, so the switch is invisible.
 *
 * Scrolling down the rail sticks by its top at `innerHeight - height - gap`,
 * a negative offset, so it stays put once its bottom is on screen. Scrolling
 * up it sticks by its bottom at an offset that holds its top at the header.
 * Sticky never takes an element outside its parent, which is what keeps it
 * level with the article at both ends of the page.
 */
export function useScrollingRail(
  spacer: RefObject<HTMLElement | null>,
  rail: RefObject<HTMLElement | null>,
  /** Changes when the page does, so a new post starts from the top. */
  page: string,
) {
  useEffect(() => {
    const space = spacer.current;
    const node = rail.current;
    const column = node?.parentElement;
    if (!space || !node || !column) return;

    let direction: Direction = "down";
    let lastY = window.scrollY;

    const measure = () => {
      const headerLine = readSiteChromeHeightPx(56) + GAP_PX;
      const height = node.offsetHeight;
      const fits = height <= window.innerHeight - headerLine - GAP_PX;
      return { headerLine, height, fits };
    };

    const stick = () => {
      const { headerLine, height, fits } = measure();
      if (fits) {
        space.style.setProperty("height", "0px");
        node.style.setProperty("top", `${headerLine}px`);
        node.style.setProperty("bottom", "auto");
      } else if (direction === "down") {
        node.style.setProperty(
          "top",
          `${window.innerHeight - height - GAP_PX}px`,
        );
        node.style.setProperty("bottom", "auto");
      } else {
        node.style.setProperty("top", "auto");
        node.style.setProperty(
          "bottom",
          `${window.innerHeight - height - headerLine}px`,
        );
      }
    };

    const onScroll = () => {
      const y = window.scrollY;
      const next: Direction = y > lastY ? "down" : y < lastY ? "up" : direction;
      lastY = y;
      if (next === direction) return;
      if (!measure().fits) {
        // Make the rail's place in the flow the place it is drawn now.
        const offset =
          node.getBoundingClientRect().top - column.getBoundingClientRect().top;
        space.style.setProperty(
          "height",
          `${Math.max(0, Math.floor(offset))}px`,
        );
      }
      direction = next;
      stick();
    };

    space.style.setProperty("height", "0px");
    stick();
    const resized = new ResizeObserver(stick);
    resized.observe(node);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", stick);
    return () => {
      resized.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", stick);
    };
  }, [spacer, rail, page]);
}
