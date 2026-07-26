import { describe, expect, it } from "vitest";

import { resourceEntries } from "../app/content/resources";

describe("resourceEntries", () => {
  it("provides one ordered collection of articles, guides, and comparisons", () => {
    expect(new Set(resourceEntries.map((entry) => entry.kind))).toEqual(
      new Set(["article", "guide", "comparison"]),
    );
    expect(resourceEntries.map((entry) => entry.date)).toEqual(
      [...resourceEntries]
        .sort((left, right) => right.date.localeCompare(left.date))
        .map((entry) => entry.date),
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
});
