import type { ReactNode } from "react";
import { Link } from "react-router";
import { SiteFooter, SiteHeader } from "../layout/site-layout";

export type Breadcrumb = { readonly label: string; readonly to: string };

/**
 * Vertical gap between sticky site chrome (optional PH banner + header) and a
 * stuck rail. Driven by `--site-chrome-height` so the rail tracks the campaign
 * strip without hardcoding 5.5rem.
 */
const RAIL_TOP = "top-[calc(var(--site-chrome-height)+0.75rem)]";
const RAIL_MAX_H = "max-h-[calc(100dvh-var(--site-chrome-height)-1.5rem)]";

export function ContentShell({
  title,
  metadata,
  breadcrumbs = [{ label: "Home", to: "/" }],
  breadcrumbTitle,
  article = false,
  aside,
  children,
}: {
  title: string;
  metadata?: ReactNode;
  breadcrumbs?: readonly Breadcrumb[];
  breadcrumbTitle?: string;
  article?: boolean;
  /**
   * Optional desktop-only rail beside the article.
   *
   * Only blog posts pass one, so every other content page keeps the plain
   * centred column. When present the container widens at `xl` and the article
   * column is pinned at its usual `48rem`, so the reading measure, type scale,
   * and every page without a rail stay pixel-identical: the rail is additive
   * space at the margin rather than a resize of the content.
   */
  aside?: ReactNode;
  children: ReactNode;
}) {
  const Content = article ? "article" : "div";
  return (
    <div className="flex min-h-dvh flex-col bg-white text-[#4e4646]">
      <SiteHeader />
      <main
        id="main"
        className={`mx-auto w-full flex-1 px-5 pb-20 pt-10 sm:px-6 lg:pt-16 ${
          aside
            ? "max-w-3xl xl:grid xl:max-w-[73.75rem] xl:grid-cols-[minmax(0,48rem)_18.75rem] xl:gap-12"
            : "max-w-3xl"
        }`}
      >
        {/* `min-w-0` stops a wide table or code block inside the article from
            forcing the grid track past its declared 48rem. */}
        <div className="col-start-1 row-start-1 min-w-0">
          <nav
            aria-label="Breadcrumb"
            className="text-[13px] leading-5 text-[#8a9aa2]"
          >
            <ol className="flex flex-wrap items-center gap-2">
              {breadcrumbs.map((item) => (
                <li key={item.to} className="flex items-center gap-2">
                  <Link
                    to={item.to}
                    className="transition-colors hover:text-[#01b4c8]"
                  >
                    {item.label}
                  </Link>
                  <span aria-hidden>/</span>
                </li>
              ))}
              <li aria-current="page">{breadcrumbTitle ?? title}</li>
            </ol>
          </nav>
          <Content>
            <h1 className="font-geist mt-8 text-[36px] italic leading-[1.1] tracking-[-0.02em] sm:text-[44px] lg:text-[52px]">
              {title}
            </h1>
            {metadata && (
              <div className="mt-4 text-[13px] leading-5 text-[#526b75]">
                {metadata}
              </div>
            )}
            <div className="resource-content mt-12 space-y-10 text-[15px] leading-[1.7] text-[#627c86] lg:text-[16px]">
              {children}
            </div>
          </Content>
        </div>
        {aside && (
          // Last in the DOM so keyboard and screen-reader users reach the whole
          // post before its sidebar, then put back alongside it by explicit
          // grid placement rather than source order.
          <div className="col-start-2 row-start-1 hidden min-w-0 overflow-visible xl:block">
            {/*
              Padding + matching negative margin: overflow-y-auto otherwise clips
              PH card shadows and the translateY(-1px) hover lift at the edges.
              Extra bottom padding — coral blur is ~24–28px and was hard-clipping.
            */}
            <div
              className={`resource-rail-scroll sticky ${RAIL_TOP} ${RAIL_MAX_H} overflow-x-clip overflow-y-auto px-4 pb-8 pt-4 -mx-4 -mb-8 -mt-4`}
            >
              {aside}
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2 className="font-geist text-[22px] italic leading-tight tracking-[-0.015em] text-[#4e4646] lg:text-[26px]">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function Subheading({ children }: { children: ReactNode }) {
  return (
    <h3 className="mt-6 mb-2 text-[13px] font-semibold uppercase tracking-[0.1em] text-[#4e4646] lg:text-[14px]">
      {children}
    </h3>
  );
}

export function List({ children }: { children: ReactNode }) {
  return (
    <ul className="list-disc space-y-2 pl-5 marker:text-[#cfd7db]">
      {children}
    </ul>
  );
}

export function Emph({ children }: { children: ReactNode }) {
  return <strong className="font-medium text-[#4e4646]">{children}</strong>;
}

export function InlineLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  const className = "text-[#01b4c8] underline underline-offset-2";
  return href.startsWith("/") ? (
    <Link to={href} className={className}>
      {children}
    </Link>
  ) : (
    <a
      href={href}
      target={href.startsWith("mailto:") ? undefined : "_blank"}
      rel="noopener noreferrer"
      className={className}
    >
      {children}
    </a>
  );
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

export function formatShortDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}
