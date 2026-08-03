import { appendFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

import { generateImage } from "./og/gemini.mjs";
import { defaultModel, formatTokens, formatUsd } from "./og/pricing.mjs";
import { referenceImages } from "./og/brand-references.mjs";

/**
 * Recolours an existing landing asset into the brand palette, in place.
 *
 * Image-to-image rather than a fresh generation: the pricing scenes are well
 * staged and only their colour is wrong, so the source is sent as the first and
 * most heavily weighted reference with an instruction to preserve everything
 * except palette and lighting.
 *
 *   pnpm retheme public/assets/landing/pricing/lite-v3.webp
 *   pnpm retheme <file> --out <file>    write elsewhere instead of in place
 *   pnpm retheme <file> --dry-run       print the prompt, call nothing
 */

const root = process.cwd();
const ledgerPath = path.join(root, "assets/og/generation-log.jsonl");

try {
  process.loadEnvFile(path.join(root, ".env"));
} catch {
  // No .env — the key may come from the environment instead.
}

const model = process.env.GEMINI_IMAGE_MODEL ?? defaultModel;

/**
 * Aspect ratios Gemini accepts, mapped to their numeric value. The source is
 * matched to the nearest one and then resized back to its exact dimensions, so
 * the asset stays a drop-in replacement whatever the model returns.
 */
const ASPECT_RATIOS = {
  "1:1": 1,
  "4:5": 0.8,
  "5:4": 1.25,
  "3:4": 0.75,
  "4:3": 4 / 3,
  "2:3": 2 / 3,
  "3:2": 1.5,
  "9:16": 0.5625,
  "16:9": 16 / 9,
  "21:9": 21 / 9,
};

function nearestAspect(width, height) {
  const target = width / height;
  return Object.entries(ASPECT_RATIOS).reduce(
    (best, [name, value]) =>
      Math.abs(value - target) < Math.abs(ASPECT_RATIOS[best] - target)
        ? name
        : best,
    "1:1",
  );
}

const instruction = `Recolour the attached image into the Construct Computer palette. This is a retheme, not a new illustration.

PRESERVE EXACTLY
Every object, its shape, its position, its size, and its perspective. The camera, the framing, and the composition. The mascot's pose and placement. Nothing is added, removed, or rearranged — someone comparing the two side by side should see the same scene, relit.

CHANGE
The palette and the lighting, from a dark navy studio to a bright, airy, high-key one.

  Background       deep navy  ->  #FFFFFF pure white, drifting to #F2FCFE
  Mid tones        navy blue  ->  #E8FAFF and #B6ECFB pale cyan
  Accents          blue glow  ->  #38C6F4 and #01B4C8 brand cyan
  Deep shadow      near-black ->  #017B89 deep teal, used sparingly
  The mascot's eyes stay deep navy #1B3A6B. That is the only dark value left.

No purple, magenta, orange, red, yellow, or green anywhere. No black, no dark
background, no vignette, no dark corners. Light falls off to pure white at every
edge instead of into darkness. Surfaces that read as glowing screens in the dark
should now read as frosted glass panels in daylight — softly lit, not emissive.

The result must sit comfortably beside the attached brand references: same
material, same light, same restraint. Do not render any text, letters, numbers,
or labels — if the source contains any, replace them with the same soft grey
placeholder bars used in the references.`;

const args = process.argv.slice(2);
const source = args[0];
if (!source || source.startsWith("--")) {
  throw new Error("Usage: pnpm retheme <file> [--out <file>] [--dry-run]");
}
const outIndex = args.indexOf("--out");
const destination = outIndex === -1 ? source : args[outIndex + 1];
const dryRun = args.includes("--dry-run");

const absolute = path.resolve(root, source);
const { width, height, format } = await sharp(absolute).metadata();
const aspect = nearestAspect(width, height);

console.log(
  `${source}\n  ${width}x${height} ${format} -> nearest ${aspect}, resized back to ${width}x${height}`,
);

if (dryRun) {
  console.log(`\n${instruction}`);
  process.exit(0);
}

const started = Date.now();
const result = await generateImage({
  model,
  prompt: instruction,
  // The source leads, so the model treats the brand images as palette guidance
  // rather than as compositions to borrow from.
  references: [
    {
      file: path.relative(root, absolute),
      note: "THE IMAGE TO RETHEME. Preserve its composition, objects, and camera exactly; change only its colour and lighting.",
    },
    ...referenceImages,
  ],
  aspectRatio: aspect,
  imageSize: "2K",
});

await writeFile(
  path.resolve(root, destination),
  await sharp(result.data)
    .resize(width, height, { fit: "cover" })
    .webp({ quality: 90 })
    .toBuffer(),
);

const seconds = ((Date.now() - started) / 1000).toFixed(1);
console.log(
  `  -> ${destination}  ${formatUsd(result.cost.usd)} ` +
    `(${formatTokens(result.cost.input)} in / ${formatTokens(result.cost.output)} out, ${seconds}s)`,
);

await appendFile(
  ledgerPath,
  `${JSON.stringify({
    at: new Date().toISOString(),
    name: path.basename(destination),
    layout: "retheme",
    model,
    input: result.cost.input,
    output: result.cost.output,
    usd: result.cost.usd,
    file: destination,
  })}\n`,
);
