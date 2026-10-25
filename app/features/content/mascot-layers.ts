import type { CSSProperties } from "react";

/**
 * Where each layer of the mascot sits in its square, as fractions. Copied
 * from the agent-avatar catalog in the product repo
 * (`packages/agent-avatar/src/core/catalog.generated.ts`). The layer images
 * live in `public/assets/construct/mascot/`, a few at full size and every
 * one at 128px in `128/` (the package's `assets/128`), for small mascots.
 */
export const MASCOT_LAYERS = {
  "body-construct": { x: 0.203125, y: 0.296875, w: 0.59375, h: 0.59375 },
  "body-azure": { x: 0.203125, y: 0.296875, w: 0.59375, h: 0.59375 },
  "body-mint": { x: 0.203125, y: 0.296875, w: 0.59375, h: 0.59375 },
  "body-violet": { x: 0.203125, y: 0.296875, w: 0.59375, h: 0.59375 },
  "body-amber": { x: 0.203125, y: 0.296875, w: 0.59375, h: 0.59375 },
  "body-rose": { x: 0.203125, y: 0.296875, w: 0.59375, h: 0.59375 },
  "body-teal": { x: 0.203125, y: 0.296875, w: 0.59375, h: 0.59375 },
  "body-coral": { x: 0.203125, y: 0.296875, w: 0.59375, h: 0.59375 },
  "body-lime": { x: 0.203125, y: 0.296875, w: 0.59375, h: 0.59375 },
  gloss: { x: 0.21875, y: 0.296875, w: 0.5625, h: 0.59375 },
  sockets: { x: 0.34375, y: 0.46875, w: 0.3125, h: 0.25 },
  eyes: { x: 0.359375, y: 0.484375, w: 0.28125, h: 0.203125 },
  "sockets-happy": { x: 0.328125, y: 0.5, w: 0.34375, h: 0.109375 },
  "eyes-happy": { x: 0.328125, y: 0.5, w: 0.34375, h: 0.109375 },
  "hard-hat": { x: 0.21875, y: 0.109375, w: 0.578125, h: 0.328125 },
  "beret-navy": { x: 0.34375, y: 0.171875, w: 0.46875, h: 0.28125 },
  "cap-black": { x: 0.25, y: 0.125, w: 0.53125, h: 0.296875 },
  "safety-goggles": { x: 0.140625, y: 0.34375, w: 0.71875, h: 0.421875 },
  "round-glasses-black": { x: 0.171875, y: 0.34375, w: 0.65625, h: 0.4375 },
  "round-glasses-gold": { x: 0.171875, y: 0.34375, w: 0.65625, h: 0.421875 },
  headphones: { x: 0.078125, y: 0.125, w: 0.84375, h: 0.53125 },
  "headset-mic": { x: 0.109375, y: 0.109375, w: 0.78125, h: 0.734375 },
  "hi-vis-orange": { x: 0.1875, y: 0.6875, w: 0.625, h: 0.203125 },
  "hi-vis-neon": { x: 0.1875, y: 0.6875, w: 0.625, h: 0.203125 },
  "hoodie-navy": { x: 0.1875, y: 0.6875, w: 0.625, h: 0.203125 },
  "hoodie-cream-splatter": { x: 0.046875, y: 0.6875, w: 0.921875, h: 0.25 },
  "suit-navy-black-tie": { x: 0.1875, y: 0.6875, w: 0.625, h: 0.203125 },
  "suit-pinstripe": { x: 0.1875, y: 0.6875, w: 0.625, h: 0.203125 },
  "suit-navy": { x: 0.1875, y: 0.6875, w: 0.625, h: 0.203125 },
  "suit-black": { x: 0.1875, y: 0.703125, w: 0.625, h: 0.203125 },
  "lab-coat": { x: 0.1875, y: 0.6875, w: 0.625, h: 0.203125 },
  "cardigan-brown": { x: 0.1875, y: 0.6875, w: 0.625, h: 0.203125 },
  "jacket-cream": { x: 0.203125, y: 0.703125, w: 0.609375, h: 0.203125 },
  "jacket-black": { x: 0.171875, y: 0.6875, w: 0.65625, h: 0.21875 },
  "jacket-tan": { x: 0.1875, y: 0.703125, w: 0.625, h: 0.203125 },
  "zip-jacket-black": { x: 0.171875, y: 0.6875, w: 0.65625, h: 0.21875 },
  "blazer-pink": { x: 0.1875, y: 0.6875, w: 0.625, h: 0.21875 },
  "sweater-blue": { x: 0.1875, y: 0.6875, w: 0.625, h: 0.21875 },
} as const;

export type MascotLayer = keyof typeof MASCOT_LAYERS;

export const mascotLayerSrc = (name: MascotLayer, size?: 128) =>
  `/assets/construct/mascot/${size ? `${size}/` : ""}${name}.webp`;

/**
 * Eyewear art sits high; the product nudges it down by this much of the
 * square when drawing it (`SLOT_NUDGE_Y` in the agent-avatar catalog).
 */
const EYEWEAR: ReadonlySet<MascotLayer> = new Set([
  "safety-goggles",
  "round-glasses-black",
  "round-glasses-gold",
]);
const EYEWEAR_NUDGE_Y = 0.03;

/** Where a layer is drawn in its square, as fractions, nudges applied. */
export function mascotLayerRect(name: MascotLayer) {
  const rect = MASCOT_LAYERS[name];
  return { ...rect, y: rect.y + (EYEWEAR.has(name) ? EYEWEAR_NUDGE_Y : 0) };
}

/** Absolute placement for a layer inside a square, positioned parent. */
export function mascotLayerStyle(name: MascotLayer): CSSProperties {
  const rect = mascotLayerRect(name);
  return {
    position: "absolute",
    left: `${rect.x * 100}%`,
    top: `${rect.y * 100}%`,
    width: `${rect.w * 100}%`,
    height: `${rect.h * 100}%`,
    maxWidth: "none",
  };
}
