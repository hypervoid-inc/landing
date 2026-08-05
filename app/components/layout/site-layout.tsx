import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router";

import { companyLinks, comparisonLinks } from "../../content/landing";
import { useAuth } from "../../features/auth/auth-provider";
import { BetaLink, StartLink } from "../../features/landing/beta-access";
import { UserMenu } from "./user-menu";

function navCurrent(pathname: string, href: string): "page" | undefined {
  if (href.startsWith("/#")) return undefined;
  const path = href.endsWith("/") ? href.slice(0, -1) || "/" : href;
  const current =
    pathname.endsWith("/") && pathname.length > 1
      ? pathname.slice(0, -1)
      : pathname;
  if (path === "/blog") {
    return current === "/blog" || current.startsWith("/blog/")
      ? "page"
      : undefined;
  }
  return current === path ? "page" : undefined;
}

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();
  const { status, user } = useAuth();

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 8);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <header
      className={`site-header sticky top-0 z-50 w-full border-b transition-[background-color,border-color,box-shadow] duration-200 ${scrolled ? "border-[#dcecef] bg-white/90 shadow-[0_6px_20px_rgba(37,72,82,.06)] backdrop-blur-xl backdrop-saturate-150" : "border-transparent bg-white/80 backdrop-blur-md"}`}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-[100] focus:bg-black focus:px-3 focus:py-2 focus:text-xs focus:text-white"
      >
        Skip to main content
      </a>
      <div className="mx-auto flex h-12 w-full max-w-[1500px] items-center gap-1.5 px-3 sm:gap-4 sm:px-6 lg:h-14 lg:px-16">
        <Link
          to="/"
          aria-label="Construct Computer - home"
          className="font-display whitespace-nowrap text-[15px] italic leading-6 tracking-[-.015em] sm:text-[16px] lg:text-[18px] lg:leading-7"
        >
          <span className="text-[#4e4646]">Construct</span>
          <span className="text-[#01b4c8]">Computer</span>
        </Link>
        <nav
          aria-label="Primary"
          className="ml-auto flex items-center text-[12px] text-[#627c86] sm:text-[13px]"
        >
          <Link
            to="/#pricing"
            className="inline-flex min-h-11 items-center rounded-full px-1.5 transition-colors hover:bg-[#effbfc] hover:text-[#018fa0] sm:px-2"
          >
            Pricing
          </Link>
          <Link
            to="/blog/"
            aria-current={navCurrent(pathname, "/blog")}
            className="inline-flex min-h-11 items-center rounded-full px-1.5 transition-colors hover:bg-[#effbfc] hover:text-[#018fa0] sm:px-2"
          >
            Blog
          </Link>
          <Link
            to="/affiliates/"
            aria-current={navCurrent(pathname, "/affiliates")}
            className="hidden min-h-11 items-center rounded-full px-2 transition-colors hover:bg-[#effbfc] hover:text-[#018fa0] sm:inline-flex"
          >
            Affiliates
          </Link>
        </nav>
        {status === "authenticated" && user ? (
          <UserMenu user={user} />
        ) : (
          <StartLink
            source="nav"
            label="Start using Construct"
            className="site-cta inline-flex min-h-10 shrink-0 items-center justify-center rounded-full bg-black px-2.5 text-[11px] font-semibold text-white shadow-[0_4px_12px_rgba(0,0,0,.16)] sm:px-3 lg:px-4 lg:text-xs"
          >
            <span className="sm:hidden">Start now</span>
            <span className="hidden sm:inline">Start Now</span>
          </StartLink>
        )}
      </div>
    </header>
  );
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className="grid h-9 w-9 place-items-center rounded-full border border-[#e5e7eb] bg-white text-[#627c86] transition-[color,border-color] hover:border-[#8adcdf] hover:text-[#01b4c8]"
    >
      {children}
    </a>
  );
}

