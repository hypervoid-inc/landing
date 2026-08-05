import type { ReactNode } from "react";
import { Link } from "react-router";
import { SiteFooter, SiteHeader } from "../layout/site-layout";

export type Breadcrumb = { readonly label: string; readonly to: string };

export function ContentShell({
  title,
  metadata,
  breadcrumbs = [{ label: "Home", to: "/" }],
  breadcrumbTitle,
  article = false,
  children,
}: {
  title: string;
  metadata?: ReactNode;
  breadcrumbs?: readonly Breadcrumb[];
  breadcrumbTitle?: string;
  article?: boolean;
  children: ReactNode;
}) {
  const Content = article ? "article" : "div";
  return (
    <div className="flex min-h-dvh flex-col bg-white text-[#4e4646]">
      <SiteHeader />
      <main
        id="main"
        className="mx-auto w-full max-w-3xl flex-1 px-5 pb-20 pt-10 sm:px-6 lg:pt-16"
      >
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
