import type { MascotLayer } from "../content/mascot-layers";

/**
 * A teammate's look in the pricing strip: a body tint and, sometimes, an
 * outfit, eyewear and something on the head, from the product's avatar
 * catalog. Badges and props are left out; they do not read at this size.
 */
export type TeamLook = {
  tint: MascotLayer;
  outfit: MascotLayer | null;
  eyewear: MascotLayer | null;
  top: MascotLayer | null;
  /** How it stands on its seat: px off the line, and a tilt in degrees. */
  nudge: { y: number; tilt: number };
};

const TINTS: readonly MascotLayer[] = [
  "body-construct",
  "body-azure",
  "body-mint",
  "body-violet",
  "body-amber",
  "body-rose",
  "body-teal",
  "body-coral",
  "body-lime",
];

const OUTFITS: readonly MascotLayer[] = [
  "hi-vis-orange",
  "hi-vis-neon",
  "hoodie-navy",
  "hoodie-cream-splatter",
  "suit-navy-black-tie",
  "suit-pinstripe",
  "suit-navy",
  "suit-black",
  "lab-coat",
  "cardigan-brown",
  "jacket-cream",
  "jacket-black",
  "jacket-tan",
  "zip-jacket-black",
  "blazer-pink",
  "sweater-blue",
];

const EYEWEAR: readonly MascotLayer[] = [
  "round-glasses-black",
  "round-glasses-gold",
  "safety-goggles",
];

const TOPS: readonly MascotLayer[] = [
  "hard-hat",
  "beret-navy",
  "cap-black",
  "headphones",
  "headset-mic",
];

const pick = <T>(list: readonly T[], rng: () => number): T =>
  list[Math.floor(rng() * list.length) % list.length]!;

/**
 * A random teammate, never the same tint as `beside` so neighbours stand
 * apart. Goggles' strap and headphones' band clash in the catalog, so
 * headphones drop the goggles.
 */
export function randomLook(
  beside: MascotLayer | null = null,
  rng: () => number = Math.random,
): TeamLook {
  const tint = pick(
    TINTS.filter((name) => name !== beside),
    rng,
  );
  const outfit = rng() < 0.75 ? pick(OUTFITS, rng) : null;
  const top = rng() < 0.4 ? pick(TOPS, rng) : null;
  let eyewear = rng() < 0.3 ? pick(EYEWEAR, rng) : null;
  if (top === "headphones" && eyewear === "safety-goggles") eyewear = null;
  const spread = (range: number) => Math.round((rng() * 2 - 1) * range);
  return {
    tint,
    outfit,
    eyewear,
    top,
    nudge: { y: spread(2), tilt: spread(7) },
  };
}

/** The first three, fixed so the prerendered page matches the browser's. */
export const STARTING_LOOKS: readonly TeamLook[] = [
  {
    tint: "body-construct",
    outfit: "hoodie-navy",
    eyewear: null,
    top: null,
    nudge: { y: 1, tilt: -4 },
  },
  {
    tint: "body-mint",
    outfit: "lab-coat",
    eyewear: "round-glasses-gold",
    top: null,
    nudge: { y: -1, tilt: 5 },
  },
  {
    tint: "body-amber",
    outfit: "jacket-black",
    eyewear: null,
    top: "cap-black",
    nudge: { y: 2, tilt: -2 },
  },
];

/** Every layer a look can use. */
export const LOOK_LAYERS: readonly MascotLayer[] = [
  ...TINTS,
  "gloss",
  "sockets",
  "eyes",
  ...OUTFITS,
  ...EYEWEAR,
  ...TOPS,
];

/** Layers to draw for a look, bottom to top (the catalog's z order). */
export function lookLayers(look: TeamLook): MascotLayer[] {
  return [
    look.tint,
    "gloss",
    "sockets",
    look.outfit,
    "eyes",
    look.eyewear,
    look.top,
  ].filter((name): name is MascotLayer => name !== null);
}
