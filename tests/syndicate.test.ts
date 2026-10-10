import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { parsePost, toMarkdown } from "../scripts/syndicate/transform.mjs";

const tags = "utm_source=medium&utm_medium=syndication&utm_campaign=my-post";
const footer = `\n\n*Originally published at [construct.computer](https://construct.computer/blog/my-post/?${tags}).*`;

const convert = (body: string) =>
  toMarkdown(body, {
    slug: "my-post",
    utmSource: "medium",
    titles: { "other-post": "Other post" },
  });

describe("syndication copy", () => {
  it("drops CTAs and MDX comments", () => {
    expect(
      convert(
        'Before.\n\n<BetaCta source="blog_top">Meet Construct</BetaCta>\n\nAfter. {/* TODO: data */}',
      ),
    ).toBe(`Before.\n\nAfter.${footer}`);
  });

  it("tags internal links and leaves files and outside links alone", () => {
    expect(
      convert(
        "[a](/pricing/) [b](https://example.com/x/) ![c](/blog/my-post/chart.webp) [d](#section)",
      ),
    ).toBe(
      `[a](https://construct.computer/pricing/?${tags}) [b](https://example.com/x/) ![c](https://construct.computer/blog/my-post/chart.webp) [d](https://construct.computer/blog/my-post/?${tags}#section)${footer}`,
    );
  });

  it("turns a read-next card into a link only when the post is live", () => {
    expect(convert('<ReadNext slug="other-post" />')).toContain(
      "**Read next:** [Other post](https://construct.computer/blog/other-post/?",
    );
    expect(convert('Text.\n\n<ReadNext slug="unpublished" />')).toBe(
      `Text.${footer}`,
    );
  });

  it("keeps a captioned table as a table under its caption", () => {
    expect(
      convert(
        '<ArticleTable caption="Plans">\n\n| Plan | Price |\n| --- | --- |\n| Lite | $9 |\n\n</ArticleTable>',
      ),
    ).toBe(
      `**Plans**\n\n| Plan | Price |\n| --- | --- |\n| Lite | $9 |${footer}`,
    );
  });

  it("replaces a video figure with its poster linked to the post", () => {
    expect(
      convert(
        '<figure className="my-8">\n  <video\n    poster="/assets/demo.jpg"\n    aria-label="Demo"\n  >\n    <source src="/assets/demo.mp4" type="video/mp4" />\n  </video>\n  <figcaption className="x">A <a href="https://example.com/">demo</a>.</figcaption>\n</figure>',
      ),
    ).toBe(
      `[![Demo](https://construct.computer/assets/demo.jpg)](https://construct.computer/blog/my-post/?${tags})\n\n*A [demo](https://example.com/).*${footer}`,
    );
  });

  it("leaves code blocks untouched", () => {
    const body = "```md\n<BetaCta>x</BetaCta> [a](/pricing/)\n```";
    expect(convert(body)).toBe(`${body}${footer}`);
  });

  it("refuses markup it cannot convert", () => {
    expect(() => convert("<PricingGrid />")).toThrow(/PricingGrid/);
    expect(() => convert("Total: {plans.length}")).toThrow(/plans\.length/);
  });

  // A new component in a post has to be taught to the converter before that
  // post can be exported; this fails in `pnpm check` instead of at post time.
  it("converts every post in the library", () => {
    const directory = fileURLToPath(
      new URL("../app/content/blog/", import.meta.url),
    );
    const posts = readdirSync(directory)
      .filter((name) => name.endsWith(".mdx"))
      .map((name) => ({
        slug: name.slice(0, -4),
        ...parsePost(readFileSync(`${directory}${name}`, "utf8")),
      }));
    const titles = Object.fromEntries(
      posts.map(({ slug, frontmatter }) => [slug, String(frontmatter.title)]),
    );
    for (const { slug, body } of posts) {
      const markdown = toMarkdown(body, { slug, utmSource: "medium", titles });
      expect(markdown).not.toMatch(/<BetaCta|className=/);
    }
  });
});
