import type { CSSProperties, FocusEvent } from "react";

import {
  directoryListings,
  type DirectoryListing,
} from "../../content/directory-listings";

import "./directory-listings.css";

/** Seconds each badge adds to one loop, so the drift stays slow at any count. */
const SECONDS_PER_BADGE = 9;
const MIN_LOOP_SECONDS = 24;

/**
 * On keyboard focus the stylesheet stops the loop and makes the strip
 * scrollable, but only after the browser has already tried, and failed, to
 * scroll the still-sliding badge into view. Ask again now that it holds still.
 */
function revealFocusedBadge(event: FocusEvent<HTMLAnchorElement>) {
  const link = event.currentTarget;
  if (!link.matches(":focus-visible")) return;
  link.scrollIntoView({ block: "nearest", inline: "nearest" });
}

function ListingBadge({
  listing,
  clone = false,
}: {
  listing: DirectoryListing;
  clone?: boolean;
}) {
  return (
    <a
      href={listing.href}
      target="_blank"
      rel="noopener noreferrer"
      className="directory-strip-link"
      data-directory-listing={clone ? undefined : listing.id}
      tabIndex={clone ? -1 : undefined}
      onFocus={clone ? undefined : revealFocusedBadge}
    >
      <img
        src={listing.image}
        alt={clone ? "" : listing.alt}
        width={listing.width}
        height={listing.height}
        // Not lazy: a badge clipped by the strip never counts as near the
        // viewport, so it would only start loading as it drifts into view.
        fetchPriority="low"
        decoding="async"
        className="directory-strip-badge"
      />
    </a>
  );
}

/**
 * Slow-drifting strip of directory badges for the homepage footer. Kept
 * smaller and narrower than the Product Hunt and affiliate badges it sits
 * beside, so those stay the focus.
 *
 * The list is rendered twice and each copy slides by its own width, so the
 * wrap lands on an identical frame. The second copy only exists for the loop:
 * it is hidden from assistive tech and from the tab order, and the directory
 * hooks sit on the first copy alone.
 */
export function DirectoryListings() {
  if (directoryListings.length === 0) return null;
  const loopSeconds = Math.max(
    MIN_LOOP_SECONDS,
    directoryListings.length * SECONDS_PER_BADGE,
  );
  return (
    <div
      className="directory-strip"
      data-directory-strip
      style={{ "--directory-strip-loop": `${loopSeconds}s` } as CSSProperties}
    >
      <ul className="directory-strip-group" aria-label="Featured on">
        {directoryListings.map((listing) => (
          <li key={listing.id} className="directory-strip-item">
            <ListingBadge listing={listing} />
          </li>
        ))}
      </ul>
      <div className="directory-strip-group" aria-hidden>
        {directoryListings.map((listing) => (
          <span key={listing.id} className="directory-strip-item">
            <ListingBadge listing={listing} clone />
          </span>
        ))}
      </div>
    </div>
  );
}
