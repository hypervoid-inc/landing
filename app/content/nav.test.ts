import { describe, expect, it } from "vitest";

import { companyLinks } from "./landing";
import { canonicalRoutes } from "../lib/route-manifest";
import { resourceEntries } from "./resources";
import { useCases } from "./use-cases";
import {
  BLOG_MENU_POSTS,
  navItemIsCurrent,
  navLinkIsCurrent,
  primaryNav,
  type NavMenu,
} from "./nav";

const blogMenu = primaryNav.find(
  (item): item is NavMenu => item.kind !== "link" && item.id === "blog",
)!;

const canonicalHrefs = new Set(
  canonicalRoutes.map((route) => (route.path === "/" ? "/" : `${route.path}/`)),
);

describe("primary nav", () => {
  it("is Pricing plus three disclosure groups", () => {
    expect(primaryNav.map((item) => item.label)).toEqual([
      "Pricing",
      "Blog",
      "Use Cases",
      "Company",
    ]);
    expect(primaryNav[0]).toMatchObject({
      kind: "link",
      href: "/pricing/",
    });
  });

  it("points every destination at a canonical trailing-slash URL, never a hash", () => {
    const hrefs: string[] = [];
    for (const item of primaryNav) {
      if (item.kind === "link") hrefs.push(item.href);
      else {
        if (item.href) hrefs.push(item.href);
        if (item.footer) hrefs.push(item.footer.href);
        hrefs.push(...item.items.map((link) => link.href));
      }
    }
    expect(hrefs.some((href) => href.includes("#"))).toBe(false);
    for (const href of hrefs) {
      expect(href.endsWith("/"), href).toBe(true);
      expect(canonicalHrefs.has(href), href).toBe(true);
    }
  });

  it("lists every use-case page and a Company subset of footer links", () => {
    const useCaseNav = primaryNav.find(
      (item): item is NavMenu =>
        item.kind !== "link" && item.id === "use-cases",
    )!;
    expect(useCaseNav.items.map((item) => item.href)).toEqual(
      useCases.map((entry) => `/use-cases/${entry.slug}/`),
    );

    const companyNav = primaryNav.find(
      (item): item is NavMenu => item.kind !== "link" && item.id === "company",
    )!;
    const footerCompany = new Set<string>(companyLinks.map(([, href]) => href));
    for (const item of companyNav.items) {
      expect(footerCompany.has(item.href)).toBe(true);
    }
    expect(companyNav.items.map((item) => item.label)).toEqual([
      "About",
      "Careers",
      "Affiliates",
      "Support",
    ]);
  });

  it("makes Blog a link to /blog/ whose menu lists the newest posts, newest first", () => {
    expect(blogMenu).toMatchObject({ label: "Blog", href: "/blog/" });
    expect(blogMenu.footer).toEqual({ label: "All posts", href: "/blog/" });

    expect(BLOG_MENU_POSTS).toBe(7);
    const newest = [...resourceEntries]
      .sort((left, right) => right.published.localeCompare(left.published))
      .slice(0, BLOG_MENU_POSTS);
    expect(blogMenu.items.map((item) => item.href)).toEqual(
      newest.map((entry) => `/blog/${entry.slug}/`),
    );
    expect(blogMenu.items.map((item) => item.label)).toEqual(
      newest.map((entry) => entry.title),
    );
  });

  it("marks Blog current on blog routes and Pricing only on /pricing/", () => {
    const pricing = primaryNav[0]!;
    expect(navItemIsCurrent("/blog/", blogMenu)).toBe(true);
    expect(navItemIsCurrent("/blog/ai-employee/", blogMenu)).toBe(true);
    expect(navItemIsCurrent("/blog/tag/product/", blogMenu)).toBe(true);
    expect(navItemIsCurrent("/pricing/", blogMenu)).toBe(false);
    expect(navItemIsCurrent("/pricing/", pricing)).toBe(true);
    expect(navItemIsCurrent("/about/", pricing)).toBe(false);
    // Only the index itself is the page "All posts" points at.
    expect(navLinkIsCurrent("/blog/", "/blog/")).toBe(true);
    expect(navLinkIsCurrent("/blog/ai-employee/", "/blog/")).toBe(false);
    expect(navLinkIsCurrent("/about/", "/blog/")).toBe(false);

    const useCases = primaryNav.find(
      (item): item is NavMenu =>
        item.kind !== "link" && item.id === "use-cases",
    )!;
    expect(navItemIsCurrent("/use-cases/", useCases)).toBe(true);
    expect(navItemIsCurrent("/use-cases/memory/", useCases)).toBe(true);
    expect(navItemIsCurrent("/blog/", useCases)).toBe(false);
  });
});
