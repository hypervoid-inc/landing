import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { ogPosters, posterEyebrow } from "../app/content/og-poster";
import { canonicalRoutes, ogName } from "../app/lib/route-manifest";
import {
  costOf,
  defaultModel,
  formatUsd,
  modelPricing,
  ratesFor,
} from "../scripts/og/pricing.mjs";
import {
  POSTER_ASPECT,
  buildPosterPrompt,
  posterReferences,
  stylePlatePath,
} from "../scripts/og/poster.mjs";
import { HEIGHT, RESERVED, WIDTH, typeLayer } from "../scripts/og/typeset.mjs";

describe("generation cost", () => {
  it("prices a call from the tokens the API reports", () => {
    // 2K output ≈ 1680 tokens at $120/1M, plus input at $2/1M.
    const cost = costOf("gemini-3-pro-image", {
      promptTokenCount: 5000,
      candidatesTokenCount: 1680,
    });

    expect(cost.input).toBe(5000);
    expect(cost.output).toBe(1680);
    expect(cost.usd).toBeCloseTo(5000e-6 * 2 + 1680e-6 * 120, 6);
    expect(cost.usd).toBeCloseTo(0.2116, 4);
  });

  it("bills the older model flat per image instead of per output token", () => {
    const cost = costOf("gemini-2.5-flash-image", {
      promptTokenCount: 1000,
      candidatesTokenCount: 1290,
    });
    expect(cost.usd).toBeCloseTo(0.039 + 1000e-6 * 0.3, 6);
  });

  it("survives a response with no usage metadata rather than crashing a run", () => {
    expect(costOf(defaultModel, undefined).usd).toBe(0);
  });

  it("refuses to run a model it cannot cost", () => {
    expect(() => ratesFor("gemini-imaginary")).toThrow(/No pricing/);
  });

  /** Runs are single-digit dollars, so two decimals would round most calls to $0.13 or $0.00. */
  it("keeps sub-dollar amounts readable to four decimals", () => {
    expect(formatUsd(0.1342)).toBe("$0.1342");
    expect(formatUsd(3.75)).toBe("$3.75");
  });

  it("prices the default model", () => {
    expect(modelPricing[defaultModel]).toBeDefined();
  });
});

const names = canonicalRoutes.map((route) => ogName(route.path));

/**
 * True when a finished card sits in `assets/og/` for this route. Those win
 * outright at publish time, are never generated, and carry their own type.
 */
function handMade(name: string) {
  const root = fileURLToPath(new URL("../assets/og/", import.meta.url));
  return [".png", ".jpg", ".jpeg", ".webp"].some((extension) =>
    existsSync(`${root}${name}${extension}`),
  );
}

