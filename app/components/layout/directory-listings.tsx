import {
  directoryListings,
  type DirectoryListing,
} from "../../content/directory-listings";

import "./directory-listings.css";

/**
 * Badges under this width-to-height ratio are shields rather than wordmarks.
 * Drawn at wordmark height their text is a few pixels tall, so they get a
 * taller line of their own size and end up with a similar footprint.
 */
const SHIELD_MAX_ASPECT = 1.5;

function isShield(listing: DirectoryListing) {
  return listing.width / listing.height < SHIELD_MAX_ASPECT;
}

/**
 * Every directory badge at once, small and muted, for the homepage footer's
 * "Featured on" column. Static on purpose: the Product Hunt and affiliate
 * badges in the bar below are the ones meant to draw the eye.
 */
export function DirectoryListings({ labelledBy }: { labelledBy: string }) {
  return (
    <ul
      className="directory-listings"
      aria-labelledby={labelledBy}
      data-directory-listings
    >
      {directoryListings.map((listing) => (
        <li key={listing.id} className="directory-listings-item">
          <a
            href={listing.href}
            target="_blank"
            rel="noopener noreferrer"
            className="directory-listings-link"
            data-directory-listing={listing.id}
          >
            <img
              src={listing.image}
              alt={listing.alt}
              width={listing.width}
              height={listing.height}
              loading="lazy"
              decoding="async"
              className="directory-listings-badge"
              data-shield={isShield(listing) ? "" : undefined}
            />
          </a>
        </li>
      ))}
    </ul>
  );
}
