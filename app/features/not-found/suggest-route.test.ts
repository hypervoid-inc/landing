import { describe, expect, it } from "vitest";

import { canonicalRoutes } from "../../lib/route-manifest";
import { normalizeRequestedPath, suggestRoute } from "./suggest-route";

const routes = [
  { path: "/" },
  { path: "/pricing" },
  { path: "/about" },
  { path: "/blog" },
  { path: "/blog/zen-mode" },
  { path: "/blog/ai-agent-memory" },
  { path: "/blog/grokbot-alternative" },
  { path: "/blog/tag/zapier" },
  { path: "/use-cases" },
  { path: "/use-cases/memory" },
];

const suggest = (pathname: string) => {
  const suggestion = suggestRoute(pathname, routes);
  return suggestion ? [suggestion.kind, suggestion.route.path] : null;
};

describe("404 route suggestions", () => {
  it("normalizes what was typed before comparing", () => {
    expect(normalizeRequestedPath("/Blog/Zen_Mode/")).toBe("/blog/zen-mode");
    expect(normalizeRequestedPath("/pricing.html")).toBe("/pricing");
    expect(normalizeRequestedPath("/blog//zen%20mode")).toBe("/blog/zen-mode");
    expect(normalizeRequestedPath("/%E0%A4%A")).toBe("/%e0%a4%a");
  });

  it("recovers typos", () => {
    expect(suggest("/blog/zenmode")).toEqual(["match", "/blog/zen-mode"]);
    expect(suggest("/pricng/")).toEqual(["match", "/pricing"]);
    expect(suggest("/Blog/Zen-Mode.html")).toEqual(["match", "/blog/zen-mode"]);
  });

  it("recovers a slug under the wrong parent, or cut short", () => {
    expect(suggest("/zen-mode")).toEqual(["match", "/blog/zen-mode"]);
    expect(suggest("/blog/zen")).toEqual(["match", "/blog/zen-mode"]);
    expect(suggest("/price")).toEqual(["match", "/pricing"]);
  });

  it("falls back to the section when no page is close", () => {
    expect(suggest("/blog/how-to-bake-bread")).toEqual(["section", "/blog"]);
    expect(suggest("/use-cases/juggling")).toEqual(["section", "/use-cases"]);
  });

  it("does not mistake a shared parent for a near miss", () => {
    expect(suggest("/blog/tag/nope")).toEqual(["section", "/blog"]);
    expect(suggest("/blog/tag/zapir")).toEqual(["match", "/blog/tag/zapier"]);
    expect(suggest("/blogs")).toEqual(["match", "/blog"]);
  });

  it("does not let a word every post shares pick a post", () => {
    expect(suggest("/blog/ai")).toEqual(["section", "/blog"]);
  });

  it("stays quiet when it has nothing useful to say", () => {
    expect(suggest("/definitely-not-a-page")).toBeNull();
    expect(suggest("/wp-admin/setup.php")).toBeNull();
    expect(suggest("/")).toBeNull();
  });

  it("never offers the homepage as a guess", () => {
    expect(suggest("/a")).toBeNull();
  });

  it("finds real pages in the live manifest", () => {
    expect(suggestRoute("/pricng", canonicalRoutes)?.route.path).toBe(
      "/pricing",
    );
  });
});