describe("card content", () => {
  it("gives every route a card", () => {
    expect(names.filter((name) => !ogPosters[name])).toEqual([]);
  });

  it("carries no cards for routes that no longer exist", () => {
    expect(Object.keys(ogPosters).filter((n) => !names.includes(n))).toEqual(
      [],
    );
  });

  it("keeps every scene unique, so no two cards photograph the same set", () => {
    const scenes = Object.values(ogPosters).map((card) => card.scene);
    expect(new Set(scenes).size).toBe(scenes.length);
  });

  /**
   * Three lines of sixteen characters is what the type grid was drawn around.
   * A longer line still publishes — `typeset.mjs` shrinks it to stay inside the
   * column — but it publishes at a size no other card in the set uses, which is
   * the drift this whole system exists to prevent.
   */
  it("keeps headlines short enough to set at poster size", () => {
    for (const [name, card] of Object.entries(ogPosters)) {
      expect(card.headline.length, name).toBeLessThanOrEqual(3);
      for (const line of card.headline) {
        expect(line, `${name}: "${line}"`).toMatch(/^[A-Z0-9 ,.?&'-]+$/);
        expect(line.length, `${name}: "${line}"`).toBeLessThanOrEqual(16);
      }
    }
  });

  /**
   * Style lives in the contract, not in the scenes. A scene that restates the
   * palette is how a set drifts: the contract and the scene start disagreeing
   * and the model splits the difference.
   */
  it("leaves palette, lighting, and medium to the contract", () => {
    for (const [name, card] of Object.entries(ogPosters)) {
      expect(card.scene, name).not.toMatch(
        /#[0-9a-f]{6}|photoreal|3d render|lit from|studio|navy|cyan/i,
      );
      expect(card.scene.length, name).toBeGreaterThan(60);
    }
  });

  /**
   * The badge sits opposite the wordmark on the same line, so a badge reading
   * CONSTRUCT puts the word on the card twice and reads as a mistake.
   */
  it("badges every route kind with something that is not the wordmark", () => {
    for (const route of canonicalRoutes) {
      const badge = posterEyebrow(route.kind);
      expect(badge, route.path).toMatch(/^[A-Z ]+$/);
      expect(badge, route.path).not.toBe("CONSTRUCT");
    }
  });
});

describe("the prompt", () => {
  const card = ogPosters.home!;
  const prompt = buildPosterPrompt({ scene: card.scene });

  it("renders at the ratio the publish crop expects", () => {
    expect(POSTER_ASPECT).toBe("16:9");
  });

  /**
   * The type is set in code at publish time. A prompt that still carried the
   * headline would get it drawn into the photograph as well, and the card would
   * ship with the words on it twice.
   */
  it("keeps the headline and the badge out of the image entirely", () => {
    for (const line of card.headline) expect(prompt).not.toContain(line);
    expect(prompt).not.toContain("construct.computer");
    expect(prompt).toMatch(/no type anywhere on it/);
    expect(prompt).toMatch(/There is no text over this image/);
  });

  /**
   * The reserved regions are written from the same constants the type layer
   * sets into, so the two cannot disagree about where the words go. Stated as
   * whole percents, which is what a prompt can actually act on.
   */
  it("asks the photograph to leave exactly the regions the type needs", () => {
    const column = `${Math.round(RESERVED.columnWidth * 100)}%`;
    expect(prompt).toContain(
      `a vertical line drawn ${column} of the way across the frame`,
    );
    expect(prompt).toContain("SITS ENTIRELY TO THE RIGHT OF THAT LINE");
    expect(prompt).toContain(
      `top ${Math.round(RESERVED.top * 100)}% of the frame clear`,
    );
  });

  /**
   * The set exists to avoid one specific failure: the floating-glass-panel
   * render every image model reaches for. Losing this instruction loses the
   * whole art direction, and it would be invisible until the whole set came back
   * looking like everyone else's.
   */
  it("forbids the generic AI-render filler by name", () => {
    expect(prompt).toMatch(/floating translucent UI panels/);
    expect(prompt).toMatch(/dashed concentric orbit rings/);
  });

  /**
   * The whole point of the rebase. The first set was shot in a blacked-out navy
   * studio, which matched nothing on the site; a contract that stops forbidding
   * the dark ground drifts straight back to it, because that is what "dramatic
   * product photograph" means to an image model.
   */
  it("holds the studio to the landing page's light palette", () => {
    expect(prompt).toMatch(/No dark background of any kind/);
    expect(prompt).toMatch(/No deep or saturated blue ground/);
    expect(prompt).toMatch(/paper-white studio/);
  });

  /** Crops eat the top and bottom, so the safe band has to be stated. */
  it("reserves the band the publish crop removes", () => {
    expect(prompt).toMatch(/top 4% and the bottom 4%/);
  });
});

describe("the type layer", () => {
  /**
   * Set in code rather than drawn by the model, which is what makes the
   * wordmark, badge, headline, and domain identical across the set instead of
   * merely similar. These are the invariants the layout is built on.
   */
  it("publishes at the size social crawlers crop to", () => {
    expect([WIDTH, HEIGHT]).toEqual([1200, 630]);
  });

  it("reserves regions inside the frame, and leaves the subject somewhere to go", () => {
    for (const [key, value] of Object.entries(RESERVED)) {
      expect(value, key).toBeGreaterThan(0);
      expect(value, key).toBeLessThan(1);
    }
    // The photograph still gets most of the right of the frame to stage in.
    expect(RESERVED.columnWidth).toBeLessThan(0.7);
    expect(RESERVED.top).toBeLessThan(0.25);
  });

  // typeLayer probes glyph ink through sharp; two renders take several seconds.
  it(
    "sets the same wordmark, badge, and domain on every card",
    async () => {
      const [one, two] = await Promise.all([
        typeLayer({ eyebrow: "GUIDE", headline: ["ONE"] }),
        typeLayer({ eyebrow: "GUIDE", headline: ["ONE"] }),
      ]);
      expect(one.equals(two)).toBe(true);

      const { width, height } = await sharp(one).metadata();
      expect([width, height]).toEqual([1200, 630]);
    },
    20_000,
  );

  /**
   * A four-line headline is a content mistake, and silently setting it at a
   * size nothing else in the set uses is how one ships.
   */
  it("refuses a headline the grid was not drawn for", async () => {
    await expect(
      typeLayer({ eyebrow: "GUIDE", headline: ["A", "B", "C", "D"] }),
    ).rejects.toThrow(/three lines/);
  });
});

describe("the style plate", () => {
  /**
   * Consistency across the set comes from every call being shown one approved
   * card, not from the prose. Without it on disk, a run still succeeds and
   * quietly produces a set of unrelated images.
   */
  it("is committed, and sits second in the references", () => {
    expect(
      existsSync(stylePlatePath),
      "missing assets/og/style/master.webp — run `pnpm og:master home`",
    ).toBe(true);

    const references = posterReferences();
    expect(references[1]?.file).toBe("assets/og/style/master.webp");
    expect(references[1]?.note).toMatch(/STYLE PLATE/);
  });

  /**
   * The mascot outranks the plate. Reversing these two is what produced domes,
   * lobeless squircles, and blobs with limbs in the first set: the plate shows
   * one lit, partly occluded view of the character, and cards that copied it
   * hardest lost the silhouette.
   *
   * It is the turnaround rather than the favicon on purpose. One flat view
   * cannot pin a solid, and the favicon's canvas clips the left and right
   * lobes off its own silhouette.
   */
  it("leads with the mascot turnaround, ahead of the style plate", () => {
    const references = posterReferences();
    expect(references[0]?.file).toBe("assets/refs/mascot-sheet.png");
    expect(references[0]?.note).toMatch(/four soft corner bulges/);
  });

  /**
   * Every generated scene rests the mascot on something larger than itself.
   * Staged free-standing on the table beside a small object, the model reads it
   * as a character and gives it legs — that failure took out most of one whole
   * set.
   *
   * Hand-made cards are exempt: nothing generates them, so their `scene` is a
   * description of an existing image rather than an instruction.
   */
  it("stages every generated card with the mascot on top of a larger object", () => {
    for (const [name, card] of Object.entries(ogPosters)) {
      if (handMade(name)) continue;
      expect(card.scene, name).toMatch(
        /^The mascot sitting (squarely )?on top of/,
      );
    }
  });

  /**
   * `magazine-cover.png` was the strongest single source of the deep navy
   * ground and hard rim light the set was rebased away from. Left attached, it
   * quietly pulls every card back toward the look the contract now forbids.
   */
  it("attaches no reference that fights the light studio", () => {
    const files = posterReferences().map((reference) => reference.file);
    expect(files).not.toContain("assets/refs/magazine-cover.png");
  });

  it("attaches no reference that is missing from disk", () => {
    const root = fileURLToPath(new URL("../", import.meta.url));
    for (const { file } of posterReferences()) {
      expect(existsSync(new URL(file, `file://${root}`)), file).toBe(true);
    }
  });
});
