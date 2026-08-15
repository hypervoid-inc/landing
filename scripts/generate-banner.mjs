import { Buffer } from "node:buffer";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

import { DISPLAY, TEXT, metrics, place, preflight } from "./og/typeset.mjs";

/**
 * Long, low inline banners for an article body.
 *
 * Nothing here is generated, and that is the point. The two image scripts beside
 * this one buy a photograph from a model and set the words over it in code; a
 * banner has no photograph. Its entire content is a date and a URL, which is
 * exactly the half `scripts/og/typeset.mjs` exists to take away from the model —
 * `poster.mjs` forbids it drawing type at all, because across the first set it
 * could not hold a size, a position, or a spelling. A garbled
 * `construct.computer/ph` is a dead link sitting in the middle of a post.
 *
 * The shape rules it out too. Gemini's widest ratio is 21:9 (2.33:1) and these
 * run at 5:1, so more than half of every generated frame would be cropped away
 * and the model would be composing for a frame it never sees.
 *
 * So: solid ground, real type, and the shipped mascot artwork composited in
 * rather than an approximation of it drawn afresh. It costs nothing, it is
 * pixel-identical on every run, and the URL is always spelled correctly.
 *
 *   pnpm banner <name>
 *   pnpm banner --list
 */

const root = process.cwd();
const outputDirectory = path.join(root, "assets/social");

/**
 * The mascot, as a cutout with real transparency.
 *
 * Not `assets/refs/construct-rotate.gif`, which is where the rest of this
 * directory goes for the mascot and is the wrong source here: its frames carry
 * an opaque white rectangle behind the object, so a cutout taken from it brings
 * a white box along with it and a shadow built from its alpha comes out a
 * blurred square. `scripts/og/mascot-sheet.mjs` never runs into that because it
 * composites its frames onto a white sheet.
 *
 * This file's silhouette is genuinely the object: 36px of transparent margin on
 * every side of a 512px canvas, nothing clipped.
 */
const mascotSource = path.join(root, "public/icon-512.png");

const WIDTH = 2000;
const HEIGHT = 400;

/**
 * The Product Hunt campaign palette, copied from the tokens the site itself
 * renders the campaign chrome in (`--ph-coral` and friends in
 * `app/features/product-hunt/product-hunt.css`).
 *
 * Copied rather than imported because that is a stylesheet, not a module. If
 * the campaign is ever recoloured, these three lines move with it.
 */
const CORAL = "#ff6154";
const CORAL_STRONG = "#e8574b";
const CORAL_SHADOW = "#a63a31";

const MARGIN = 96;
const MASCOT_BOX = 232;
const TEXT_LEFT = MARGIN + MASCOT_BOX + 76;

/**
 * Baselines and cap heights, in pixels down from the top of the frame.
 *
 * The two sizes are picked so the tracked eyebrow and the display line come out
 * within a few pixels of the same width. At 5:1 the type is a small island in a
 * lot of ground, and two lines that end together read as one deliberate block
 * where two ragged ones read as an accident.
 */
const EYEBROW = { baseline: 136, cap: 28, tracking: 0.16 };
const DISPLAY_LINE = { baseline: 292, cap: 122 };
const PILL = { height: 88, cap: 26, tracking: 0.01, padX: 44 };

/**
 * The mascot at the size asked for.
 *
 * Trimmed to its own ink before resizing: the source carries 36px of margin,
 * and fitting the untrimmed canvas would render the object about 14% smaller
 * than the box it was given.
 */
