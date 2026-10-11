import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ArticleVideo } from "../app/components/content/article-video";
import { mdxComponents } from "../app/components/content/mdx-components";
import {
  nextSort,
  numberIn,
  readTable,
  sortRows,
} from "../app/components/content/sortable-table";
import { APP_PROMPT_MAX_CHARS, getAppUrl } from "../app/platform/env";
import { remarkHeadings } from "../scripts/remark-headings.mjs";
import { promptsToQuotes } from "../scripts/syndicate/transform.mjs";

/** A Markdown table as MDX hands it to `Table`: thead and tbody of th/td. */
function table(head: string[], rows: string[][]) {
  const th = mdxComponents.th as never;
  const td = mdxComponents.td as never;
  return [
    createElement(
      "thead",
      { key: "head" },
      createElement(
        "tr",
        null,
        head.map((cell, index) => createElement(th, { key: index }, cell)),
      ),
    ),
    createElement(
      "tbody",
      { key: "body" },
      rows.map((row, index) =>
        createElement(
          "tr",
          { key: index },
          row.map((cell, column) => createElement(td, { key: column }, cell)),
        ),
      ),
    ),
  ];
}

describe("a post's table of contents", () => {
  it("gives every section heading a unique, URL-safe id and exports them", () => {
    const heading = (value: string) => ({
      type: "heading",
      depth: 2,
      children: [{ type: "text", value }],
    });
    const tree = {
      type: "root",
      children: [
        heading("Why choose Construct?"),
        {
          type: "paragraph",
          children: [{ type: "text", value: "One two three." }],
        },
        heading("Why choose Construct?"),
        heading("Café pricing, 2026"),
      ],
    };
    remarkHeadings()(tree);
    const ids = tree.children
      .filter((node) => node.type === "heading")
      .map(
        (node) =>
          (node as { data?: { hProperties?: { id?: string } } }).data
            ?.hProperties?.id,
      );
    expect(ids).toEqual([
      "why-choose-construct",
      "why-choose-construct-2",
      "cafe-pricing-2026",
    ]);
    const esm = JSON.stringify(tree.children.at(-1));
    expect(esm).toContain('"name":"headings"');
    expect(esm).toContain('"name":"readingMinutes"');
  });

  it("puts the id on the rendered heading the contents link to", () => {
    const h2 = mdxComponents.h2 as never;
    const html = renderToString(createElement(h2, { id: "why" }, "Why?"));
    expect(html).toContain('id="why"');
  });
});

describe("sortable tables", () => {
  it("reads the first number in a cell", () => {
    expect(numberIn("$1,299.50 a month")).toBe(1299.5);
    expect(numberIn("Free")).toBeNull();
  });

  it("offers sorting for a price list, not for attributes by product", () => {
    const prices = readTable(
      table(
        ["Tool", "Price"],
        [
          ["Lindy", "$29.99"],
          ["Construct", "$9"],
          ["Muse", "Free"],
          ["Viktor", "$50"],
          ["Claude", "$20"],
        ],
      ),
    );
    expect(prices.sortable).toBe(true);
    const order = sortRows(prices, { column: 1, direction: "ascending" }).map(
      (row) => prices.rows.indexOf(row),
    );
    // Cheapest first, and the cell with no number last.
    expect(order).toEqual([1, 4, 0, 3, 2]);

    const attributes = readTable(
      table(
        ["", "Construct", "Lindy"],
        [
          ["Price", "$9 a month", "$29.99 a user"],
          ["Memory", "Files you can fix", "Not documented"],
          ["Seats", "None", "Per user"],
          ["Channels", "Slack, email", "Slack"],
        ],
      ),
    );
    expect(attributes.sortable).toBe(false);
  });

  it("cycles ascending, descending, then the author's order", () => {
    const first = nextSort(null, 2);
    expect(first).toEqual({ column: 2, direction: "ascending" });
    const second = nextSort(first, 2);
    expect(second).toEqual({ column: 2, direction: "descending" });
    expect(nextSort(second, 2)).toBeNull();
  });
});

describe("prompt blocks outside the site", () => {
  it("become Markdown quotes, with the label above", () => {
    expect(
      promptsToQuotes(
        '<Prompt label="Forward this">\n\nFirst line.\n\nSecond line.\n\n</Prompt>',
      ),
    ).toBe("*Forward this:*\n\n> First line.\n>\n> Second line.");
  });
});

describe("videos in posts", () => {
  const render = (muted: boolean) =>
    renderToString(
      createElement(
        ArticleVideo,
        { muted, poster: "/p.jpg", "aria-label": "Demo" },
        createElement("source", { src: "/d.mp4", type: "video/mp4" }),
        createElement("track", { kind: "captions", src: "/d.vtt" }),
      ),
    );

  it("loops, plays inline, and draws its own controls instead of the browser's", () => {
    const html = render(true);
    expect(html).toContain("loop");
    expect(html.toLowerCase()).toContain("playsinline");
    expect(html).not.toMatch(/<video[^>]*\scontrols/);
    expect(html).toContain('aria-label="Show captions"');
    expect(html).toContain('aria-label="Full screen"');
    expect(html).not.toContain("Turn sound on");
  });

  it("offers sound only for a video authored without muted", () => {
    expect(render(false)).toContain('aria-label="Turn sound on"');
  });
});

describe("prompt links into the app", () => {
  it("carries the prompt in ?prompt=, encoded and capped", () => {
    const url = new URL(getAppUrl("Draft a reply & don't send it"));
    expect(url.pathname).toBe("/");
    expect(url.searchParams.get("prompt")).toBe(
      "Draft a reply & don't send it",
    );
    const long = new URL(getAppUrl("x".repeat(APP_PROMPT_MAX_CHARS + 10)));
    expect(long.searchParams.get("prompt")).toHaveLength(APP_PROMPT_MAX_CHARS);
    expect(getAppUrl("  ")).not.toContain("prompt");
  });
});
