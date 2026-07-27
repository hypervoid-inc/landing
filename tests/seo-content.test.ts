import { describe, expect, it } from "vitest";

import { crawlerFiles, sitemapXml } from "../app/lib/generated-content";
import {
  organizationJsonLd,
  routeJsonLd,
  routeMeta,
  softwareApplicationJsonLd,
} from "../app/lib/seo";
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

  it("includes authors, publication dates, and tags in both feeds", () => {
    expect(crawlerFiles["rss.xml"]).toContain("xmlns:dc=");
    expect(crawlerFiles["rss.xml"]).toContain(
      "<dc:creator>Ankush</dc:creator>",
    );
    expect(crawlerFiles["rss.xml"]).toContain("<category>comparison</category>");
    expect(crawlerFiles["atom.xml"]).toContain("<name>Ankush</name>");
    expect(crawlerFiles["atom.xml"]).toContain("<published>2026-07-26T00:00:00Z</published>");
    expect(crawlerFiles["atom.xml"]).toContain(
      '<category term="comparison"/>',
    );
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
  it("keeps the homepage description concise", () => {
    const home = canonicalRoutes.find(({ path }) => path === "/")!;

    expect(home.description.length).toBeLessThanOrEqual(160);
  });

  it("publishes the organization logo", () => {
    expect(organizationJsonLd()).toHaveProperty("logo", {
      "@type": "ImageObject",
      url: "https://construct.computer/icon-512.png",
      width: 512,
      height: 512,
    });
  });

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

  it("publishes the complete editorial author identity", () => {
    const route = canonicalRoutes.find(
      ({ path }) => path === "/blog/ai-agent-vs-zapier",
    )!;
    const json = JSON.stringify(routeJsonLd(route));

    expect(json).toContain(
      '"author":{"@type":"Person","name":"Ankush","url":"https://x.com/ankushKun_","image":"https://construct.computer/authors/ankush.webp","sameAs":["https://x.com/ankushKun_"]}',
    );
    expect(routeMeta(route)).toContainEqual({
      name: "twitter:creator",
      content: "@ankushKun_",
    });
    expect(routeMeta(route)).toContainEqual({
      property: "article:tag",
      content: "comparison",
    });
    expect(json).toContain(
      '"keywords":["comparison","zapier","ai-agent","automation"]',
    );

    const guide = canonicalRoutes.find(
      ({ path }) => path === "/blog/ai-employee",
    )!;
    expect(JSON.stringify(routeJsonLd(guide))).toContain(
      '"author":{"@type":"Person","name":"Nischal","url":"https://x.com/naik_nischal","image":"https://construct.computer/authors/nischal.webp","sameAs":["https://x.com/naik_nischal"]}',
    );

    const comparison = canonicalRoutes.find(
      ({ path }) => path === "/blog/construct-vs-chatgpt",
    )!;
    expect(JSON.stringify(routeJsonLd(comparison))).toContain(
      '"author":{"@type":"Organization","name":"Construct Team","url":"https://construct.computer/about/","image":"https://construct.computer/icon-192.png","sameAs":["https://x.com/use_construct"]}',
    );

    expect(() => routeJsonLd({ ...route, author: undefined })).toThrow(
      "Missing author for /blog/ai-agent-vs-zapier",
    );
  });

  it("keeps display titles separate from SEO titles and honest update dates", () => {
    const route = canonicalRoutes.find(
      ({ path }) => path === "/blog/ai-agent-vs-virtual-assistant",
    )!;
    const meta = routeMeta(route);

    expect(route.title).toBe(
      "AI Agent vs Virtual Assistant: Cost Comparison",
    );
    expect(JSON.stringify(routeJsonLd(route))).toContain(
      '"headline":"AI Agent vs Virtual Assistant: Cost and Capabilities"',
    );
    expect(meta).toContainEqual({
      property: "og:image:alt",
      content: "AI Agent vs Virtual Assistant: Cost and Capabilities",
    });
    expect(meta).toContainEqual({
      property: "article:modified_time",
      content: "2026-07-27",
    });
  });
});
