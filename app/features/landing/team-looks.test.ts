import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { LOOK_LAYERS, lookLayers, randomLook } from "./team-looks";

/** A seeded generator, so a failure can be replayed. */
function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 2 ** 32;
    return seed / 2 ** 32;
  };
}

describe("randomLook", () => {
  it("stands apart from its neighbour and never clashes", () => {
    const rng = seeded(7);
    for (let i = 0; i < 2000; i += 1) {
      const look = randomLook("body-mint", rng);
      expect(look.tint).not.toBe("body-mint");
      expect(
        look.top === "headphones" && look.eyewear === "safety-goggles",
      ).toBe(false);
      expect(lookLayers(look).slice(0, 3)).toEqual([
        look.tint,
        "gloss",
        "sockets",
      ]);
    }
  });
});

describe("LOOK_LAYERS", () => {
  it("has a 128px file for every layer a look can use", () => {
    for (const name of LOOK_LAYERS) {
      expect(
        existsSync(`public/assets/construct/mascot/128/${name}.webp`),
        name,
      ).toBe(true);
    }
  });
});
