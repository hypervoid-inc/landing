import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  matchesQuery,
  SUB_PROCESSOR_GROUPS,
  SUB_PROCESSORS,
} from "./sub-processors";

const byName = (name: string) =>
  SUB_PROCESSORS.find((processor) => processor.name === name)!;

describe("sub-processors", () => {
  it("ships a logo tile for every vendor", () => {
    for (const processor of SUB_PROCESSORS) {
      expect(
        existsSync(`public/assets/sub-processors/${processor.logo}.webp`),
        processor.name,
      ).toBe(true);
    }
  });

  it("files every vendor under a known group, once", () => {
    const groups = new Set(SUB_PROCESSOR_GROUPS.map((group) => group.id));
    const names = SUB_PROCESSORS.map((processor) => processor.name);
    expect(new Set(names).size).toBe(names.length);
    for (const processor of SUB_PROCESSORS) {
      expect(groups.has(processor.group), processor.name).toBe(true);
      expect(processor.privacy).toMatch(/^https:\/\//);
    }
  });

  it("matches every term across name, entity, role, description and region", () => {
    expect(matchesQuery(byName("PostHog"), "")).toBe(true);
    expect(matchesQuery(byName("PostHog"), "  eu  analytics ")).toBe(true);
    expect(matchesQuery(byName("Sentry"), "functional software")).toBe(true);
    expect(matchesQuery(byName("Exa"), "web search")).toBe(true);
    expect(matchesQuery(byName("Exa"), "web billing")).toBe(false);
    expect(matchesQuery(byName("Cloudflare Workers AI"), "clef voice")).toBe(
      true,
    );
  });
});
