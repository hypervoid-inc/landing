import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  buildCopy,
  devtoTags,
  eligibility,
  parsePost,
  platforms,
  tablesToLists,
  toMarkdown,
  toTeaser,
  type Platform,
} from "../scripts/syndicate/transform.mjs";

const convert = (body: string, platform: Platform = "devto") =>
  toMarkdown(body, {
    slug: "my-post",
    platform,
    titles: { "other-post": "Other post" },
  });

describe("syndication copy", () => {
  it("drops CTAs and MDX comments", () => {
    expect(
      convert(
        'Before.\n\n<BetaCta source="blog_top">Meet Construct</BetaCta>\n\nAfter. {/* TODO: data */}',
      ),
    ).toBe("Before.\n\nAfter.");
  });

  it("tags internal links and leaves files and outside links alone", () => {
    const tags = "utm_source=devto&utm_medium=syndication&utm_campaign=my-post";
    expect(
      convert(
        "[a](/pricing/) [b](https://example.com/x/) ![c](/blog/my-post/chart.webp) [d](#section)",
      ),
    ).toBe(
      `[a](https://construct.computer/pricing/?${tags}) [b](https://example.com/x/) ![c](https://construct.computer/blog/my-post/chart.webp) [d](https://construct.computer/blog/my-post/?${tags}#section)`,
    );
  });

  it("turns a read-next card into a link only when the post is live", () => {
    expect(convert('<ReadNext slug="other-post" />')).toContain(
      "**Read next:** [Other post](https://construct.computer/blog/other-post/?",
    );
    expect(convert('Text.\n\n<ReadNext slug="unpublished" />')).toBe("Text.");
  });

  it("keeps a captioned table where tables work and lists it where not", () => {
    const body =
      '<ArticleTable caption="Plans">\n\n| Plan | Price | Steps |\n| --- | --- | --- |\n| Lite | $9 | 50 |\n\n</ArticleTable>';
    expect(convert(body)).toBe(
      "**Plans**\n\n| Plan | Price | Steps |\n| --- | --- | --- |\n| Lite | $9 | 50 |",
    );
    expect(convert(body, "medium")).toBe(
      "**Plans**\n\n**Lite**\n\n- Price: $9\n- Steps: 50",
    );
  });

  it("lists a two-column table as key and value", () => {
    expect(
      tablesToLists("| Plan | Price |\n| --- | --- |\n| Lite | $9 |\n"),
    ).toBe("- **Lite:** $9\n");
  });

  it("replaces a video figure with its poster linked to the post", () => {
    expect(
      convert(
        '<figure className="my-8">\n  <video\n    poster="/assets/demo.jpg"\n    aria-label="Demo"\n  >\n    <source src="/assets/demo.mp4" type="video/mp4" />\n  </video>\n  <figcaption className="x">A <a href="https://example.com/">demo</a>.</figcaption>\n</figure>',
      ),
    ).toBe(
      "[![Demo](https://construct.computer/assets/demo.jpg)](https://construct.computer/blog/my-post/?utm_source=devto&utm_medium=syndication&utm_campaign=my-post)\n\n*A [demo](https://example.com/).*",
    );
  });

  it("leaves code blocks untouched", () => {
    const body = "```md\n<BetaCta>x</BetaCta> [a](/pricing/)\n```";
    expect(convert(body)).toBe(body);
  });

  it("refuses markup it cannot convert", () => {
    expect(() => convert("<PricingGrid />")).toThrow(/PricingGrid/);
    expect(() => convert("Total: {plans.length}")).toThrow(/plans\.length/);
  });

  it("cuts a teaser at the first section and lists the rest", () => {
    expect(
      toTeaser(
        "Intro.\n\n## First\n\nBody.\n\n## Sources\n\n- x",
        "https://construct.computer/blog/my-post/",
      ),
    ).toBe(
      "Intro.\n\n**In the full post:**\n\n- First\n\n**[Read the full post on construct.computer](https://construct.computer/blog/my-post/)**",
    );
  });

  it("fits tags to dev.to's four alphanumeric tags", () => {
    expect(
      devtoTags(["ai-agent", "reliability", "workflow-automation", "product"]),
    ).toEqual(["ai", "aiagent", "reliability", "workflowautomation"]);
  });

  it("gates on live, kind, and age", () => {
    const post = { draft: false, published: "2026-10-01", kind: "article" };
    expect(eligibility(post, "2026-10-04")).toEqual({ ok: true });
    expect(eligibility(post, "2026-10-03")).toMatchObject({ hard: false });
    expect(eligibility(post, "2026-09-30")).toMatchObject({ hard: true });
    expect(eligibility({ ...post, draft: true }, "2026-10-04")).toMatchObject({
      hard: true,
    });
    expect(
      eligibility({ ...post, kind: "comparison" }, "2026-10-04"),
    ).toMatchObject({ hard: false });
  });

  // A new component in a post has to be taught to the converter before that
  // post can be syndicated; this fails in `pnpm check` instead of at post time.
  it("converts every post in the library for every platform", () => {
    const directory = fileURLToPath(
      new URL("../app/content/blog/", import.meta.url),
    );
    const posts = readdirSync(directory)
      .filter((name) => name.endsWith(".mdx"))
      .map((name) => ({
        slug: name.slice(0, -4),
        source: readFileSync(`${directory}${name}`, "utf8"),
      }));
    const titles = Object.fromEntries(
      posts.map(({ slug, source }) => [
        slug,
        String(parsePost(source).frontmatter.title),
      ]),
    );
    for (const { slug, source } of posts) {
      for (const platform of Object.keys(platforms) as Platform[]) {
        const copy = buildCopy({ slug, source, platform, titles });
        expect(copy.markdown).toContain(
          `https://construct.computer/blog/${slug}/?utm_source=${platform}`,
        );
        expect(copy.content).not.toMatch(/<BetaCta|className=/);
      }
    }
  });
});
