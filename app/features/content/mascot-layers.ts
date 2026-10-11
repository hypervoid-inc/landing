import type { CSSProperties } from "react";

/**
 * Where each layer of the mascot sits in its square, as fractions. Copied
 * from the agent-avatar catalog in the product repo
 * (`packages/agent-avatar/src/core/catalog.generated.ts`); the layer images
 * live in `public/assets/construct/mascot/`.
 */
export const MASCOT_LAYERS = {
  "body-construct": { x: 0.203125, y: 0.296875, w: 0.59375, h: 0.59375 },
  "body-mint": { x: 0.203125, y: 0.296875, w: 0.59375, h: 0.59375 },
  gloss: { x: 0.21875, y: 0.296875, w: 0.5625, h: 0.59375 },
  sockets: { x: 0.34375, y: 0.46875, w: 0.3125, h: 0.25 },
  eyes: { x: 0.359375, y: 0.484375, w: 0.28125, h: 0.203125 },
  "sockets-happy": { x: 0.328125, y: 0.5, w: 0.34375, h: 0.109375 },
  "eyes-happy": { x: 0.328125, y: 0.5, w: 0.34375, h: 0.109375 },
  "hard-hat": { x: 0.21875, y: 0.109375, w: 0.578125, h: 0.328125 },
  "safety-goggles": { x: 0.140625, y: 0.34375, w: 0.71875, h: 0.421875 },
  "round-glasses-black": { x: 0.171875, y: 0.34375, w: 0.65625, h: 0.4375 },
  "round-glasses-gold": { x: 0.171875, y: 0.34375, w: 0.65625, h: 0.421875 },
  "headset-mic": { x: 0.109375, y: 0.109375, w: 0.78125, h: 0.734375 },
  "hoodie-navy": { x: 0.1875, y: 0.6875, w: 0.625, h: 0.203125 },
  "suit-navy-black-tie": { x: 0.1875, y: 0.6875, w: 0.625, h: 0.203125 },
  "lab-coat": { x: 0.1875, y: 0.6875, w: 0.625, h: 0.203125 },
} as const;

export type MascotLayer = keyof typeof MASCOT_LAYERS;

export const mascotLayerSrc = (name: MascotLayer) =>
  `/assets/construct/mascot/${name}.webp`;

/** Absolute placement for a layer inside a square, positioned parent. */
export function mascotLayerStyle(name: MascotLayer): CSSProperties {
  const rect = MASCOT_LAYERS[name];
  return {
    position: "absolute",
    left: `${rect.x * 100}%`,
    top: `${rect.y * 100}%`,
    width: `${rect.w * 100}%`,
    height: `${rect.h * 100}%`,
    maxWidth: "none",
  };
}
