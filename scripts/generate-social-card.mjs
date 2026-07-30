import { Buffer } from "node:buffer";
import { existsSync } from "node:fs";
import {
  appendFile,
  mkdir,
  readdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

import { generateImage } from "./og/gemini.mjs";
import { defaultModel, formatTokens, formatUsd } from "./og/pricing.mjs";
import { referenceImages } from "./og/prompt.mjs";

/**
 * Wide dark-theme key art for social posts — X article covers, link previews,
 * anything that sits inside someone else's dark UI rather than on our own white
 * pages.
 *
 * Separate from `pnpm og:generate` on purpose. That set is route-bound, high-key
 * white, and 16:9 into a frame that draws the type; these are one-offs, dark,
 * and 5:2. What they share is the part worth sharing: the Gemini client, the
 * brand reference images, the spend ledger, and the rule that type is drawn as
 * vector text rather than generated.
 *
 *   pnpm social <name>                   generate art, then set the type
 *   pnpm social <name> --candidates 3    options to choose between
 *   pnpm social <name> --frame-only      re-set the type over art already saved
 *   pnpm social <name> --dry-run         print the prompt, call nothing
 *
 * `--frame-only` is the one to reach for while iterating: headline changes cost
 * nothing, because the art it draws over is already on disk.
 */

const root = process.cwd();
const outputDirectory = path.join(root, "assets/social");
const artDirectory = path.join(outputDirectory, "art");
const ledgerPath = path.join(root, "assets/og/generation-log.jsonl");

try {
  process.loadEnvFile(path.join(root, ".env"));
} catch {
  // No .env — the key may come from the environment instead.
}

const model = process.env.GEMINI_IMAGE_MODEL ?? defaultModel;

/**
 * X article covers are 5:2, which Gemini does not offer. 21:9 is the widest it
 * accepts and the nearest above 5:2, so art is generated there and
 * centre-cropped down — the prompt keeps the subject out of the top and bottom
 * bands that the crop eats.
 */
const ASPECT_RATIO = "21:9";
const WIDTH = 2000;
const HEIGHT = 800;

/** The share of the frame reserved for type, kept quiet by the prompt. */
const TYPE_COLUMN = 0.46;

// ─── Type ────────────────────────────────────────────────────────────────────

const PAD_X = 104;
const TEXT_MAX_WIDTH = Math.round(WIDTH * TYPE_COLUMN) - PAD_X - 48;

const PAPER = "#F2FCFE";
const ACCENT = "#38C6F4";
const DEEP_ACCENT = "#01B4C8";
const MUTED = "#8FB6C4";

/**
 * Helvetica Neue Condensed Black, requested the way Pango resolves it. A heavy
 * condensed grotesque is what makes a headline hold at feed size; Georgia stays
 * on the wordmark so the card still reads as part of the same brand as the OG
 * set.
 */
const DISPLAY_FONT = "'Helvetica Neue', Helvetica, sans-serif";
const WORDMARK_FONT = "Georgia, 'Times New Roman', serif";
const UI_FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * Approximate advance widths for condensed black caps, normalised to font size.
 * librsvg cannot measure text, so the fit is estimated and errs narrow: a
 * headline one step smaller than it had to be looks deliberate, one that runs
 * into the artwork does not.
 */
const WIDE_CAPS = new Set(["M", "W"]);
const NARROW_CAPS = new Set([..."IJ.,;:'!|()[]-"]);

function glyphWidth(character) {
  if (character === " ") return 0.24;
  if (WIDE_CAPS.has(character)) return 0.74;
  if (NARROW_CAPS.has(character)) return 0.28;
  return 0.53;
}

function textWidth(text, size) {
  let total = 0;
  for (const character of text.toUpperCase()) total += glyphWidth(character);
  return total * size;
}

/** The largest size in the ladder that keeps every hand-broken line in column. */
function headlineSize(lines) {
  const ladder = [150, 136, 122, 110, 98, 88];
  return (
    ladder.find((size) =>
      lines.every((line) => textWidth(line, size) <= TEXT_MAX_WIDTH),
    ) ?? 78
  );
}

/**
 * The type stack: wordmark, headline, subline, domain. Set over a scrim that
 * darkens the left of the frame — the prompt asks the model to keep that side
 * quiet, but a headline cannot depend on it having obliged, and unreadable is a
 * worse failure than slightly veiled.
 */
function overlaySvg({ headline, accentFrom = 1, subline }) {
  const size = headlineSize(headline);
  const lineHeight = Math.round(size * 0.94);
  const capHeight = size * 0.72;

  const blockHeight = (headline.length - 1) * lineHeight + capHeight;
  const firstBaseline = Math.round((HEIGHT - blockHeight) / 2 + capHeight) + 14;

  const headlineLines = headline
    .map(
      (line, index) =>
        `<tspan x="${PAD_X}" dy="${index === 0 ? 0 : lineHeight}" fill="${
          index >= accentFrom ? ACCENT : PAPER
        }">${escapeXml(line.toUpperCase())}</tspan>`,
    )
    .join("");

  const sublineY = firstBaseline + (headline.length - 1) * lineHeight + 62;

  return `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="scrim" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#05070D" stop-opacity="0.93"/>
      <stop offset="0.4" stop-color="#05070D" stop-opacity="0.86"/>
      <stop offset="0.68" stop-color="#05070D" stop-opacity="0.32"/>
      <stop offset="1" stop-color="#05070D" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#scrim)"/>
  <text x="${PAD_X}" y="112" font-family="${WORDMARK_FONT}" font-size="38" font-style="italic" fill="${PAPER}">Construct<tspan fill="${DEEP_ACCENT}">Computer</tspan></text>
  <text x="${PAD_X}" y="${firstBaseline}" font-family="${DISPLAY_FONT}" font-size="${size}" font-weight="900" font-stretch="condensed" letter-spacing="-1" fill="${PAPER}">${headlineLines}</text>
  <text x="${PAD_X}" y="${sublineY}" font-family="${UI_FONT}" font-size="30" font-weight="500" fill="${MUTED}">${escapeXml(subline)}</text>
  <circle cx="${PAD_X + 6}" cy="${HEIGHT - 74}" r="6" fill="${DEEP_ACCENT}"/>
  <text x="${PAD_X + 26}" y="${HEIGHT - 66}" font-family="${UI_FONT}" font-size="26" fill="${MUTED}">construct.computer</text>
</svg>`;
}

// ─── Art ─────────────────────────────────────────────────────────────────────

/**
 * The dark inverse of `scripts/og/prompt.mjs`. A separate contract rather than a
 * flag on that one because every value in it differs, and because editing that
 * file re-bases all 28 route OG images.
 */
const styleContract = `STYLE CONTRACT — Construct Computer dark key art.

MEDIUM
Soft 3D product key art: clean vector illustration crossed with a frosted-glass 3D render. Marketing-grade, weightless, precise. Not photographic, not painterly, not hand-drawn.

CANVAS
Very wide 21:9 landscape banner. Artwork runs edge to edge with no border, frame, rounded corners, or mockup presentation. The top and bottom eighth of the frame will be cropped away, so keep every important form clear of them and let those bands fall off to near-black.

PALETTE — use these values and nothing else
  #05070D  near-black navy — the dominant value, the void everything floats in
  #0A1424  deep navy — background forms
  #10243A  navy, for panel bodies
  #14455F  desaturated teal, for edges in shadow
  #01B4C8  brand cyan — the primary light source
  #38C6F4  mid cyan — glass edges and rim light
  #B6ECFB  light cyan — bright highlights
  #F2FCFE  near-white — specular hits only, never a field
No purple, magenta, orange, red, yellow, or green anywhere. No white background. Nothing is pure white except a specular highlight.

LIGHT
A dark studio lit entirely from within the subjects. One saturated cyan bloom behind the focal form, light falling off to near-black at every edge. Glass catches thin bright cyan rim light along its contours. No hard shadows, no cast shadows on a ground plane, no lens flare, no visible light source.

CAMERA
Straight-on, level with the subject, like a product shot in a blacked-out studio. Never isometric. Never a three-quarter aerial view. Never looking down onto a ground plane, platform, dais, or podium — the forms float in dark space and nothing rests on a visible surface. No horizon line, no dutch angle, no perspective distortion.

DEPTH AND DRAMA
Three clear planes: a crisp, brightly lit focal subject in front; mid-ground forms at visibly reduced brightness; a background that dissolves into near-black. Scale reads better than quantity — one large, confident, beautifully lit form beats five small ones. Keep the glow soft and volumetric, light diffusing through air and glass, never a hard neon outline traced around a shape.

THE MASCOT — include it unless the SUBJECT says otherwise
A small creature made of thick clear glass, shaped like a four-lobed rounded clover: a puffy square cloud with one soft bump at each corner. It is genuinely transparent — whatever sits behind it is visibly distorted and refracted through its body, the way a solid glass paperweight bends what is behind it. In this dark setting it is lit from within, an ice-blue #B6ECFB glow through its body with bright cyan rim light on its upper left. Two vertical rounded-capsule eyes in deep navy #1B3A6B, set close together near the centre, both the same size and perfectly upright — dark against its own lit body, which is what makes them read. No mouth, no nose, no eyebrows, no limbs, no hands, no feet, no accessories. Calm and attentive — never cute-cartoonish, never robotic, never anthropomorphised. Match the attached reference exactly, including its proportions; it is a logo, not a character to reinterpret.

SUPPORTING FORMS — draw only from this vocabulary
Rounded-rectangle glass panels with thin luminous cyan borders and a soft inner glow. Thin circuit traces running at 90 and 45 degrees only, dim cyan, low contrast, never crossing the focal subject. Faint dashed concentric orbit rings. Small pill-shaped chips and rounded app tiles. Everything floats with generous air around it.

COMPOSITION
The left ${Math.round(TYPE_COLUMN * 100)}% of the frame is reserved for a headline that is set afterwards: keep it near-empty — unbroken near-black, no forms, no detail, nothing that would fight large type placed over it. Stage the focal subject in the right ${100 - Math.round(TYPE_COLUMN * 100)}%, filling that side generously, with its cyan bloom spilling leftward into the empty space to tie the halves together and dying out well before the left edge.

ABSOLUTELY NOT
No text, letters, numbers, words, labels, captions, UI copy, watermarks, or logos of any kind — the frame supplies all type, and any rendered text will be discarded with the image. Where a panel would carry writing, use soft blurred cyan placeholder bars instead. No humans, faces, hands, or body parts. No photorealism, film grain, noise, lens flare, or bokeh. No white or pale background. No neon cyberpunk signage, glitch effects, isometric grids, wireframe globes, brains wired with circuits, humanoid robots, handshakes, lightbulbs, gears, or jigsaw pieces. No busy collage. No flat, evenly-lit composition where nothing is the subject. No platform, dais, podium, pedestal, plinth, or floor plane beneath the subject.`;

/**
 * One entry per card. Subjects are staged scenes, not concepts: the model can
 * draw "a cube of glass with the work visible inside it" and cannot draw
 * "observability". The headline is hand-broken because poster type always is,
 * and `accentFrom` is the line the colour switches to cyan on.
 */
const cards = {
  "supervised-agents": {
    title: "Every AI agent horror story has the same root cause",
    headline: ["Agents you", "can watch"],
    accentFrom: 1,
    subline: "Supervision, not blind trust.",
    subject: `A single hero form: a large cube of thick, genuinely transparent glass with luminous cyan edges, floating in dark space in the right half of the frame. It is an open enclosure, not a solid block — through its front face you see straight into it, and the far edges are visible through the near ones.

The Construct mascot floats at the centre of the cube, lit from within, the brightest thing in the frame, refracting the cyan light around it. Suspended inside the cube around the mascot, at slightly different depths and turned at gentle angles, are four small rounded glass panels carrying soft blurred cyan placeholder bars where writing would be — the work, mid-flight and visible.

To the right of the cube, partly cropped by the frame edge, a cascade of five small rounded glass activity rows steps down and back into the dark, each dimmer than the one before, each with a tiny bright cyan dot at its left end — a feed of what just happened, receding.

A saturated cyan bloom sits directly behind the glass cube. A faint dashed orbit ring passes behind it. Thin dim cyan circuit traces run horizontally at 90 and 45 degrees in the far background on the right side only. The left half of the frame is empty near-black, reached by nothing but the soft outer falloff of the bloom.`,
  },
};

// ─── Run ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const name = args[0];
if (!name || name.startsWith("--")) {
  throw new Error(
    `Usage: pnpm social <name> [--candidates <n>] [--frame-only] [--dry-run]\nKnown cards:\n  ${Object.keys(cards).join("\n  ")}`,
  );
}
const card = cards[name];
if (!card) {
  throw new Error(
    `Unknown card "${name}". Add it to scripts/generate-social-card.mjs. Known:\n  ${Object.keys(cards).join("\n  ")}`,
  );
}

function flag(key) {
  const index = args.indexOf(key);
  return index === -1 ? null : (args[index + 1] ?? "");
}
const candidates = Number(flag("--candidates") ?? 1);
const frameOnly = args.includes("--frame-only");
const dryRun = args.includes("--dry-run");

const prompt = `${styleContract}

CONTEXT
This is the cover image for "${card.title}", a post from construct.computer. It is seen inside a dark social feed at roughly the width of a phone, so it has to read at a glance and hold up shrunk.

SUBJECT — the only thing that changes between cards in this set
${card.subject}

OUTPUT
A single wordless illustration obeying the style contract above.`;

if (dryRun) {
  console.log(prompt);
  process.exit(0);
}

/** Draws the type over one piece of art and writes the finished card. */
async function setType(artFile, label) {
  const destination = path.join(outputDirectory, `${label}.png`);
  const filled = await sharp(await readFile(artFile))
    .resize(WIDTH, HEIGHT, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();
  await writeFile(
    destination,
    await sharp(filled)
      .composite([{ input: Buffer.from(overlaySvg(card)), left: 0, top: 0 }])
      .png()
      .toBuffer(),
  );
  return destination;
}

await mkdir(artDirectory, { recursive: true });

// `--frame-only` re-sets the type over every piece of art already saved for this
// card, so the headline can be reworked without paying to regenerate anything.
if (frameOnly) {
  // Matches both `<name>.webp` (a card down to its one chosen piece of art) and
  // `<name>-2.webp` (candidates still being compared).
  const pattern = new RegExp(`^${name}(-\\d+)?\\.webp$`);
  const existing = (await readdir(artDirectory))
    .filter((file) => pattern.test(file))
    .sort();
  if (!existing.length) {
    throw new Error(
      `No saved art for "${name}" in ${path.relative(root, artDirectory)}. Run without --frame-only first.`,
    );
  }
  for (const file of existing) {
    const label = path.basename(file, ".webp");
    const written = await setType(path.join(artDirectory, file), label);
    console.log(`${file} → ${path.relative(root, written)}`);
  }
  process.exit(0);
}

let spent = 0;
for (let candidate = 1; candidate <= candidates; candidate += 1) {
  const label = `${name}-${candidate}`;
  process.stdout.write(`[${candidate}/${candidates}] ${label} … `);

  const started = Date.now();
  const result = await generateImage({
    model,
    prompt,
    references: referenceImages,
    aspectRatio: ASPECT_RATIO,
    imageSize: "2K",
  });

  // The art is kept beside the finished card so the type can be reworked later
  // without another call. WebP q95 stores it a fraction of the PNG's size.
  const artFile = path.join(artDirectory, `${label}.webp`);
  if (existsSync(artFile)) {
    throw new Error(`${path.relative(root, artFile)} already exists.`);
  }
  await writeFile(
    artFile,
    await sharp(result.data).webp({ quality: 95, effort: 6 }).toBuffer(),
  );
  const destination = await setType(artFile, label);

  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  spent += result.cost.usd;
  console.log(
    `${formatUsd(result.cost.usd)}  ` +
      `(${formatTokens(result.cost.input)} in / ${formatTokens(result.cost.output)} out, ${seconds}s)\n` +
      `        ${path.relative(root, destination)}  ${WIDTH}x${HEIGHT}`,
  );

  await appendFile(
    ledgerPath,
    `${JSON.stringify({
      at: new Date().toISOString(),
      name: label,
      layout: "social",
      model,
      imageSize: "2K",
      input: result.cost.input,
      output: result.cost.output,
      usd: result.cost.usd,
      file: path.relative(root, destination),
    })}\n`,
  );
}

console.log(
  `\nThis run ${formatUsd(spent)}\n` +
    `Rework the type for free with \`pnpm social ${name} --frame-only\`.`,
);
