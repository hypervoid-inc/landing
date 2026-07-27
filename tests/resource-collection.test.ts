import { describe, expect, it } from "vitest";

import { resourceEntries } from "../app/content/resources";

describe("resourceEntries", () => {
  it("provides one ordered collection of articles, guides, and comparisons", () => {
    expect(new Set(resourceEntries.map((entry) => entry.kind))).toEqual(
      new Set(["article", "guide", "comparison"]),
    );
    expect(resourceEntries.map((entry) => entry.published)).toEqual(
      [...resourceEntries]
        .sort((left, right) => right.published.localeCompare(left.published))
        .map((entry) => entry.published),
    );
  });

  it("uses unique short slugs suitable for /blog/ URLs", () => {
    const slugs = resourceEntries.map((entry) => entry.slug);

    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs.every((slug) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))).toBe(
      true,
    );
    expect(slugs).toContain("construct-vs-chatgpt");
    expect(slugs).toContain("ai-employee");
  });

  it("resolves a complete author profile for every resource", () => {
    for (const entry of resourceEntries) {
      const expected = {
        article: ["ankush", "Ankush", "@ankushKun_"],
        guide: ["nischal", "Nischal", "@naik_nischal"],
        comparison: ["construct-team", "Construct Team", "@use_construct"],
      }[entry.kind];
      expect(entry.author).toEqual(
        expect.objectContaining({
          id: expected[0],
          name: expected[1],
          twitterHandle: expected[2],
        }),
      );
    }
  });

  it("keeps MDX tags on article resources", () => {
    const article = resourceEntries.find(
      ({ slug }) => slug === "ai-agent-vs-zapier",
    );

    expect(article).toHaveProperty("tags", [
      "comparison",
      "zapier",
      "ai-agent",
      "automation",
    ]);
  });

  it("provides dates and tags for every resource", () => {
    for (const entry of resourceEntries) {
      expect(entry.tags.length).toBeGreaterThan(0);
      if (entry.updated) expect(entry.updated > entry.published).toBe(true);
    }
  });
});