function FooterColumn({
  title,
  label,
  links,
}: {
  title: string;
  label: string;
  links: ReadonlyArray<readonly [string, string]>;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-3 text-center sm:gap-4 lg:items-start lg:text-left">
      <p className="text-[11px] font-semibold uppercase tracking-[.12em] text-[#4e4646]">
        {title}
      </p>
      <nav
        aria-label={label}
        className="flex flex-col items-center gap-1 sm:gap-2.5 lg:items-start"
      >
        {links.map(([text, href]) => (
          <Link
            key={href}
            to={href}
            className="inline-flex min-h-9 w-fit items-center text-[13px] leading-5 text-[#627c86] transition-colors hover:text-[#01b4c8] sm:text-sm"
          >
            {text}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="relative isolate overflow-hidden border-t border-[#e5e7eb] bg-[#fafafa]">
      <div className="mx-auto w-full max-w-[1500px] px-5 sm:px-6 lg:px-16">
        <div className="grid grid-cols-2 gap-x-6 gap-y-9 py-10 sm:gap-10 sm:py-12 lg:grid-cols-[1.4fr_1fr_1fr] lg:gap-16 lg:py-16">
          <div className="col-span-2 flex flex-col items-center gap-4 text-center sm:gap-6 lg:col-span-1 lg:items-start lg:text-left">
            <Link
              to="/"
              className="font-display w-fit text-2xl italic leading-none tracking-[-0.02em] sm:text-[32px]"
            >
              <span className="text-[#4e4646]">Construct</span>
              <span className="text-[#01b4c8]">Computer</span>
            </Link>
            <p className="max-w-[280px] text-[13px] leading-[1.55] text-[#627c86] sm:max-w-xs sm:text-sm sm:leading-[1.6]">
              AI employee for founders and small teams.
            </p>
            <div className="flex items-center gap-2.5 sm:gap-3">
              <SocialLink
                href="https://x.com/use_construct"
                label="X (Twitter)"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                  <path
                    fill="currentColor"
                    d="M18.244 2H21.5l-7.51 8.58L22.5 22h-6.78l-5.31-6.94L4.3 22H1.04l8.03-9.18L1.5 2h6.96l4.8 6.35L18.244 2Zm-1.19 18h1.88L7.06 4H5.07l11.984 16Z"
                  />
                </svg>
              </SocialLink>
              <SocialLink
                href="https://github.com/construct-computer"
                label="GitHub"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                  <path
                    fill="currentColor"
                    d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.46-1.16-1.12-1.47-1.12-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.56-1.11-4.56-4.95 0-1.09.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.52 9.52 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.6 1.03 2.69 0 3.85-2.34 4.7-4.57 4.94.36.31.68.92.68 1.85v2.74c0 .26.18.58.69.48A10 10 0 0 0 12 2Z"
                  />
                </svg>
              </SocialLink>
              <SocialLink href="https://discord.gg/puArEQHYN9" label="Discord">
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                  <path
                    fill="currentColor"
                    d="M20.317 4.37a19.8 19.8 0 0 0-4.885-1.515c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.6 12.6 0 0 0-.617-1.25A19.7 19.7 0 0 0 3.677 4.37C.533 9.046-.32 13.58.099 18.057a19.9 19.9 0 0 0 5.993 3.03c.45-.622.862-1.29 1.226-1.994a13 13 0 0 1-1.872-.892l.372-.292c3.928 1.793 8.18 1.793 12.062 0l.373.292a12.3 12.3 0 0 1-1.873.892c.36.698.772 1.362 1.225 1.993a19.8 19.8 0 0 0 6.002-3.03c.5-5.177-.838-9.674-3.549-13.66ZM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419s.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418Zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419s.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418Z"
                  />
                </svg>
              </SocialLink>
              <SocialLink
                href="https://linkedin.com/company/construct-computer"
                label="LinkedIn"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                  <path
                    fill="currentColor"
                    d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm7 0h3.83v1.64h.05c.53-1 1.84-2.06 3.79-2.06 4.05 0 4.8 2.67 4.8 6.14V21h-4v-5.55c0-1.32-.02-3.02-1.84-3.02-1.84 0-2.12 1.44-2.12 2.92V21h-4V9Z"
                  />
                </svg>
              </SocialLink>
            </div>
            <BetaLink
              source="footer"
              label="Get Construct product updates by email"
              className="site-cta mt-1 inline-flex w-full items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-[13px] font-semibold text-white shadow-[0_4px_4px_rgba(0,0,0,.15)] sm:mt-2 sm:w-fit sm:py-2.5"
            >
              Get product updates <span aria-hidden>↗</span>
            </BetaLink>
          </div>
          <FooterColumn title="Company" label="Company" links={companyLinks} />
          <FooterColumn
            title="Compare"
            label="Comparisons"
            links={comparisonLinks}
          />
        </div>
        <div className="flex flex-col items-center gap-3 border-t border-[#e5e7eb] py-5 text-center sm:py-6 lg:flex-row-reverse lg:justify-between lg:gap-4 lg:text-left">
          <Link
            to="/affiliates/"
            className="site-cta-pill group inline-flex min-h-10 items-center gap-2 rounded-full border border-[#35949a]/50 bg-white px-2.5 py-1.5 text-[13px] font-semibold leading-[18px] text-[#014e59] shadow-[0_6px_18px_rgba(57,148,154,.14)]"
          >
            <span className="inline-flex items-center rounded-full bg-[#01b4c8] px-2 py-1 text-[9px] font-black uppercase tracking-[.12em] text-white">
              New
            </span>
            <span className="sm:hidden">Affiliates · 50%</span>
            <span className="hidden sm:inline">
              Affiliates: 50% for first 25, then 20%
            </span>
            <span aria-hidden className="site-cta-pill-arrow">
              →
            </span>
          </Link>
          <p className="text-xs leading-[18px] text-[#8a9aa2]">
            © {new Date().getFullYear()} Construct
          </p>
        </div>
      </div>
    </footer>
  );
}
