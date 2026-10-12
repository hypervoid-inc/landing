import { createElement, type FunctionComponent } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { blogMetadata } from "../app/content/blog/metadata.generated";
import { PITCH_MAX_LENGTH, blogFrontmatterSchema } from "../app/content/schema";
import { AuthProvider } from "../app/features/auth/auth-provider";
import {
  COMPARISON_PITCH,
  PostPitch,
  pitchedMdxComponents,
  postPitch,
} from "../app/components/content/post-pitch";

/** Under `AuthProvider`, as on the site: `StartLink` reads the sign-in state. */
function render<Props extends object>(
  component: FunctionComponent<Props>,
  props: Props,
) {
  return renderToString(
    createElement(AuthProvider, null, createElement(component, props)),
  );
}

describe("the pitch a post opens on", () => {
  it("gives every live and scheduled comparison post a pitch of its own", () => {
    const comparisons = blogMetadata.filter(
      (post) => post.kind === "comparison" && !post.draft,
    );
    expect(comparisons.length).toBeGreaterThan(0);
    for (const post of comparisons) {
      expect(post.pitch, post.slug).toBeTruthy();
    }
  });

  it("keeps every pitch to one plain sentence", () => {
    for (const pitch of [
      COMPARISON_PITCH,
      ...blogMetadata.flatMap((post) => post.pitch ?? []),
    ]) {
      expect(pitch.length, pitch).toBeLessThanOrEqual(PITCH_MAX_LENGTH);
      expect(pitch, pitch).toMatch(/^[A-Z][^\n]*\.$/);
      expect(pitch.slice(0, -1), pitch).not.toMatch(/[.!?]\s/);
      expect(pitch, pitch).not.toMatch(/[\u2013\u2014]/);
    }
  });

  it("rejects a pitch longer than one line allows", () => {
    const post: Record<string, unknown> = { ...blogMetadata[0]! };
    delete post.slug;
    expect(
      blogFrontmatterSchema.safeParse({
        ...post,
        pitch: "x".repeat(PITCH_MAX_LENGTH + 1),
      }).success,
    ).toBe(false);
  });

  it("falls back for comparisons and leaves other posts alone", () => {
    expect(postPitch({ kind: "comparison" })).toBe(COMPARISON_PITCH);
    expect(postPitch({ kind: "comparison", pitch: "Own words." })).toBe(
      "Own words.",
    );
    expect(postPitch({ kind: "article" })).toBeUndefined();
    expect(postPitch({ kind: "guide", pitch: "Own words." })).toBe(
      "Own words.",
    );
  });

  it("renders every comparison post's top CTA as a product link, not a form", () => {
    for (const post of blogMetadata.filter(
      ({ kind }) => kind === "comparison",
    )) {
      const pitch = postPitch(post)!;
      const html = render(PostPitch, { pitch });
      expect(html, post.slug).toContain(
        pitch.replaceAll("&", "&amp;").replaceAll("'", "&#x27;"),
      );
      expect(html, post.slug).toMatch(
        /<a [^>]*>[\s\S]*Start with Construct for \$9/,
      );
      expect(html, post.slug).not.toMatch(/<form|<input/);
    }
  });

  it("drops the authored top CTA once the pitch has made the ask", () => {
    const BodyCta = pitchedMdxComponents.BetaCta;
    expect(render(BodyCta, { source: "blog_top", children: "Top" })).toBe("");
    expect(
      render(BodyCta, { source: "blog_inline_1", children: "Inline" }),
    ).toContain("Inline");
  });
});
