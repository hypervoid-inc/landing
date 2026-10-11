import { existsSync } from "node:fs";
import process from "node:process";
import sharp from "sharp";
import { afterAll, describe, expect, it } from "vitest";

import { blogMetadata } from "../app/content/blog/metadata.generated";
import { figureKind, ogCards, type Figure } from "../app/content/og-cards";
import { ogPosters } from "../app/content/og-poster";
import { ogName } from "../app/lib/route-manifest";
import { closeRenderer, renderOgCard } from "../scripts/og/card/index.mjs";
import { logoFor } from "../scripts/og/card/logos.mjs";

/**
 * A hand-made card in `assets/og/` (the Clef vs Jev data card, the Zen Mode
 * film frame) is one of a kind by construction, so the rotation counts each
 * as a figure of its own.
 */
function handMade(post: { slug: string; image?: string }) {
  const stem = post.image
    ? post.image.replace(/\.[^.]+$/, "")
    : ogName(`/blog/${post.slug}`);
  return [".png", ".jpg", ".jpeg", ".webp"].some((extension) =>
    existsSync(`assets/og/${stem}${extension}`),
  );
}

/** Every product a figure names, which must then show that product's logo. */
function toolsIn(figure: Figure): string[] {
  switch (figure.kind) {
    case "versus":
      return [figure.rival];
    case "matrix":
      return figure.rows.map((row) => row.name);
    case "bars":
      return figure.rows.flatMap((row) =>
        row.icon ? [] : [row.brand ?? row.name],
      );
    case "plans":
      return figure.items.flatMap((item) =>
        item.icon ? [] : [item.brand ?? item.name],
      );
    case "flow":
      return figure.nodes.flatMap((node) => (node.name ? [node.name] : []));
    case "contrast":
      return [figure.left.name, figure.right.name].filter(
        (name): name is string => Boolean(name),
      );
    case "message":
      return [figure.app, ...(figure.sources ?? [])];
    case "chat":
      return figure.app ? [figure.app] : [];
    default:
      return [];
  }
}

describe("social cards", () => {
  it("never share an OG name with a hand-made card", () => {
    expect(Object.keys(ogCards).filter((name) => ogPosters[name])).toEqual([]);
  });

  /** A comparison that shows a grey initial instead of the rival's mark is the card the owner asked never to ship. */
  it("show a real logo for every product they name", () => {
    const missing = Object.entries(ogCards).flatMap(([name, card]) =>
      toolsIn(card.figure)
        .filter((tool) => tool !== "Construct" && !logoFor(tool))
        .map((tool) => `${name}: ${tool}`),
    );
    expect(missing, "add the logo to scripts/og/card/logos.mjs").toEqual([]);
  });

  it("keep headlines short, with at most one highlighted phrase", () => {
    const long = Object.entries(ogCards).filter(([, card]) => {
      const words = card.title.replaceAll("*", "").split(/\s+/).length;
      const marks = card.title.split("*").length - 1;
      return words > 9 || marks > 2 || marks % 2 === 1;
    });
    expect(long.map(([name, card]) => `${name}: ${card.title}`)).toEqual([]);
  });

  it("never repeat another card's figure", () => {
    const seen = new Map<string, string>();
    const repeats: string[] = [];
    for (const [name, card] of Object.entries(ogCards)) {
      if (card.figure.kind === "mosaic") continue;
      const key = JSON.stringify(card.figure);
      if (seen.has(key)) repeats.push(`${seen.get(key)} and ${name}`);
      seen.set(key, name);
    }
    expect(repeats).toEqual([]);
  });

  it("use no em or en dashes", () => {
    const dashed = Object.entries(ogCards).filter(([, card]) =>
      /[–—]/.test(JSON.stringify(card)),
    );
    expect(dashed.map(([name]) => name)).toEqual([]);
  });
});

/**
 * The point of many figure kinds: neighbours on the blog index and in a feed
 * should not look alike. Walks the whole publishing calendar in date order,
 * drafts included, so a schedule is checked before it ships.
 */
describe("the publishing calendar", () => {
  const posts = blogMetadata
    .map((post) => {
      const name = ogName(`/blog/${post.slug}`);
      return {
        date: post.published,
        name,
        kind:
          figureKind(name) ??
          (handMade(post) ? `hand-made ${name}` : "missing"),
      };
    })
    .sort((left, right) => left.date.localeCompare(right.date));

  it("gives every post a card", () => {
    expect(
      posts.filter((post) => post.kind === "missing").map((post) => post.name),
    ).toEqual([]);
  });

  it("never repeats a figure kind within three posts", () => {
    const repeats: string[] = [];
    posts.forEach((post, index) => {
      for (const other of posts.slice(index + 1, index + 3)) {
        if (other.kind === post.kind) {
          repeats.push(`${post.kind}: ${post.name} then ${other.name}`);
        }
      }
    });
    expect(repeats).toEqual([]);
  });

  it("uses a figure kind at most twice in any fourteen days", () => {
    const crowded: string[] = [];
    const day = (date: string) => Date.parse(`${date}T00:00:00Z`) / 864e5;
    posts.forEach((post) => {
      const within = posts.filter(
        (other) =>
          other.kind === post.kind &&
          day(other.date) >= day(post.date) &&
          day(other.date) < day(post.date) + 14,
      );
      if (within.length > 2) {
        crowded.push(
          `${post.kind} from ${post.date}: ${within.map((entry) => entry.name).join(", ")}`,
        );
      }
    });
    expect(crowded).toEqual([]);
  });
});

/**
 * Cards are rendered on macOS, where the wordmark's Georgia lives; the
 * renderer refuses to run without it, so this is skipped elsewhere (CI).
 */
describe.skipIf(process.platform !== "darwin")("rendering", () => {
  afterAll(() => closeRenderer());

  it("renders a card at 2x and the same card to the same bytes", async () => {
    const card = Object.values(ogCards).find(
      (entry) => entry.figure.kind === "versus",
    )!;
    const context = { eyebrow: ["Comparison", "Oct 7, 2026"] };
    const one = await renderOgCard(card, context);
    const two = await renderOgCard(card, context);
    const { width, height } = await sharp(one).metadata();
    expect([width, height]).toEqual([2400, 1260]);
    expect(one.equals(two)).toBe(true);
  }, 60_000);
});
