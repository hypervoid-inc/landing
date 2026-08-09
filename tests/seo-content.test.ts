import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { crawlerFiles, sitemapXml } from "../app/lib/generated-content";
import {
  organizationJsonLd,
  routeJsonLd,
  routeMeta,
  softwareApplicationJsonLd,
} from "../app/lib/seo";
import {
  canonicalRoutes,
  hubTags,
  resourcesByTag,
  siteUrl,
} from "../app/lib/route-manifest";
import { resourceEntries } from "../app/content/resources";
import { resourceFaqs } from "../app/content/faqs";
import { authorSameAs, authors, listedAuthors } from "../app/content/authors";

describe("generated discovery content", () => {
  /**
   * Published cards are the source put through the encoder every other card
   * goes through, never the source verbatim. The homepage source is a 16:9
   * hand-made PNG and the published slot is a 1200x630 JPEG, so a copy that
   * skipped the fit would ship the wrong aspect ratio to every social crawler.
   *
   * This checks structure rather than exact bytes because mozjpeg output varies
   * across platforms: the committed file is generated on macOS while CI runs on
   * Linux. The OG-image manifest test (og-images.test.ts) catches staleness
   * from source changes; this just guards against a source slipping unconverted
   * into the published slot.
   */
  it("re-encodes the homepage card rather than copying its source", () => {
    const source = readFileSync(
      new URL("../assets/og/home.png", import.meta.url),
    );
    const jpg = readFileSync(new URL("../public/og/home.jpg", import.meta.url));

    expect(jpg.readUInt16BE(0)).toBe(0xffd8);
    expect(jpg.equals(source)).toBe(false);
  });

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
      ".well-known/api-catalog",
      "openapi.json",
      "docs/api/index.html",
    ]);
  });

  it("includes authors, publication dates, and tags in both feeds", () => {
    expect(crawlerFiles["rss.xml"]).toContain("xmlns:dc=");
    expect(crawlerFiles["rss.xml"]).toContain(
      "<dc:creator>Ankush</dc:creator>",
    );
    expect(crawlerFiles["rss.xml"]).toContain(
      "<category>comparison</category>",
    );
    expect(crawlerFiles["atom.xml"]).toContain("<name>Ankush</name>");
    expect(crawlerFiles["atom.xml"]).toContain(
      "<published>2026-07-26T00:00:00Z</published>",
    );
    expect(crawlerFiles["atom.xml"]).toContain('<category term="comparison"/>');
  });

  it("inlines full resource text into llms-full.txt", () => {
    const full = crawlerFiles["llms-full.txt"];

    // A body sentence that exists only in the MDX, never in a description.
    expect(full).toContain(
      "Zapier, Make, and n8n excel when you know every trigger and action upfront",
    );
    expect(full).toContain("### Frequently asked questions");
    for (const entry of resourceEntries) {
      expect(full).toContain(`## ${entry.title}`);
    }
    // The index stays a link list; only the full variant carries bodies.
    expect(crawlerFiles["llms.txt"]).not.toContain(
      "Zapier, Make, and n8n excel when you know",
    );
    expect(full.length).toBeGreaterThan(crawlerFiles["llms.txt"].length * 5);
  });

  it("explicitly welcomes answer-engine crawlers", () => {
    const robots = crawlerFiles["robots.txt"];

    for (const agent of ["GPTBot", "ClaudeBot", "PerplexityBot", "Bingbot"]) {
      expect(robots).toContain(`User-agent: ${agent}`);
    }
    expect(robots).not.toContain("Disallow:");
  });

  /**
   * Content Signals are per group: a crawler matching a named group never sees
   * the `*` group, so a signal that appears only once reaches nobody it is
   * aimed at.
   */
  it("declares content signals in every user-agent group", () => {
    const robots = crawlerFiles["robots.txt"];
    const groups = robots.match(/^User-agent: .+$/gm) ?? [];
    const signals = robots.match(/^Content-Signal: .+$/gm) ?? [];

    expect(groups.length).toBeGreaterThan(1);
    expect(signals).toHaveLength(groups.length);
    expect(new Set(signals)).toEqual(
      new Set(["Content-Signal: search=yes, ai-input=yes, ai-train=yes"]),
    );
  });

  it("carries the Content Signals policy text the signals refer to", () => {
    const robots = crawlerFiles["robots.txt"];

    expect(robots).toContain(
      "# As a condition of accessing this website, you agree to",
    );
    expect(robots).toContain("# ai-train: training or fine-tuning AI models.");
    expect(robots).toContain("# UNION DIRECTIVE 2019/790 ON COPYRIGHT");
    // The policy block is comments only. A stray uncommented line would be
    // parsed as a directive.
    const policy = robots.slice(0, robots.indexOf("User-agent:"));
    for (const line of policy.split("\n")) {
      expect(line === "" || line.startsWith("#"), line).toBe(true);
    }
  });

  it("gives every sitemap URL a lastmod", () => {
    const sitemap = sitemapXml(canonicalRoutes);

    expect(sitemap.match(/<lastmod>/g)).toHaveLength(canonicalRoutes.length);
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
      '"author":{"@type":"Person","name":"Ankush","url":"https://construct.computer/authors/ankush/","image":"https://construct.computer/authors/ankush.webp","sameAs":["https://x.com/ankushKun_","https://ankush.one","https://linkedin.com/in/ankushKun"]}',
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
      '"author":{"@type":"Person","name":"Nischal","url":"https://construct.computer/authors/nischal/","image":"https://construct.computer/authors/nischal.webp","sameAs":["https://x.com/naik_nischal","https://linkedin.com/in/nischal-naik-a188b0288"]}',
    );

    const comparison = canonicalRoutes.find(
      ({ path }) => path === "/blog/construct-vs-chatgpt",
    )!;
    expect(JSON.stringify(routeJsonLd(comparison))).toContain(
      '"author":{"@type":"Organization","name":"Construct Team","url":"https://construct.computer/authors/construct-team/","image":"https://construct.computer/icon-192.png","sameAs":["https://x.com/use_construct","https://linkedin.com/company/construct-computer","https://discord.gg/puArEQHYN9"]}',
    );

    expect(() => routeJsonLd({ ...route, author: undefined })).toThrow(
      "Missing author for /blog/ai-agent-vs-zapier",
    );
  });

  it("emits FAQPage markup that matches the rendered answers", () => {
    const route = canonicalRoutes.find(
      ({ path }) => path === "/blog/construct-vs-zapier",
    )!;
    const faqPage = routeJsonLd(route).find(
      (node) => node["@type"] === "FAQPage",
    )!;

    expect(faqPage).toBeDefined();
    expect(faqPage.mainEntity).toHaveLength(
      resourceFaqs["construct-vs-zapier"]!.length,
    );
    expect(JSON.stringify(faqPage)).toContain(
      "Is Construct a replacement for Zapier?",
    );

    // Posts without curated FAQs must not emit an empty FAQPage.
    const noFaq = canonicalRoutes.find(({ kind }) => kind === "page")!;
    expect(routeJsonLd(noFaq).some((node) => node["@type"] === "FAQPage")).toBe(
      false,
    );
  });

  it("every FAQ key maps to a real resource", () => {
    const slugs = new Set(resourceEntries.map((entry) => entry.slug));

    for (const slug of Object.keys(resourceFaqs)) {
      expect(slugs).toContain(slug);
    }
  });

  it("gives editorial pages a dateModified and article section", () => {
    const posting = (path: string) => {
      const route = canonicalRoutes.find((entry) => entry.path === path)!;
      return {
        route,
        node: routeJsonLd(route).find(
          (entry) => entry["@type"] === "BlogPosting",
        )!,
      };
    };

    // No `updated` frontmatter, so dateModified must fall back to published.
    const unrevised = posting("/blog/build-internal-tools-with-construct");
    expect(unrevised.route.published).toBe("2026-07-27");
    expect(unrevised.node.dateModified).toBe(unrevised.route.published);

    // Revised post: dateModified tracks the update, not the publish date.
    const revised = posting("/blog/ai-agent-memory");
    expect(revised.route.published).toBe("2026-07-20");
    expect(revised.node.dateModified).toBe("2026-07-27");

    expect(revised.node.inLanguage).toBe("en-US");
    expect(revised.node.articleSection).toBe("Guide");
    expect(posting("/blog/construct-vs-zapier").node.articleSection).toBe(
      "Comparison",
    );
  });

  it("publishes every author profile link as sameAs", () => {
    for (const author of listedAuthors) {
      const sameAs = authorSameAs(author);

      // The X handle must lead, and must not be duplicated by a links entry.
      expect(sameAs[0]).toBe(author.twitter);
      expect(new Set(sameAs).size).toBe(sameAs.length);
      for (const link of author.links) {
        expect(sameAs).toContain(link.href);
        expect(link.href).toMatch(/^https:\/\//);
      }
    }

    expect(authorSameAs(authors.ankush)).toContain("https://ankush.one");
    expect(authorSameAs(authors.nischal)).toContain(
      "https://linkedin.com/in/nischal-naik-a188b0288",
    );
    // Nischal has no personal site, so nothing should be invented for one.
    expect(authors.nischal.links.some(({ label }) => label === "Website")).toBe(
      false,
    );
  });

  it("lists every author on the authors index", () => {
    const route = canonicalRoutes.find(({ path }) => path === "/authors")!;
    const json = JSON.stringify(routeJsonLd(route));

    expect(listedAuthors).toHaveLength(3);
    for (const author of listedAuthors) {
      expect(json).toContain(author.name);
      expect(json).toContain(
        new URL(author.profileUrl, "https://construct.computer").toString(),
      );
      // Every listed author owns a profile page, including the org byline.
      expect(author.profileUrl).toBe(`/authors/${author.id}/`);
      expect(
        canonicalRoutes.some(({ path }) => path === `/authors/${author.id}`),
      ).toBe(true);
    }
  });

  it("builds author and tag hubs with list markup", () => {
    const author = canonicalRoutes.find(
      ({ path }) => path === "/authors/ankush",
    )!;
    const authorJson = routeJsonLd(author);

    expect(authorJson.some((node) => node["@type"] === "ProfilePage")).toBe(
      true,
    );
    expect(authorJson.some((node) => node["@type"] === "Person")).toBe(true);

    // The organizational byline must not masquerade as a Person.
    const team = routeJsonLd(
      canonicalRoutes.find(({ path }) => path === "/authors/construct-team")!,
    );
    const entity = team.find(
      (node) => node["@id"] === `${siteUrl}/authors/construct-team/#team`,
    )!;
    expect(entity["@type"]).toBe("Organization");
    expect(entity).not.toHaveProperty("jobTitle");
    expect(entity).not.toHaveProperty("worksFor");
    expect(team.some((node) => node["@type"] === "Person")).toBe(false);

    // Tag hubs only exist where they are not thin.
    for (const tag of hubTags) {
      expect(resourcesByTag(tag).length).toBeGreaterThanOrEqual(2);
    }
    const tagRoute = canonicalRoutes.find(({ kind }) => kind === "tag")!;
    expect(
      routeJsonLd(tagRoute).some((node) => node["@type"] === "CollectionPage"),
    ).toBe(true);
  });

  it("keeps display titles separate from SEO titles and honest update dates", () => {
    const route = canonicalRoutes.find(
      ({ path }) => path === "/blog/ai-agent-vs-virtual-assistant",
    )!;
    const meta = routeMeta(route);
    const socialTitle = "AI Agent vs Virtual Assistant: Cost and Capabilities";

    expect(route.title).toBe("AI Agent vs Virtual Assistant: Cost Comparison");
    expect(JSON.stringify(routeJsonLd(route))).toContain(
      `"headline":"${socialTitle}"`,
    );
    // Document <title> stays SEO-oriented; social cards match the editorial
    // headline and the text drawn on the OG image.
    expect(meta).toContainEqual({ title: route.title });
    expect(meta).toContainEqual({ property: "og:title", content: socialTitle });
    expect(meta).toContainEqual({
      name: "twitter:title",
      content: socialTitle,
    });
    expect(meta).toContainEqual({
      property: "og:image:alt",
      content: socialTitle,
    });
    expect(meta).toContainEqual({
      property: "article:modified_time",
      content: "2026-07-27",
    });
  });

  it("aligns Cloudflare agents social cards with the editorial title", () => {
    const route = canonicalRoutes.find(
      ({ path }) => path === "/blog/running-ai-agents-on-cloudflare-not-vms",
    )!;
    const meta = routeMeta(route);
    const socialTitle = "All our Agents get computers, we pay for almost none";

    expect(route.title).toBe(
      "Running AI Agents on Cloudflare Without Always-On VMs",
    );
    expect(meta).toContainEqual({ property: "og:title", content: socialTitle });
    expect(meta).toContainEqual({
      name: "twitter:title",
      content: socialTitle,
    });
    expect(meta).toContainEqual({
      property: "og:image:alt",
      content: socialTitle,
    });
    expect(meta).toContainEqual({
      property: "og:description",
      content: route.description,
    });
    expect(route.description).toContain("paying for all of them");
  });
});
