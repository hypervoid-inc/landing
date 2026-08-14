import { Link } from "react-router";

import { trackRelatedClick } from "../../components/content/related-links";
import { resourceEntries, type ResourceEntry } from "~/content/resources";
import { getRoute } from "~/lib/route-manifest";

import "./journal-section.css";

/** Three fills one desktop row exactly, so the grid never leaves an orphan. */
const LATEST_COUNT = 3;

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
        <ol className="journal-grid">
          {posts.map((entry, index) => (
            <li
              key={entry.slug}
              className="reveal-item"
              data-reveal-delay={String(Math.min(index, 3) + 1)}
            >
              <JournalCard entry={entry} />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
