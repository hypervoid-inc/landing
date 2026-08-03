import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
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
   * The model sets the headline itself, so a line long enough to need shrinking
   * is a line that either overruns the type column or collides with the object.
   * Three lines at sixteen characters is what the layout was drawn around.
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
  const prompt = buildPosterPrompt({
    eyebrow: posterEyebrow("home"),
    headline: card.headline,
    scene: card.scene,
  });

  it("renders at the ratio the publish crop expects", () => {
    expect(POSTER_ASPECT).toBe("16:9");
  });

  it("dictates the headline's line breaks rather than leaving them to the model", () => {
    for (const [index, line] of card.headline.entries()) {
      expect(prompt).toContain(`line ${index + 1}: ${line}`);
    }
  });

  it("names all four text elements and the badge for this route kind", () => {
    expect(prompt).toContain("CONSTRUCT");
    expect(prompt).toContain("AI EMPLOYEE");
    expect(prompt).toContain("construct.computer");
  });

  /**
   * The set exists to avoid one specific failure: the floating-glass-panel
   * render every image model reaches for. Losing this instruction loses the
   * whole art direction, and it would be invisible until 34 cards came back
   * looking like everyone else's.
   */
  it("forbids the generic AI-render filler by name", () => {
    expect(prompt).toMatch(/floating translucent UI panels/);
    expect(prompt).toMatch(/dashed concentric orbit rings/);
  });

  /** Crops eat the top and bottom, so the safe band has to be stated. */
  it("reserves the band the publish crop removes", () => {
    expect(prompt).toMatch(/top 4% and the bottom 4%/);
  });
});

describe("the style plate", () => {
  /**
   * Consistency across the set comes from every call being shown one approved
   * card, not from the prose. Without it on disk, a run still succeeds and
   * quietly produces 34 unrelated images.
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
   */
  it("leads with the canonical mascot, ahead of the style plate", () => {
    const references = posterReferences();
    expect(references[0]?.file).toBe("public/favicon.png");
    expect(references[0]?.note).toMatch(/silhouette/i);
  });

  it("attaches no reference that is missing from disk", () => {
    const root = fileURLToPath(new URL("../", import.meta.url));
    for (const { file } of posterReferences()) {
      expect(existsSync(new URL(file, `file://${root}`)), file).toBe(true);
    }
  });
});