async function mascot(box) {
  const trimmed = await sharp(mascotSource)
    .trim({ threshold: 12 })
    .png()
    .toBuffer();

  return sharp(trimmed)
    .resize(box, box, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

/**
 * A soft drop shadow for one cutout, built from its own alpha.
 *
 * Blurring the artwork itself would smear its colour outward and leave a pale
 * blue halo on the coral. Taking the alpha channel alone, softening it, scaling
 * it down to a plausible density and using it as the mask for a flat dark plate
 * gives a shadow the shape of the object and the colour of the ground in
 * shadow, which is what a shadow actually is.
 */
async function dropShadow(cutout, { blur = 22, opacity = 0.32 } = {}) {
  // The cutout fills its own buffer edge to edge, so the blur is given room to
  // fall off into first. Without the padding it clamps against the boundary and
  // the shadow comes back as a hard-edged square, filling in the concave
  // corners between the lobes — which reads as a grey box behind the mascot and
  // is the opposite of what a shadow is for.
  const pad = Math.ceil(blur * 3);
  const { width, height } = await sharp(cutout).metadata();
  const size = { width: width + pad * 2, height: height + pad * 2 };

  // Padded while it is still RGBA, then reduced to its alpha. Extending a
  // single-channel image does not honour the background and comes back opaque,
  // which puts a solid ring around the shadow and defeats the padding.
  const padded = await sharp(cutout)
    .extend({
      top: pad,
      bottom: pad,
      left: pad,
      right: pad,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  const alpha = await sharp(padded)
    .extractChannel("alpha")
    .blur(blur)
    .linear(opacity, 0)
    .toBuffer();

  const image = await sharp({
    create: { ...size, channels: 3, background: CORAL_SHADOW },
  })
    .joinChannel(alpha)
    .png()
    .toBuffer();

  return { image, pad };
}

/**
 * The type and the plate under it, as one SVG.
 *
 * No bloom, unlike the route cards and the covers: those set ink over a
 * photograph that may or may not have obliged the framing, and need the white
 * pad to stay readable over whatever landed there. This ground is a flat fill
 * that this file drew itself, so the contrast is known and a bloom would only
 * add a halo nothing needs.
 */
async function plate({ eyebrow, display, url }) {
  const kicker = await place({
    text: eyebrow,
    style: TEXT,
    cap: EYEBROW.cap,
    tracking: EYEBROW.tracking,
    left: TEXT_LEFT,
    baseline: EYEBROW.baseline,
    fill: "#ffffff",
  });

  const date = await place({
    text: display,
    style: DISPLAY,
    cap: DISPLAY_LINE.cap,
    tracking: 0,
    left: TEXT_LEFT,
    baseline: DISPLAY_LINE.baseline,
    fill: "#ffffff",
  });

  // The pill hangs off the right margin, the way the kind badge does on every
  // route card, so the two layouts share a rule rather than each inventing one.
  const measured = await metrics(url, TEXT, PILL.tracking);
  const pillWidth = Math.round(
    measured.width * (PILL.cap / measured.cap) + PILL.padX * 2,
  );
  const pillLeft = WIDTH - MARGIN - pillWidth;
  const pillTop = Math.round((HEIGHT - PILL.height) / 2);

  const link = await place({
    text: url,
    style: TEXT,
    cap: PILL.cap,
    tracking: PILL.tracking,
    left: pillLeft + PILL.padX,
    baseline: pillTop + Math.round((PILL.height + PILL.cap) / 2),
    fill: CORAL_STRONG,
  });

  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <defs>
    <radialGradient id="lift" cx="0.16" cy="0.5" r="0.62">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.13"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${CORAL}"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#lift)"/>
  <g fill-opacity="0.88">${kicker.markup}</g>
  ${date.markup}
  <rect x="${pillLeft}" y="${pillTop}" width="${pillWidth}" height="${PILL.height}" rx="${PILL.height / 2}" fill="#ffffff"/>
  ${link.markup}
</svg>`,
  );
}

/**
 * One entry per banner. The date and the shortlink are the whole message, so
 * they are written out rather than derived: `PH_GO_LIVE_MS` is a UTC instant in
 * a TypeScript module this script cannot import, and a banner that quietly
 * renders the day before after a timezone change is worse than one that has to
 * be edited by hand.
 */
const banners = {
  "ph-launch": {
    eyebrow: "LAUNCHING ON PRODUCT HUNT",
    display: "AUGUST 23",
    url: "construct.computer/ph",
  },
};

const args = process.argv.slice(2);
const name = args[0];

if (!name || args.includes("--list")) {
  console.log(
    `Usage: pnpm banner <name>\nKnown banners:\n  ${Object.keys(banners).join("\n  ")}`,
  );
  process.exit(name ? 0 : 1);
}

const banner = banners[name];
if (!banner) {
  throw new Error(
    `Unknown banner "${name}". Add it to scripts/generate-banner.mjs. Known:\n  ${Object.keys(banners).join("\n  ")}`,
  );
}

await preflight();
await mkdir(outputDirectory, { recursive: true });

const cutout = await mascot(MASCOT_BOX);
const { image: shadow, pad } = await dropShadow(cutout);
const mascotLeft = MARGIN;
const mascotTop = Math.round((HEIGHT - MASCOT_BOX) / 2);

/** Down and very slightly right, as if lit from the same high front-left. */
const SHADOW_OFFSET = { x: 4, y: 12 };

const destination = path.join(outputDirectory, `${name}.png`);
await writeFile(
  destination,
  await sharp(await plate(banner))
    .composite([
      {
        input: shadow,
        left: mascotLeft + SHADOW_OFFSET.x - pad,
        top: mascotTop + SHADOW_OFFSET.y - pad,
      },
      { input: cutout, left: mascotLeft, top: mascotTop },
    ])
    .png()
    .toBuffer(),
);

console.log(
  `${path.relative(root, destination)}  ${WIDTH}x${HEIGHT}  (${WIDTH / HEIGHT}:1)`,
);
