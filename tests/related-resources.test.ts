import { describe, expect, it } from "vitest";

import { getRelatedResources } from "../app/content/related";
import { resourceEntries } from "../app/content/resources";

const slugs = resourceEntries.map((entry) => entry.slug);

describe("related resources", () => {
  it("never offers a post back to itself", () => {
    for (const slug of slugs) {
      const related = getRelatedResources(slug);
      expect(related.map((entry) => entry.slug)).not.toContain(slug);
    }
  });

  it("fills the grid for every post rather than returning a short row", () => {
    for (const slug of slugs) {
      expect(getRelatedResources(slug)).toHaveLength(4);
    }
  });

  it("honours the limit the rail asks for", () => {
    expect(getRelatedResources(slugs[0]!, 3)).toHaveLength(3);
  });

  it("returns nothing for an unknown slug", () => {
    expect(getRelatedResources("not-a-post")).toEqual([]);
  });

  /**
   * The whole point of weighting by rarity. `ai-agent` and `ai-employee` sit on
   * more than half the library, so an unweighted count would rank a post that
   * shares only those above one that shares a tag unique to the pair.
   */
  it("ranks a rare shared tag above a common one", () => {
    const related = getRelatedResources("ai-agent-vs-zapier", 4).map(
      (entry) => entry.slug,
    );
    expect(related).toContain("construct-vs-zapier");
    const zapierRank = related.indexOf("construct-vs-zapier");
    expect(zapierRank).toBeLessThan(3);
  });

  it("puts the half-life post next to the reliability-adjacent writing", () => {
    const related = getRelatedResources("agent-task-half-life", 4).map(
      (entry) => entry.slug,
    );
    // Shares `workflow-automation` (3 posts) and `product` (4), both rarer than
    // the near-universal `ai-agent`.
    expect(related).toContain("ai-workflow-automation");
  });

  it("is deterministic across calls, so prerendered pages stay stable", () => {
    for (const slug of slugs) {
      expect(getRelatedResources(slug)).toEqual(getRelatedResources(slug));
    }
  });

  it("only ever points at published, non-draft resources", () => {
    const published = new Set(slugs);
    for (const slug of slugs) {
      for (const entry of getRelatedResources(slug)) {
        expect(published.has(entry.slug)).toBe(true);
      }
    }
  });
});
