import { useEffect, useRef, type RefObject } from "react";
import { Link } from "react-router";

import { trackRelatedClick } from "../../components/content/related-links";
import { resourceEntries, type ResourceEntry } from "~/content/resources";
import { getRoute } from "~/lib/route-manifest";

import "./journal-section.css";

/** Three fills one desktop row exactly, so the grid never leaves an orphan. */
const LATEST_COUNT = 3;

/** Matches the carousel breakpoint in journal-section.css. */
const CAROUSEL_QUERY = "(max-width: 899px)";

/** Apple-style hysteresis: wait for intent before locking an axis. */
const AXIS_LOCK_PX = 10;

/**
 * Nested overflow-x on iOS captures the whole touch and will not chain a
 * vertical pan to the page. Once the drag is clearly vertical, take the
 * gesture and move the document 1:1 with the finger.
 */
function useCarouselPageDrag(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const query = window.matchMedia(CAROUSEL_QUERY);
    let startX = 0;
    let startY = 0;
    let lastY = 0;
    let axis: "x" | "y" | null = null;
    let tracking = false;
    let suppressClick = false;

    const reset = () => {
      tracking = false;
      axis = null;
    };

    const onStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      const touch = event.touches[0]!;
      startX = touch.clientX;
      startY = touch.clientY;
      lastY = touch.clientY;
      axis = null;
      tracking = true;
      suppressClick = false;
    };

    const onMove = (event: TouchEvent) => {
      if (!tracking || event.touches.length !== 1) return;
      const touch = event.touches[0]!;
      if (axis === null) {
        const dx = touch.clientX - startX;
        const dy = touch.clientY - startY;
        if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return;
        axis = Math.abs(dy) > Math.abs(dx) ? "y" : "x";
      }
      if (axis !== "y") {
        lastY = touch.clientY;
        return;
      }
      if (event.cancelable) event.preventDefault();
      const delta = lastY - touch.clientY;
      lastY = touch.clientY;
      if (delta === 0) return;
      window.scrollBy({ top: delta, behavior: "instant" });
    };

    const onEnd = (event: TouchEvent) => {
      if (event.touches.length > 0) return;
      if (axis === "y") suppressClick = true;
      reset();
    };

    const onClickCapture = (event: Event) => {
      if (!suppressClick) return;
      event.preventDefault();
      event.stopPropagation();
      suppressClick = false;
    };

    const attach = () => {
      node.addEventListener("touchstart", onStart, { passive: true });
      node.addEventListener("touchmove", onMove, {
        passive: false,
        capture: true,
      });
      node.addEventListener("touchend", onEnd);
      node.addEventListener("touchcancel", onEnd);
      node.addEventListener("click", onClickCapture, true);
    };

    const detach = () => {
      node.removeEventListener("touchstart", onStart);
      node.removeEventListener("touchmove", onMove, true);
      node.removeEventListener("touchend", onEnd);
      node.removeEventListener("touchcancel", onEnd);
      node.removeEventListener("click", onClickCapture, true);
    };

    const sync = () => {
      detach();
      if (query.matches) attach();
      else node.scrollLeft = 0;
    };

    sync();
    query.addEventListener("change", sync);
    return () => {
      query.removeEventListener("change", sync);
      detach();
    };
  }, [ref]);
}

/**
 * Formatted here rather than through `formatShortDate` in `content-shell`:
 * that module drags the whole article shell into the landing bundle for one
 * `Intl` call.
 */
const cardDateFormat = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
});

function cardDate(iso: string): string {
  return cardDateFormat.format(new Date(`${iso}T00:00:00Z`));
}

function ArrowGlyph() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="journal-arrow"
    >
      <path d="M3 8h9.5M8.5 4l4 4-4 4" />
    </svg>
  );
}

function JournalCard({ entry }: { entry: ResourceEntry }) {
  const path = `/blog/${entry.slug}/`;
  const route = getRoute(path.slice(0, -1));
  // Same treatment as the blog cards: the manifest stores an absolute URL (and
  // sometimes a cache-busting query) but the page wants a plain same-origin path.
  const image = route ? new URL(route.image).pathname : undefined;

  return (
    <article className="journal-card">
      {/*
        One stretched hit target for the whole card, as on /blog. Nothing inside
        is interactive, so it can sit over the content without swallowing a
        nested control.
      */}
      <Link
        to={path}
        aria-label={entry.title}
        className="journal-card-hit"
        onClick={() => trackRelatedClick("landing_journal", entry.slug)}
      />
      {image && (
        <div className="journal-card-visual">
          <img
            src={image}
            alt=""
            width="1200"
            height="630"
            loading="lazy"
            decoding="async"
            className="journal-card-image"
          />
        </div>
      )}
      <div className="journal-card-body">
        <p className="journal-card-meta">
          <span className="journal-card-kind">{entry.kind}</span>
          <span aria-hidden className="journal-card-sep">
            ·
          </span>
          <time dateTime={entry.published}>{cardDate(entry.published)}</time>
        </p>
        <h3 className="journal-card-title">{entry.title}</h3>
        <p className="journal-card-copy">{entry.description}</p>
        <div className="journal-card-foot">
          <span className="journal-card-author">
            <img
              src={entry.author.image}
              alt=""
              width="28"
              height="28"
              loading="lazy"
              decoding="async"
              className="journal-card-avatar"
            />
            {entry.author.name}
          </span>
          <span aria-hidden className="journal-card-read">
            Read
            <ArrowGlyph />
          </span>
        </div>
      </div>
    </article>
  );
}

/**
 * The newest writing, between the FAQ and the closing ask.
 *
 * Placed there on purpose: a reader who has worked through pricing and the FAQ
 * and still is not ready to sign up previously had nothing left but the footer.
 * This gives that reader somewhere to go that is still ours, and it puts a
 * freshness signal on the homepage without a second CTA competing with the one
 * below it.
 *
 * It reads `resourceEntries`, which is already sorted newest first with drafts
 * removed, so publishing a post updates the homepage with no edit here.
 */
export function JournalSection() {
  const posts = resourceEntries.slice(0, LATEST_COUNT);
  const trackRef = useRef<HTMLOListElement>(null);
  useCarouselPageDrag(trackRef);
  if (!posts.length) return null;

  return (
    <section
      id="journal"
      aria-labelledby="journal-heading"
      className="journal-section"
    >
      <div className="journal-inner">
        <div className="journal-head reveal-item" data-reveal-delay="1">
          <h2 id="journal-heading" className="journal-title">
            <span className="text-[#4e4646]">From The</span>{" "}
            <span className="font-display italic text-[#01b4c8]">
              Build Log
            </span>
          </h2>
          <div className="journal-head-row">
            <p className="journal-lead">
              What we are learning while building an AI employee: agents,
              memory, and the workflows that actually finish.
            </p>
            <Link
              to="/blog/"
              className="hero-secondary-cta journal-view-all"
              onClick={() => trackRelatedClick("landing_journal", "index")}
            >
              View All
              <ArrowGlyph />
            </Link>
          </div>
        </div>
        <ol
          ref={trackRef}
          className="journal-grid reveal-item"
          data-reveal-delay="2"
          data-lenis-prevent-horizontal
          tabIndex={0}
          aria-label="Latest posts"
        >
          {posts.map((entry) => (
            <li key={entry.slug}>
              <JournalCard entry={entry} />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
