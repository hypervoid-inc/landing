import { useEffect, useMemo, useSyncExternalStore } from "react";
import { Link, useLocation } from "react-router";

import { formatShortDate } from "../../components/content/content-shell";
import { SiteFooter, SiteHeader } from "../../components/layout/site-layout";
import { resourceEntries } from "../../content/resources";
import { canonicalRoutes, routeDisplayTitle } from "../../lib/route-manifest";
import { captureAnalytics } from "../analytics/analytics.client";
import { BusyworkStage } from "./busywork-stage";
import { suggestRoute } from "./suggest-route";
import "./not-found.css";

const LATEST_COUNT = 3;

const subscribeNever = () => () => {};

/**
 * Served for every unmatched URL, and rendered by the post, tag, author, and
 * use-case routes when their slug is unknown. One prerendered file covers all
 * of them, so anything that depends on the URL waits for the browser.
 */
export function NotFoundPage() {
  const { pathname } = useLocation();
  // Null on the server and for the hydrating render, which both see the one
  // prerendered file; the real pathname only means something in the browser.
  const hydrated = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
  const suggestion = useMemo(
    () => (hydrated ? suggestRoute(pathname, canonicalRoutes) : null),
    [hydrated, pathname],
  );

  useEffect(() => {
    if (!hydrated) return;
    // The requested path itself is never sent: a mistyped URL can carry a
    // token or an email. The guess is one of our own canonical paths.
    captureAnalytics("not_found_viewed", {
      suggested: suggestion ? `${suggestion.route.path}/` : null,
      suggestion_kind: suggestion?.kind ?? null,
    });
  }, [hydrated, suggestion]);

  const latest = resourceEntries.slice(0, LATEST_COUNT);

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main
        id="main"
        className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-5 py-12 sm:py-16"
      >
        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[#01b4c8]">
          404
        </p>
        <h1 className="font-geist mt-4 text-[40px] italic leading-tight text-[#4e4646] sm:text-[52px]">
          Page not found
        </h1>
        <p className="mt-5 max-w-xl leading-7 text-[#627c86]">
          We couldn’t find the page you’re looking for. It may have moved, or
          the link could be out of date. While you’re here, the computer could
          use a hand.
        </p>
        {/* Height is held while the guess is worked out, so the game below
            does not jump when it appears. */}
        <p className="mt-3 min-h-7 leading-7 text-[#4e4646]" aria-live="polite">
          {suggestion && (
            <>
              {suggestion.kind === "match" ? "Did you mean " : "Try "}
              <Link
                to={`${suggestion.route.path}/`}
                className="font-medium text-[#018fa0] underline underline-offset-4"
                onClick={() =>
                  captureAnalytics("not_found_suggestion_clicked", {
                    to: `${suggestion.route.path}/`,
                    suggestion_kind: suggestion.kind,
                  })
                }
              >
                {routeDisplayTitle(suggestion.route)}
              </Link>
              {suggestion.kind === "match" ? "?" : " instead."}
            </>
          )}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <Link
            to="/"
            className="rounded-full bg-[#01b4c8] px-6 py-3 text-sm font-medium text-white"
          >
            Back to home
          </Link>
          <Link
            to="/support/"
            className="text-sm text-[#01b4c8] hover:underline"
          >
            Contact support
          </Link>
        </div>

        <BusyworkStage />

        {latest.length > 0 && (
          <section aria-labelledby="nf-latest-heading" className="mt-12">
            <h2
              id="nf-latest-heading"
              className="font-geist text-[22px] italic text-[#4e4646]"
            >
              Pages that do exist
            </h2>
            <ul className="mt-4 divide-y divide-[#eff3f5] border-y border-[#eff3f5]">
              {latest.map((entry) => (
                <li key={entry.slug}>
                  <Link
                    to={`/blog/${entry.slug}/`}
                    className="group flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
                  >
                    <span className="font-medium text-[#4e4646] group-hover:text-[#018fa0]">
                      {entry.title}
                    </span>
                    <time
                      dateTime={entry.published}
                      className="shrink-0 text-sm text-[#627c86]"
                    >
                      {formatShortDate(entry.published)}
                    </time>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
