import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";

import { readSiteChromeHeightPx } from "../../components/layout/site-chrome";
import type { PostHeading } from "../../content/blog";
import { scrollPageTo } from "../../lib/page-scroll";

/** Under this many sections a table of contents is more chrome than help. */
const MIN_HEADINGS = 3;

/** How far down the screen a heading must reach to count as the one being read. */
const READING_LINE = 0.3;

/**
 * A thin brand-coloured bar under the site header that fills as the article
 * is read. Measured against the article, not the page, so the FAQ's end is
 * the bar's end and the footer does not count.
 */
export function ReadingProgress() {
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = bar.current;
    const article = document.querySelector("main article");
    if (!node || !article) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const chrome = readSiteChromeHeightPx(56);
      const box = article.getBoundingClientRect();
      const travel = box.height - window.innerHeight + chrome;
      const read = (chrome - box.top) / Math.max(travel, 1);
      node.style.transform = `scaleX(${Math.min(1, Math.max(0, read))})`;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return (
    <div
      ref={bar}
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-[var(--site-chrome-height)] z-30 h-[3px] origin-left scale-x-0 bg-gradient-to-r from-[#01b4c8] to-[#4fb2f0]"
    />
  );
}

/** The heading the reader is in: the last one whose top has passed the reading line. */
function useActiveHeading(ids: readonly string[]) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (!ids.length) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const line =
        readSiteChromeHeightPx(56) + window.innerHeight * READING_LINE;
      let current: string | null = null;
      for (const id of ids) {
        const top = document.getElementById(id)?.getBoundingClientRect().top;
        if (top !== undefined && top <= line) current = id;
      }
      setActive(current);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [ids]);

  return active;
}

/**
 * Jumps through the page's own scroller (Lenis when it runs), so the jump is
 * as smooth as every other scroll on the site, and keeps the hash shareable.
 */
function jumpTo(event: MouseEvent<HTMLAnchorElement>, id: string) {
  const target = document.getElementById(id);
  if (!target) return;
  event.preventDefault();
  const top =
    target.getBoundingClientRect().top +
    window.scrollY -
    readSiteChromeHeightPx(56) -
    20;
  scrollPageTo(top);
  window.history.replaceState(window.history.state, "", `#${id}`);
}

/**
 * "On this page" in the desktop rail: the post's sections, the one being
 * read marked, each a smooth jump. Rendered on the server from the headings
 * `scripts/remark-headings.mjs` exports, so it is there before hydration.
 */
export function RailContents({
  headings,
  minutes,
}: {
  headings: readonly PostHeading[];
  minutes: number;
}) {
  // A post's headings are a module constant, so this is computed once per post.
  const ids = useMemo(() => headings.map((heading) => heading.id), [headings]);
  const active = useActiveHeading(ids);
  if (headings.length < MIN_HEADINGS) return null;
  return (
    <nav aria-labelledby="contents-heading">
      <h2
        id="contents-heading"
        className="flex items-baseline justify-between text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a9aa2]"
      >
        On this page
        <span className="font-medium normal-case tracking-normal">
          {minutes} min read
        </span>
      </h2>
      <ol className="mt-3 list-none space-y-0.5 border-l border-[#e5eef1] p-0">
        {headings.map((heading) => {
          const current = heading.id === active;
          return (
            <li key={heading.id}>
              <a
                href={`#${heading.id}`}
                onClick={(event) => jumpTo(event, heading.id)}
                aria-current={current ? "location" : undefined}
                className={`-ml-px block border-l-2 py-1.5 pl-3 text-[13px] leading-5 transition-colors ${
                  current
                    ? "border-[#01b4c8] font-medium text-[#017b89]"
                    : "border-transparent text-[#627c86] hover:border-[#b6e6ea] hover:text-[#4e4646]"
                }`}
              >
                {heading.text}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * The same contents below the desktop breakpoint, folded under the cover so
 * it costs one line until opened.
 */
export function InlineContents({
  headings,
  minutes,
}: {
  headings: readonly PostHeading[];
  minutes: number;
}) {
  if (headings.length < MIN_HEADINGS) return null;
  return (
    <details className="group mt-5 rounded-2xl border border-[#dcecef] bg-[#f7fbfc] xl:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3.5 text-[14px] font-medium text-[#4e4646] [&::-webkit-details-marker]:hidden">
        <span>
          On this page
          <span className="ml-2 font-normal text-[#8a9aa2]">
            {headings.length} sections · {minutes} min read
          </span>
        </span>
        <span
          aria-hidden
          className="text-[#01b4c8] transition-transform group-open:rotate-180"
        >
          &#8964;
        </span>
      </summary>
      <ol className="list-decimal space-y-1.5 px-5 pb-4 pl-10 text-[14px] leading-6 marker:text-[#8a9aa2]">
        {headings.map((heading) => (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              onClick={(event) => jumpTo(event, heading.id)}
              className="text-[#017b89] hover:underline"
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ol>
    </details>
  );
}
