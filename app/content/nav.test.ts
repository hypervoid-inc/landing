import { describe, expect, it } from "vitest";

import { companyLinks } from "./landing";
import { canonicalRoutes } from "../lib/route-manifest";
import { useCases } from "./use-cases";
import {
  navItemIsCurrent,
  navLinkIsCurrent,
  primaryNav,
  type NavMenu,
} from "./nav";

const canonicalHrefs = new Set(
  canonicalRoutes.map((route) => (route.path === "/" ? "/" : `${route.path}/`)),
);

describe("primary nav", () => {
  it("is Pricing plus three disclosure groups", () => {
    expect(primaryNav.map((item) => item.label)).toEqual([
      "Pricing",
      "Resources",
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
      else hrefs.push(...item.items.map((link) => link.href));
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

  it("marks Resources current on blog routes and Pricing only on /pricing/", () => {
    const resources = primaryNav.find(
      (item): item is NavMenu =>
        item.kind !== "link" && item.id === "resources",
    )!;
    const pricing = primaryNav[0]!;
    expect(navItemIsCurrent("/blog/ai-employee/", resources)).toBe(true);
    expect(navItemIsCurrent("/pricing/", resources)).toBe(false);
    expect(navItemIsCurrent("/pricing/", pricing)).toBe(true);
    expect(navItemIsCurrent("/about/", pricing)).toBe(false);
    expect(navLinkIsCurrent("/blog/", "/blog/")).toBe(true);
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
