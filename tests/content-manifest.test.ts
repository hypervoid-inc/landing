import { describe, expect, it } from "vitest";

import { blogFrontmatterSchema, validateContent } from "../app/content/schema";
import { blogMetadata } from "../app/content/blog/metadata.generated";
import { comparisonPages } from "../app/content/comparisons";
import { guidePages } from "../app/content/guides";
import { landingFaq } from "../app/content/landing";
import { canonicalRoutes } from "../app/lib/route-manifest";

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
];

describe("content validation", () => {
  it("validates every published MDX post", () => {
    expect(() => validateContent(blogMetadata)).not.toThrow();
    expect(blogMetadata.map((post) => post.slug).sort()).toEqual(
      [
        "ai-agent-vs-virtual-assistant",
        "ai-agent-vs-zapier",
        "chat-assistants-vs-ai-employees",
        "what-is-an-ai-employee",
      ].sort(),
    );
  });

  it("rejects incomplete and impossible post metadata", () => {
    expect(
      blogFrontmatterSchema.safeParse({
        title: "Incomplete",
        date: "2026-02-31",
      }).success,
    ).toBe(false);
  });

  it("uses current qualified product language in structured editorial content", () => {
    const content = JSON.stringify({ comparisonPages, guidePages, landingFaq });

    expect(content).toContain("live integration catalog");
    expect(content).toContain("Current workflows are linear");
    expect(content).not.toMatch(/1,000\+|more than 1,000/i);
    expect(content).not.toContain("browser sessions");
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
  });
});
