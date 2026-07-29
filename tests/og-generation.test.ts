import { describe, expect, it } from "vitest";

import { ogArtSubjects, ogLayout, ogTiled } from "../app/content/og-art";
import { canonicalRoutes, ogName } from "../app/lib/route-manifest";
import {
  costOf,
  defaultModel,
  formatUsd,
  modelPricing,
  ratesFor,
} from "../scripts/og/pricing.mjs";
import { layouts } from "../scripts/og/prompt.mjs";

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

describe("artwork layouts", () => {
  it("gives every route a layout the prompt knows how to describe", () => {
    for (const route of canonicalRoutes) {
      expect(layouts[ogLayout(ogName(route.path))]).toBeDefined();
    }
  });

  /** The tile layout is retired; nothing should be routed to it. */
  it("renders every route full-bleed", () => {
    for (const route of canonicalRoutes) {
      expect(ogLayout(ogName(route.path)), route.path).toBe("full");
    }
    expect(ogTiled).toEqual([]);
  });

  it("keeps a subject for every route, since every route is generated", () => {
    const missing = canonicalRoutes
      .map((route) => ogName(route.path))
      .filter((name) => !ogArtSubjects[name]);
    expect(missing).toEqual([]);
  });

  /**
   * A full-bleed card carries the headline over the artwork, so its prompt has
   * to reserve the left side. Losing that instruction makes titles unreadable.
   */
  it("reserves the left of the frame in the full-bleed composition", () => {
    expect(layouts.full.composition).toMatch(/left 45%/);
    expect(layouts.full.aspectRatio).toBe("16:9");
    expect(layouts.tile.aspectRatio).toBe("1:1");
  });
});
