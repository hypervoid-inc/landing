import { describe, expect, it } from "vitest";

import { crawlerFiles, sitemapXml } from "../app/lib/generated-content";
import { routeMeta, softwareApplicationJsonLd } from "../app/lib/seo";
import { canonicalRoutes } from "../app/lib/route-manifest";

describe("generated discovery content", () => {
  it("includes only canonical 200 routes in the sitemap", () => {
    const sitemap = sitemapXml(canonicalRoutes);

    expect(sitemap.match(/<url>/g)).toHaveLength(canonicalRoutes.length);
    expect(sitemap).not.toContain("/404/");
    expect(sitemap).not.toContain("/blogs/");
    for (const route of canonicalRoutes) {
      expect(sitemap).toContain(`<loc>${route.canonical}</loc>`);
      if (route.lastModified) {
        expect(sitemap).toContain(`<lastmod>${route.lastModified}</lastmod>`);
      }
    }
  });

  it("emits the complete crawler file set", () => {
    expect(Object.keys(crawlerFiles)).toEqual([
      "sitemap.xml",
      "rss.xml",
      "atom.xml",
      "robots.txt",
      "llms.txt",
      "llms-full.txt",
      ".well-known/security.txt",
    ]);
  });

  it("publishes guides and comparisons in the same blog feeds", () => {
    expect(crawlerFiles["rss.xml"]).toContain(
      "https://construct.computer/blog/ai-employee/",
    );
    expect(crawlerFiles["atom.xml"]).toContain(
      "https://construct.computer/blog/construct-vs-chatgpt/",
    );
    expect(crawlerFiles["rss.xml"]).not.toContain("/vs/");
  });
});

describe("route metadata", () => {
  it("does not publish hardcoded commercial prices in software metadata", () => {
    expect(softwareApplicationJsonLd()).not.toHaveProperty("offers");
  });

  it("returns canonical, robots, Open Graph, and Twitter metadata without keywords", () => {
    const route = canonicalRoutes.find(
      ({ path }) => path === "/blog/ai-agent-vs-zapier",
    )!;
    const meta = routeMeta(route);

    expect(meta).toContainEqual({
      tagName: "link",
      rel: "canonical",
      href: route.canonical,
    });
    expect(meta).toContainEqual({
      name: "robots",
      content: "index, follow, max-image-preview:large",
    });
    expect(meta).toContainEqual({ property: "og:type", content: "article" });
    expect(meta).toContainEqual({
      name: "twitter:card",
      content: "summary_large_image",
    });
    expect(
      meta.some((entry) => "name" in entry && entry.name === "keywords"),
    ).toBe(false);
  });

  it("emits article dates only for articles and gives guides a Blog breadcrumb", () => {
    const policyMeta = routeMeta(
      canonicalRoutes.find(({ path }) => path === "/editorial-policy")!,
    );
    expect(
      policyMeta.some(
        (entry) =>
          "property" in entry && entry.property === "article:modified_time",
      ),
    ).toBe(false);

    const guideMeta = routeMeta(
      canonicalRoutes.find(({ path }) => path === "/blog/ai-employee")!,
    );
    expect(JSON.stringify(guideMeta)).toContain(
      "https://construct.computer/blog/",
    );
  });
});
