import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { testimonials } from "./testimonials";

describe("testimonials", () => {
  it("has unique ids", () => {
    const ids = testimonials.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(testimonials)("$id links to a public https post", (entry) => {
    const url = new URL(entry.url);
    expect(url.protocol).toBe("https:");
    expect(url.hostname).not.toBe("");
    expect(entry.handle).toMatch(/^@\w+$/);
    expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Number.isNaN(Date.parse(entry.date))).toBe(false);
  });

  it.each(testimonials)("$id quotes the post word for word", (entry) => {
    expect(entry.excerpt.length).toBeGreaterThan(0);
    // Spans must appear in the post, in order, exactly as written.
    let from = 0;
    for (const span of entry.excerpt) {
      expect(span.trim()).not.toBe("");
      const at = entry.fullText.indexOf(span, from);
      expect(at, `"${span}" is not verbatim from the post`).toBeGreaterThan(-1);
      from = at + span.length;
    }
  });

  it.each(testimonials.filter((entry) => entry.avatar))(
    "$id has its avatar in public/",
    (entry) => {
      expect(entry.avatar).toMatch(/^\/assets\//);
      expect(existsSync(`public${entry.avatar}`)).toBe(true);
    },
  );
});
