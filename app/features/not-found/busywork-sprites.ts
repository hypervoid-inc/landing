/**
 * Pixel art for the 404 game, kept as text so it ships with no image requests
 * and stays in the mascot's hard-edged, black-outlined style at any scale.
 * Each sprite is SPRITE_SIZE rows of SPRITE_SIZE characters from PALETTE.
 */

export const SPRITE_SIZE = 16;

export const PALETTE: Record<string, string | null> = {
  ".": null,
  k: "#16161a",
  w: "#ffffff",
  m: "#a9b6be",
  t: "#01b4c8",
  n: "#2fa36b",
  r: "#e5484d",
  y: "#f7b500",
};

export type SpriteName =
  "email" | "invoice" | "sheet" | "meeting" | "four" | "zero";

export const SPRITES: Record<SpriteName, readonly string[]> = {
  email: [
    "................",
    "................",
    ".kkkkkkkkkkkkkk.",
    ".kkwwwwwwwwwwkk.",
    ".kwkwwwwwwwwkwk.",
    ".kwwkwwwwwwkwwk.",
    ".kwwwkwwwwkwwwk.",
    ".kwwwwkkkkwwwwk.",
    ".kwwwwwwwwwwwwk.",
    ".kwwwwwwwwwwwwk.",
    ".kwwwwwwwwwwwwk.",
    ".kwwwwwwwwwwwwk.",
    ".kkkkkkkkkkkkkk.",
    "................",
    "................",
    "................",
  ],
  invoice: [
    "................",
    "..kkkkkkkkk.....",
    "..kwwwwwwwkk....",
    "..kwtttwwwkwk...",
    "..kwwwwwwwkkkk..",
    "..kwwwwwwwwwwk..",
    "..kwmmmmmmmmwk..",
    "..kwwwwwwwwwwk..",
    "..kwmmmmmmwwwk..",
    "..kwwwwwwwwwwk..",
    "..kwmmmmmmmmwk..",
    "..kwwwwwwwwwwk..",
    "..kwwwwwwtttwk..",
    "..kwwwwwwwwwwk..",
    "..kkkkkkkkkkkk..",
    "................",
  ],
  sheet: [
    "................",
    ".kkkkkkkkkkkkkk.",
    ".knnnnnnnnnnnnk.",
    ".knnnnnnnnnnnnk.",
    ".kkkkkkkkkkkkkk.",
    ".kwwwkwwwwkwwwk.",
    ".kwwwkwwwwkwwwk.",
    ".kkkkkkkkkkkkkk.",
    ".kwwwkwwwwkwwwk.",
    ".kwwwkwwwwkwwwk.",
    ".kkkkkkkkkkkkkk.",
    ".kwwwkwwwwkwwwk.",
    ".kwwwkwwwwkwwwk.",
    ".kkkkkkkkkkkkkk.",
    "................",
    "................",
  ],
  meeting: [
    "................",
    "...kk......kk...",
    ".kkkkkkkkkkkkkk.",
    ".krrkkrrrrkkrrk.",
    ".krrrrrrrrrrrrk.",
    ".kkkkkkkkkkkkkk.",
    ".kwwwwwwwwwwwwk.",
    ".kwwrrwwwwrrwwk.",
    ".kwwwrrwwrrwwwk.",
    ".kwwwwrrrrwwwwk.",
    ".kwwwwrrrrwwwwk.",
    ".kwwwrrwwrrwwwk.",
    ".kwwrrwwwwrrwwk.",
    ".kwwwwwwwwwwwwk.",
    ".kkkkkkkkkkkkkk.",
    "................",
  ],
  four: [
    "................",
    ".........kkkk...",
    "........kyyyk...",
    ".......kyyyyk...",
    "......kyykyyk...",
    ".....kyykkyyk...",
    "....kyyk.kyyk...",
    "...kyyk..kyyk...",
    "..kyykkkkkyykkk.",
    "..kyyyyyyyyyyyk.",
    "..kyyyyyyyyyyyk.",
    "..kkkkkkkkyykkk.",
    ".........kyyk...",
    ".........kyyk...",
    ".........kkkk...",
    "................",
  ],
  zero: [
    "................",
    "....kkkkkkkk....",
    "...kyyyyyyyyk...",
    "..kyyyyyyyyyyk..",
    "..kyyykkkkyyyk..",
    "..kyyk....kyyk..",
    "..kyyk....kyyk..",
    "..kyyk....kyyk..",
    "..kyyk....kyyk..",
    "..kyyk....kyyk..",
    "..kyyk....kyyk..",
    "..kyyykkkkyyyk..",
    "..kyyyyyyyyyyk..",
    "...kyyyyyyyyk...",
    "....kkkkkkkk....",
    "................",
  ],
};

/** Renders a sprite once at an integer scale, so drawing it later is one blit. */
export function rasterizeSprite(
  name: SpriteName,
  scale: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = SPRITE_SIZE * scale;
  canvas.height = SPRITE_SIZE * scale;
  const context = canvas.getContext("2d");
  if (!context) return canvas;

  SPRITES[name].forEach((row, y) => {
    for (let x = 0; x < row.length; x += 1) {
      const color = PALETTE[row[x]!];
      if (!color) continue;
      context.fillStyle = color;
      context.fillRect(x * scale, y * scale, scale, scale);
    }
  });
  return canvas;
}
