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
describe("content validation", () => {
  it("validates every published MDX post", () => {
    expect(() => validateContent(blogMetadata)).not.toThrow();
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

  /**
   * House style: no em or en dashes in anything a reader sees. They are checked
   * against rendered copy rather than the whole repo, so prose in code comments
   * and docs is unaffected.
   */
  it("uses no em or en dashes in published copy", () => {
    const offenders: string[] = [];
    const sources = [
      ...readdirSync(blogDirectory)
        .filter((name) => name.endsWith(".mdx"))
        .map((name) => [name, readFileSync(`${blogDirectory}/${name}`, "utf8")]),
      ["landing.ts", JSON.stringify(landingFaq)],
      ["route-manifest", JSON.stringify(canonicalRoutes)],
    ] as const;

    for (const [name, text] of sources) {
      for (const match of text.matchAll(/[^\n]*[\u2013\u2014][^\n]*/g)) {
        offenders.push(`${name}: ${match[0].trim().slice(0, 90)}`);
      }
    }
    expect(offenders).toEqual([]);
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
  it("contains no duplicate public 200 routes", () => {
    const paths = canonicalRoutes.map((route) => route.path);
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
  });
});
