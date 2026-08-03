import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

import { generateImage } from "./og/gemini.mjs";
import { posterDirectory } from "./og/manifest.mjs";
import { formatUsd } from "./og/pricing.mjs";

/**
 * Throwaway: the homepage card, poster direction, round three.
 *
 * Round two drifted into flat vector cartoon, which was the prompt's fault:
 * "screen-printed" and "flat printed blue" describe the ground, and with
 * nothing said about the objects the model illustrated them too. The
 * reference works precisely because a real photograph sits on a flat field.
 * That split is now stated as a hard rule, and it is the main thing being
 * tested here.
 */

const root = process.cwd();
process.loadEnvFile(path.join(root, ".env"));
const out = path.join(posterDirectory, "candidates");

const references = [
  {
    file: "public/favicon.png",
    note: "THE MASCOT — its exact silhouette. A rounded square body with one semicircular bump protruding from each of its four corners, and two upright deep-navy capsule eyes set close together in the middle. Trace this outline. Never a dome, an egg, an oval, a circle, a plain squircle with no bumps, a flower, or anything with limbs. Render it as a real moulded glass object, never as a drawing.",
  },
  {
    file: "assets/refs/poster-1.png",
    note: "THE DIRECTION. A flat printed blue poster with colossal outlined display type, and a REAL PHOTOGRAPH of a beige CRT monitor cut out and placed over real photographic clouds. Note carefully: the ground is flat graphic, the objects are photographic. Match that split exactly. Do not copy its words.",
  },
  {
    file: "assets/og/poster/candidates/home-25.webp",
    note: "An approved card in this direction, with the photography right: a genuine studio photograph of a CRT and a real glass mascot on the flat blue. Match this level of photographic realism in the objects. Its vertical wordmark is printed twice, which is a mistake: print it once only.",
  },
];

const PHOTOGRAPHY = `THE CRITICAL RULE — the ground is graphic, the objects are photographic
The blue field, the display type, the ruled boxes and the wordmark are flat printed graphics.
Everything else is a real photograph, cut out and placed onto that field: a genuine beige CRT monitor shot in a studio with real plastic texture, real moulded seams, real vents and a real glass screen; real photographic clouds with true depth and soft edges; and the mascot as a real object moulded from thick clear glass with true refraction, real caustics and hard specular highlights.
Nothing in this image is illustrated, drawn, vector, cartoon, cel-shaded, anime, or line-art. No outlines drawn around any object. No flat colour fills on any object. No drawn or hatched shadows. If it is an object, it was photographed.`;

const STYLE = `CONSTRUCT COMPUTER — homepage card, "POSTER" direction.

A printed poster from the height of consumer computing: a flat saturated blue field, colossal outlined display type cutting across the frame, and a real photograph of a beige CRT monitor floating over real clouds with the glass mascot sitting on top of it.

CANVAS
16:9 landscape, filling the frame edge to edge. No border, no mockup, no drop shadow around the canvas.
The top 4% and the bottom 4% will be cropped away before publishing. Every letter must sit inside the middle 92%, and nothing may touch the bottom edge.

THIS IS AN OPEN GRAPH CARD, seen small in a feed. The display type has to hold at that size and every smaller line has to stay genuinely readable.

${PHOTOGRAPHY}

COLOUR
Flat saturated printed blue for the field, pure white and black for the type, and the true photographic colours of the objects: warm grey-beige plastic, white cloud, clear blue-grey glass. Nothing else. No purple, orange, red, green, or gold.

CONSTANT ELEMENTS
1. The photographed beige CRT monitor floating over photographic clouds, its screen showing a pale blue desktop with a few small overlapping windows, and the glass mascot sitting on top of its casing. The mascot is clear of the display type and never overlaps a letter.
2. CONSTRUCT in heavy white capitals running vertically up the right edge, reading bottom to top. It appears EXACTLY ONCE. Do not repeat it, do not mirror it, and do not print a second copy anywhere in the frame.
3. "construct.computer" in small white type at the bottom right, its baseline no lower than 88% down from the top so the crop cannot reach it.

SPELLING is not negotiable. Every string specified below must appear exactly as written, correctly spelled, with no extra words, no duplicated words, no invented tagline, and no malformed or half-formed letters. The domain is "construct.computer", never "os.construct.computer". No em dashes anywhere: use a comma or a hyphen. No price, rating, version number, or QR code.`;

const STRIP = `CAPABILITY STRIP
A single row of six small white-ruled rectangular boxes runs along the bottom of the frame, evenly spaced and well inside the safe band, each holding one word in small white capitals, in this order: BROWSER, TERMINAL, FILES, MAIL, CALENDAR, WORKFLOWS.`;

const SPEC = `SPECIFICATION BLOCK
A compact block sits in the lower left in white monospace, with leader dots between each label and its value, exactly these four lines and no others:
   Runs on ......... its own computer
   Remembers ....... everything, and shows you
   Works ........... browser, terminal, mail, files
   Installs ........ nothing`;

const DISPLAY = {
  "247": `DISPLAY TYPE
"24/7" set colossally across the upper part of the frame in outlined capitals, white filled with a heavy black outline, cropping against the sides of the frame. It is by far the largest thing on the card.`,
  employee: `DISPLAY TYPE
"AI EMPLOYEE" set colossally across the upper part of the frame in outlined capitals, white filled with a heavy black outline. It is by far the largest thing on the card.`,
};

const CAPTION = `SUPPORTING COPY
Centred beneath the machine, in a neutral white sans, exactly: "An AI employee with its own computer"`;

const variants = [
  { name: "247-spec", body: `${DISPLAY["247"]}\n\n${SPEC}` },
  { name: "247-strip", body: `${DISPLAY["247"]}\n\n${CAPTION}\n\n${STRIP}` },
  { name: "employee-spec", body: `${DISPLAY.employee}\n\n${SPEC}` },
  {
    name: "employee-strip",
    body: `${DISPLAY.employee}\n\n${CAPTION}\n\n${STRIP}`,
  },
  { name: "247-both", body: `${DISPLAY["247"]}\n\n${SPEC}\n\n${STRIP}` },
  {
    name: "employee-both",
    body: `${DISPLAY.employee}\n\n${SPEC}\n\n${STRIP}`,
  },
];

await mkdir(out, { recursive: true });
let spent = 0;
const legend = [];

for (const [index, variant] of variants.entries()) {
  const number = 30 + index;
  process.stdout.write(`[${index + 1}/6] ${variant.name} … `);
  legend.push(`  ${number}  ${variant.name}`);
  try {
    const result = await generateImage({
      model: "gemini-3-pro-image",
      prompt: `${STYLE}\n\n${variant.body}`,
      references,
      aspectRatio: "16:9",
      imageSize: "2K",
    });
    spent += result.cost.usd;
    await writeFile(
      path.join(out, `home-${number}.webp`),
      await sharp(result.data).webp({ quality: 95, effort: 6 }).toBuffer(),
    );
    console.log(formatUsd(result.cost.usd));
  } catch (error) {
    console.log(`FAILED — ${error.message}`);
  }
}

console.log(`\nThis run ${formatUsd(spent)}\n${legend.join("\n")}`);
