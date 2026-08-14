import { describe, expect, it } from "vitest";

import { workflowDemos } from "./landing";
import { resourceEntries } from "./resources";
import { getUseCase, relatedUseCasePosts, useCases } from "./use-cases";

const slugs = [
  "workflows",
  "internal-tools",
  "scheduling",
  "team-workspaces",
  "memory",
  "channels",
  "research",
] as const;

describe("use case catalog", () => {
  it("covers every published workflow demo as a dedicated page", () => {
    expect(useCases.map((entry) => entry.slug)).toEqual([...slugs]);
    expect(useCases.map((entry) => entry.slug).sort()).toEqual(
      [...workflowDemos.map((demo) => demo.id)].sort(),
    );
  });

  it("looks up a page by slug and ignores unknown ones", () => {
    expect(getUseCase("memory")?.navLabel).toBe("Memory");
    expect(getUseCase("healthcare")).toBeUndefined();
  });

  it("keeps related posts inside the published library", () => {
    const published = new Set(resourceEntries.map((entry) => entry.slug));
    for (const entry of useCases) {
      expect(entry.relatedSlugs).toHaveLength(2);
      expect(new Set(entry.relatedSlugs).size).toBe(2);
      for (const slug of entry.relatedSlugs) {
        expect(published, `${entry.slug} → ${slug}`).toContain(slug);
      }
      expect(relatedUseCasePosts(entry)).toHaveLength(2);
    }
  });

  it("reuses the matching demo video instead of inventing media", () => {
    for (const entry of useCases) {
      const demo = workflowDemos.find((item) => item.id === entry.slug);
      expect(demo, entry.slug).toBeDefined();
      expect(entry.video).toBe(demo!.video);
      expect(entry.poster).toBe(demo!.poster);
    }
  });

  it("writes a unique argument per page, not a restated homepage card", () => {
    const titles = useCases.map((entry) => entry.title);
    const ledes = useCases.map((entry) => entry.lede);
    expect(new Set(titles).size).toBe(useCases.length);
    expect(new Set(ledes).size).toBe(useCases.length);
    for (const entry of useCases) {
      expect(entry.lede.split(/\s+/).length, entry.slug).toBeGreaterThan(40);
      expect(entry.problems, entry.slug).toHaveLength(3);
      expect(entry.features, entry.slug).toHaveLength(4);
      expect(entry.why, entry.slug).toHaveLength(3);
      for (const demo of workflowDemos) {
        if (demo.id !== entry.slug) continue;
        expect(entry.lede, entry.slug).not.toBe(demo.description);
        expect(entry.title, entry.slug).not.toContain(demo.accent);
      }
    }
  });
});
