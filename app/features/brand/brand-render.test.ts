import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { brandDocument, brandFiles, brandKit } from "../../content/brand";
import { AuthProvider } from "../auth/auth-provider";
import { BrandPage } from "./brand-page";

// Escaped so the source itself stays free of the characters it checks for.
const DASHES = new RegExp("[\\u2013\\u2014]");

/** `/brand/` is prerendered, so every download has to be in the HTML. */
describe("brand page", () => {
  const html = renderToString(
    createElement(
      MemoryRouter,
      { initialEntries: ["/brand/"] },
      createElement(AuthProvider, null, createElement(BrandPage)),
    ),
  );

  it("links every file, the kit and the PDF", () => {
    const missing = [
      ...brandFiles.map((file) => file.href),
      brandKit.href,
      brandDocument.href,
    ].filter((href) => !html.includes(`href="${href}"`));
    expect(missing).toEqual([]);
  });

  // Markdown converters, Cloudflare's included, drop <header> as chrome.
  it("keeps the downloads where Markdown converters read them", () => {
    const main = html.slice(html.indexOf("<main"), html.indexOf("</main>"));
    expect(main).not.toContain("<header");
    for (const href of [brandKit.href, "/brand.md", "/brand/brand.json"]) {
      expect(main).toContain(`href="${href}"`);
    }
  });

  it("shows no tracked uppercase labels", () => {
    const main = html.slice(html.indexOf("<main"), html.indexOf("</main>"));
    expect(main).not.toMatch(/uppercase tracking-/);
  });

  it("has a section for every jump link", () => {
    const anchors = [...html.matchAll(/href="#([a-z]+)"/g)].map(
      (match) => match[1],
    );
    expect(anchors.length).toBeGreaterThan(0);
    expect(anchors.filter((id) => !html.includes(`id="${id}"`))).toEqual([]);
  });

  it("uses no em or en dashes", () => {
    expect(html.replace(/<[^>]+>/g, "")).not.toMatch(DASHES);
  });
});
