import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

/**
 * Builds `assets/refs/mascot-sheet.png`, the reference that pins the mascot's
 * shape on every generation.
 *
 * The mascot used to be referenced by `public/favicon.png` alone. That was one
 * flat front-on render, and worse, one whose left and right lobes run off the
 * edge of its own canvas — the model was being shown a clipped silhouette and
 * asked to keep it intact. Six cards in the first set came back as domes,
 * lobeless squircles, or blobs.
 *
 * A single view also cannot pin a solid. The model has to invent the depth, and
 * it invents a different depth every time: a sphere on one card, a flat slab on
 * the next. `assets/refs/construct-rotate.gif` is a full 360 turnaround of the
 * real model, so the sheet is cut straight from it — front, two three-quarters,
 * a profile, and the back, all uncropped with air around them.
 *
 * Committed rather than built on demand: it is a reference image like any other
 * in `assets/refs/`, and a generation must never depend on a build step having
 * run first.
 *
 *   node scripts/og/mascot-sheet.mjs
 */

const root = fileURLToPath(new URL("../../", import.meta.url));
const source = path.join(root, "assets/refs/construct-rotate.gif");
const destination = path.join(root, "assets/refs/mascot-sheet.png");

/** Frame size inside the GIF, and how many it holds. */
const FRAME = 500;

/**
 * Which frames to cut, chosen by eye from the turnaround.
 *
 * The hero is the most square-on frame in the loop: it is the canonical
 * silhouette, the four lobes at their most even, both eyes upright and level.
 * The rest turn no further than about 45°, which is enough to show the object
 * has real thickness.
 *
 * The first version of this sheet went all the way round, including the edge-on
 * profile and the eyeless back. That was a mistake: edge-on, the object reads as
 * two rounded masses joined at a waist, and the whole set came back with
 * mascots that looked like two of them stuck end to end, or with the lower
 * lobes drawn as legs. A reference cannot show a view you never want drawn.
 */
const HERO = 13;
const TURNAROUND = [12, 11, 0, 1, 10, 9];

const PAD = 48;
const HERO_BOX = 620;
const TILE = 300;

/** Sized to the content, so the sheet carries no dead white for the model to read as air. */
const SHEET = {
  width: PAD + HERO_BOX + PAD + TILE * 3 + PAD,
  height: HERO_BOX + PAD * 2,
};

/**
 * The GIF's frames, as one tall strip.
 *
 * Read as raw pixels rather than re-encoded: every image format sharp could
 * write here is either single-frame, which loses thirteen of the fourteen
 * views, or animated, which carries a page height that makes `extract` refuse
 * to reach past the first frame.
 */
async function filmstrip() {
  const { data, info } = await sharp(source, { animated: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return {
    input: data,
    raw: { width: info.width, height: info.height, channels: info.channels },
  };
}

/**
 * Trims a frame to its own ink, then re-pads it so nothing touches an edge.
 *
 * Two pipelines rather than one: sharp orders `trim` ahead of `extract` within
 * a single chain, which would trim the whole strip and leave the extract
 * reaching past the end of it.
 */
async function view(frames, index, box) {
  const frame = await sharp(frames.input, { raw: frames.raw })
    .extract({ left: 0, top: index * FRAME, width: FRAME, height: FRAME })
    .png()
    .toBuffer();
  const cut = await sharp(frame).trim({ threshold: 12 }).png().toBuffer();

  return sharp(cut)
    .resize(box - PAD, box - PAD, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .extend({
      top: PAD / 2,
      bottom: PAD / 2,
      left: PAD / 2,
      right: PAD / 2,
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .png()
    .toBuffer();
}

const frames = await filmstrip();

const heroTop = Math.round((SHEET.height - HERO_BOX) / 2);
const gridLeft = PAD + HERO_BOX + PAD;
const gridTop = Math.round((SHEET.height - TILE * 2) / 2);

const tiles = [
  { input: await view(frames, HERO, HERO_BOX), left: PAD, top: heroTop },
  ...(await Promise.all(
    TURNAROUND.map(async (frame, index) => ({
      input: await view(frames, frame, TILE),
      left: gridLeft + (index % 3) * TILE,
      top: gridTop + Math.floor(index / 3) * TILE,
    })),
  )),
];

await sharp({
  create: {
    width: SHEET.width,
    height: SHEET.height,
    channels: 4,
    background: "#ffffff",
  },
})
  .composite(tiles)
  .png()
  .toFile(destination);

console.log(`Wrote ${path.relative(root, destination)}`);
