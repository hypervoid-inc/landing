import type { RouteKind } from "../lib/route-manifest";

/**
 * The routes whose social card is a finished, hand-made image in
 * `assets/og/` rather than a card rendered from `og-cards.ts`: the homepage
 * poster, the Clef vs Jev benchmark card, the Zen Mode film frame. They are
 * published as they are, with no type set over them.
 *
 * `headline` and `scene` describe the image for the record and feed its
 * freshness signature. They date from the generated still-life set, which
 * `scripts/generate-art.mjs` can still produce for a route listed here with no
 * hand-made image; every other route now has a rendered card instead.
 */
export type PosterCard = {
  readonly headline: readonly string[];
  readonly scene: string;
  /**
   * Scale the card to fit 1200x630 rather than centre-cropping it.
   *
   * Only for a hand-made card composed to all four edges, where cropping would
   * clip the composition and the 6.7% vertical squash that replaces it is
   * invisible. Never set it on a generated card: those are photographs of real
   * objects, and a squashed photograph reads as wrong immediately.
   */
  readonly fullFrame?: boolean;
};

/**
 * The badge in the top right. Keyed off the route kind rather than set per
 * card, so every guide is badged the same way without anyone having to
 * remember to do it.
 *
 * No label may be "CONSTRUCT": the wordmark already sits opposite it on the
 * same line, and the two together read as a mistake.
 */
const eyebrowLabels: Record<RouteKind, string> = {
  home: "AI EMPLOYEE",
  page: "COMPANY",
  pricing: "PRICING",
  "use-case": "USE CASE",
  tool: "FREE TOOL",
  "tool-index": "NO SIGNUP",
  "blog-index": "LIBRARY",
  "blog-post": "ARTICLE",
  guide: "GUIDE",
  comparison: "COMPARISON",
  "author-index": "AUTHORS",
  author: "AUTHOR",
  tag: "TOPIC",
};

export function posterEyebrow(kind: string): string {
  return eyebrowLabels[kind as RouteKind] ?? "COMPANY";
}
export const ogPosters: Record<string, PosterCard> = {
  /**
   * The homepage card is hand-made and is **never generated**.
   *
   * It is a printed poster rather than a studio photograph: a cut-out CRT and
   * mascot over clouds on a flat blue field, colossal outlined display type, a
   * monospace specification block, and the wordmark running up the full height
   * of the right edge. It carries its own words, so no type layer is set over
   * it. It was chosen against the whole generated direction because it is the
   * only card that both stops a scroll and says what the product actually is.
   *
   * `assets/og/home.png` is the source of truth. Because a hand-made image in
   * `assets/og/` wins outright, `pnpm og:generate` skips this route entirely
   * and there is no way for a run to overwrite it. `fullFrame` is set because
   * the composition runs to all four edges: centre-cropping it clips the top of
   * the headline, the wordmark, and the domain, while the 6.7% squash that
   * replaces the crop is invisible on flat poster type.
   *
   * `headline` and `scene` are unused for the image and kept only for the
   * record and the freshness signature.
   */
  home: {
    headline: ["A PERSISTENT", "WORK OS FOR AN", "AI EMPLOYEE"],
    fullFrame: true,
    scene:
      "A printed poster: a cut-out CRT monitor and the mascot floating over a bank of clouds on a flat field, with outlined display type across the top, a monospace specification block in the lower left, and the wordmark running up the right edge.",
  },

  "blog-clef-vs-jev-benchmark": {
    headline: ["CLEF VS JEV", "ON REAL AGENT", "DECISIONS"],
    scene:
      "The mascot sitting on top of a tall mechanical balance scale with two hanging pans, a thick stack of index cards on one pan and a single index card on the other.",
  },
  /**
   * Hand-made, like `home`: `assets/og/blog-zen-mode.png` is the title frame of
   * the Zen Mode launch film (the video repo's `out/thumb-zen-mode.png`, top
   * 1008px, scaled to 1200x630). It carries its own words, so `headline` and
   * `scene` are kept only for the record and the freshness signature.
   */
  "blog-zen-mode": {
    headline: ["ZEN MODE"],
    scene:
      "A frame from the Zen Mode launch film: the CONSTRUCT overline and the words Zen Mode set over the dimmed Zen Mode Home screen.",
  },
};

export function ogPoster(name: string): PosterCard | undefined {
  return ogPosters[name];
}
