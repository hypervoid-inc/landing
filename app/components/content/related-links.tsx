import { Link } from "react-router";

import { getRelatedResource } from "../../content/related";
import { captureAnalytics } from "../../features/analytics/analytics.client";

/**
 * Records which onward-reading surface a click came from. Shared by the
 * end-of-post grid, the mid-article link, and the desktop rail so all three
 * report one event and can be compared against each other by `source`.
 */
export function trackRelatedClick(source: string, slug: string) {
  captureAnalytics("related_post_clicked", { source, slug });
}

/**
 * A single hand-picked onward link for the middle of an article, authorable in
 * MDX as `<ReadNext slug="..." />`.
 *
 * One link rather than a card grid, because a grid mid-article stalls the read
 * it is supposed to extend. The slug is chosen by the author for the same
 * reason `BetaCta` placement is: partway down a specific argument, the right
 * next post is an editorial call a similarity score cannot make.
 *
 * Lives here rather than beside the page components because `mdxComponents`
 * has to import it, and those components import `mdxComponents` right back.
 */
export function ReadNext({ slug }: { slug: string }) {
  const entry = getRelatedResource(slug);
  if (!entry) return null;
  return (
    // A plain div, not an `aside`: mid-article this is a callout, and an
    // `aside` would add a second unnamed `complementary` landmark beside the
    // desktop rail's.
    <div className="my-8 rounded-xl border border-[#e5e7eb] bg-[#fafafa] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a9aa2]">
        Read next
      </p>
      <Link
        to={`/blog/${entry.slug}/`}
        onClick={() => trackRelatedClick("blog_read_next", entry.slug)}
        className="group mt-1.5 flex items-baseline gap-2 text-[15px] font-medium text-[#017b89]"
      >
        <span className="underline underline-offset-2">{entry.title}</span>
        <span
          aria-hidden
          className="transition-transform group-hover:translate-x-0.5"
        >
          &rarr;
        </span>
      </Link>
    </div>
  );
}
