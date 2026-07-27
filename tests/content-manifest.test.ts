import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { blogFrontmatterSchema, validateContent } from "../app/content/schema";
import { blogMetadata } from "../app/content/blog/metadata.generated";
import { landingFaq } from "../app/content/landing";
import { authors } from "../app/content/authors";
import { canonicalRoutes } from "../app/lib/route-manifest";

const blogDirectory = fileURLToPath(
  new URL("../app/content/blog/", import.meta.url),
);
const expectedSlugs = [
  "ai-agent-memory",
  "ai-agent-vs-virtual-assistant",
  "ai-agent-vs-zapier",
  "ai-employee",
  "ai-workflow-automation",
  "build-internal-tools-with-construct",
  "chat-assistants-vs-ai-employees",
  "construct-vs-chatgpt",
  "construct-vs-coding-agents",
  "construct-vs-copilot",
  "construct-vs-diy",
  "construct-vs-zapier",
  "what-is-an-ai-employee",
];

const expectedPaths = [
  "/",
  "/about",
  "/careers",
  "/editorial-policy",
  "/support",
  "/privacy",
  "/terms",
  "/blog",
  "/blog/what-is-an-ai-employee",
  "/blog/chat-assistants-vs-ai-employees",
  "/blog/build-internal-tools-with-construct",
  "/blog/ai-agent-vs-virtual-assistant",
  "/blog/ai-agent-vs-zapier",
  "/blog/ai-employee",
  "/blog/ai-workflow-automation",
  "/blog/ai-agent-memory",
  "/blog/construct-vs-chatgpt",
  "/blog/construct-vs-copilot",
  "/blog/construct-vs-zapier",
  "/blog/construct-vs-coding-agents",
  "/blog/construct-vs-diy",
  "/authors",
  "/authors/ankush",
  "/authors/nischal",
  "/authors/construct-team",
  // Tag hubs are generated only for tags with two or more resources, so this
  // list changes when tag usage crosses that threshold.
  "/blog/tag/ai-agent",
  "/blog/tag/ai-employee",
  "/blog/tag/chatgpt",
  "/blog/tag/comparison",
  "/blog/tag/product",
  "/blog/tag/workflow-automation",
  "/blog/tag/zapier",
];

describe("content validation", () => {
  it("validates every published MDX post", () => {
    expect(() => validateContent(blogMetadata)).not.toThrow();
    expect(blogMetadata.map((post) => post.slug).sort()).toEqual(expectedSlugs);
  });

  it("rejects incomplete and impossible post metadata", () => {
    expect(
      blogFrontmatterSchema.safeParse({
        title: "Incomplete",
        published: "2026-02-31",
      }).success,
    ).toBe(false);
  });

  it("accepts only registered author IDs", () => {
    const post: Record<string, unknown> = { ...blogMetadata[0]! };
    delete post.slug;

    expect(blogFrontmatterSchema.safeParse(post).success).toBe(true);
    expect(
      blogFrontmatterSchema.safeParse({ ...post, author: "unknown-author" })
        .success,
    ).toBe(false);
    expect(
      blogMetadata.every(
        ({ author, kind }) =>
          author ===
          { article: "ankush", guide: "nischal", comparison: "construct-team" }[
            kind
          ],
      ),
    ).toBe(true);
  });

  it("keeps complete profiles for every editorial author", () => {
    expect(Object.keys(authors)).toEqual([
      "construct-team",
      "ankush",
      "nischal",
    ]);
    expect(authors.ankush).toEqual(
      expect.objectContaining({
        name: "Ankush",
        image: "/authors/ankush.webp",
        twitter: "https://x.com/ankushKun_",
        twitterHandle: "@ankushKun_",
        schemaType: "Person",
      }),
    );
    expect(authors.nischal).toEqual(
      expect.objectContaining({
        name: "Nischal",
        image: "/authors/nischal.webp",
        twitter: "https://x.com/naik_nischal",
        twitterHandle: "@naik_nischal",
        schemaType: "Person",
      }),
    );
  });

  it("uses current qualified product language in structured editorial content", () => {
    const content = `${JSON.stringify(landingFaq)} ${readdirSync(blogDirectory)
      .filter((name) => name.endsWith(".mdx"))
      .map((name) => readFileSync(`${blogDirectory}/${name}`, "utf8"))
      .join(" ")}`;

    expect(content).toContain("live integration catalog");
    expect(content).toContain("Current workflows are linear");
    expect(content).not.toMatch(/1,000\+|more than 1,000/i);
    expect(content).not.toContain("browser sessions");
  });

  it("keeps unified editorial metadata complete", () => {
    expect(blogMetadata.map(({ kind }) => kind)).toEqual(
      expect.arrayContaining(["article", "guide", "comparison"]),
    );
    for (const post of blogMetadata) {
      expect(post.published).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(post.tags.length).toBeGreaterThan(0);
      expect(new Set(post.tags).size).toBe(post.tags.length);
      if (post.updated) expect(post.updated > post.published).toBe(true);
    }
  });

  it("keeps MDX bodies complete and internal links canonical", () => {
    const canonicalPaths = new Set(
      canonicalRoutes.map(({ canonical }) => new URL(canonical).pathname),
    );
    for (const post of blogMetadata) {
      const source = readFileSync(`${blogDirectory}/${post.slug}.mdx`, "utf8");
      const body = source.replace(/^---\n[\s\S]*?\n---/, "").trim();

      expect(body.split(/\s+/).length, post.slug).toBeGreaterThan(80);
      expect(body, post.slug).toContain("## ");
      if (post.kind !== "article") {
        expect(body, post.slug).toContain("## Related resources");
      }
      if (post.kind === "comparison") {
        expect(body, post.slug).toContain("## Methodology");
        expect(body, post.slug).toContain("## Sources");
        expect(body, post.slug).toMatch(/\|[^\n]+\|/);
      }
      for (const [, href] of body.matchAll(/\]\((\/[^)]+)\)/g)) {
        if (!href) continue;
        expect(href, `${post.slug}: ${href}`).toMatch(/\/$/);
        expect(canonicalPaths.has(href), `${post.slug}: ${href}`).toBe(true);
      }
    }
  });
});

describe("canonical route manifest", () => {
  it("contains every public 200 route exactly once", () => {
    const paths = canonicalRoutes.map((route) => route.path);
    expect([...paths].sort()).toEqual([...expectedPaths].sort());
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("preserves trailing-slash canonicals", () => {
    for (const route of canonicalRoutes) {
      expect(route.canonical).toBe(
        route.path === "/"
          ? "https://construct.computer/"
          : `https://construct.computer${route.path}/`,
      );
    }
  });

  it("keeps every editorial resource under the singular blog namespace", () => {
    const editorialRoutes = canonicalRoutes.filter((route) =>
      ["blog-post", "guide", "comparison"].includes(route.kind),
    );

    expect(
      editorialRoutes.every((route) => route.path.startsWith("/blog/")),
    ).toBe(true);
    expect(canonicalRoutes.some((route) => route.path.startsWith("/vs"))).toBe(
      false,
    );
    expect(
      editorialRoutes.map(({ path }) => path.slice("/blog/".length)).sort(),
    ).toEqual(expectedSlugs);
  });
});
