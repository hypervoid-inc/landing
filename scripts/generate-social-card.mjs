import { Buffer } from "node:buffer";
import { existsSync } from "node:fs";
import {
  appendFile,
  mkdir,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

import { generateImage } from "./og/gemini.mjs";
import { defaultModel, formatTokens, formatUsd } from "./og/pricing.mjs";
import { referenceImages } from "./og/brand-references.mjs";
import {
  FORBIDDEN,
  FORBIDDEN_FILLER,
  FORBIDDEN_FRAME,
  FORBIDDEN_MASCOT,
  IN_WORLD_TEXT,
  MASCOT,
  OBJECTS,
  STUDIO,
  posterReferences,
} from "./og/poster.mjs";
import {
  BRAND,
  BRAND_STRONG,
  DISPLAY,
  INK,
  INK_MUTED,
  TEXT,
  bloom,
  metrics,
  place,
  preflight,
} from "./og/typeset.mjs";

/**
 * Wide key art for social posts — X article covers, link previews, anything
 * that has to work at 5:2 rather than at the 1200x630 every route card is cut
 * to.
 *
 * Separate from `pnpm og:generate` on purpose. That set is route-bound and
 * 16:9; these are one-offs at 5:2, written by hand for one post. What they
 * share is the part worth sharing: the Gemini client, the brand references, the
 * spend ledger, and the rule that type is drawn as vector text rather than
 * generated — which the route cards adopted from here.
 *
 *   pnpm social <name>                   generate art, then set the type
 *   pnpm social <name> --candidates 3    options to choose between
 *   pnpm social <name> --pick 3          promote one candidate, clear the rest
 *   pnpm social <name> --frame-only      re-set the type over art already saved
 *   pnpm social <name> --dry-run         print the prompt, call nothing
 *
 * `--frame-only` is the one to reach for while iterating: headline changes cost
 * nothing, because the art it draws over is already on disk.
 *
 * ## Two themes, and which one to use
 *
 * `studio` is the house style and the default for anything new: the bright
 * paper-white photograph the 34 route cards are shot in, widened. `dark` is the
 * original glowing-glass key art, kept only because `supervised-agents` shipped
 * in it and regenerating a published banner would change a live image for no
 * reason.
 *
 * Do not start a new card in `dark`. Its vocabulary — floating glass panels,
 * dashed concentric orbit rings, cyan bloom on near-black — is the exact look
 * `docs/og-images.md` names as the failure mode the whole set was rebased away
 * from, because it is what every image model reaches for unprompted and what
 * every AI company already looks like. It was written before that rebase.
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

// ─── Type: dark ──────────────────────────────────────────────────────────────

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

// ─── Type: studio ────────────────────────────────────────────────────────────

/**
 * The route cards' type layer, re-laid out for a 2000x800 banner.
 *
 * Positions are `scripts/og/typeset.mjs`'s own, scaled by 800/630 and rounded,
 * so a cover and a blog card read as the same typography at two sizes rather
 * than as two designs. Everything that does the actual work — measuring ink off
 * a real render, placing a string so its capitals stand exactly `cap` tall, and
 * the white bloom that keeps type legible over a photograph that ignored the
 * framing — is imported from there rather than reimplemented here.
 *
 * The one addition is the subline. A route card has a headline and nothing
 * else; a cover is read once, in a feed, with no page behind it, so it gets one
 * line to say what the post actually claims.
 */
const STUDIO_COLUMN = 0.48;
const STUDIO_TYPE = {
  margin: 104,
  wordmark: { baseline: 96, cap: 34, tracking: 0.16 },
  badge: { cap: 17, tracking: 0.14, padX: 20, padY: 13 },
  /** Cap height by line count, and baseline spacing as a multiple of it. */
  headlineCap: { 1: 152, 2: 126, 3: 102 },
  leading: 1.18,
  /** The headline never runs past this, whatever it costs in size. */
  column: Math.round(WIDTH * STUDIO_COLUMN) - 104 - 40,
  headlineBaseline: 636,
  subline: { baseline: 694, cap: 21, tracking: 0.01 },
  domain: { baseline: 748, cap: 17, tracking: 0.01 },
};

/**
 * The same layout in two value schemes.
 *
 * `halo` is the colour of the bloom the type is set over, and it is the one
 * that has to flip: the bloom's whole job is to be the ground's own colour
 * spread thickly enough behind the glyphs that the artwork cannot read through
 * them. White behind white type would erase it.
 */
const TYPE_THEMES = {
  studio: {
    ink: INK,
    muted: INK_MUTED,
    accent: BRAND_STRONG,
    badge: BRAND,
    halo: "#ffffff",
  },
  loud: {
    ink: "#ffffff",
    muted: "#b4cbd4",
    accent: "#38c6f4",
    badge: "#38c6f4",
    halo: "#04070a",
  },
};

/** The headline block, scaled down only if a line would run past the column. */
async function studioHeadline(lines, accentFrom, theme) {
  const cap = STUDIO_TYPE.headlineCap[lines.length];
  if (!cap) {
    throw new Error(
      `Headlines run to at most three lines, got ${lines.length}`,
    );
  }

  const measured = await Promise.all(
    lines.map((line) => metrics(line, DISPLAY, 0)),
  );
  const widest = Math.max(
    ...measured.map((entry) => (entry.width / entry.cap) * cap),
  );
  const fitted =
    cap * (widest > STUDIO_TYPE.column ? STUDIO_TYPE.column / widest : 1);
  const advance = fitted * STUDIO_TYPE.leading;

  const placed = await Promise.all(
    lines.map((line, index) =>
      place({
        text: line,
        style: DISPLAY,
        cap: fitted,
        tracking: 0,
        left: STUDIO_TYPE.margin,
        baseline:
          STUDIO_TYPE.headlineBaseline - (lines.length - 1 - index) * advance,
        fill: index >= accentFrom ? theme.accent : theme.ink,
      }),
    ),
  );

  return {
    cap: fitted,
    solid: placed.map((entry) => entry.markup).join(""),
    white: placed.map((entry) => entry.draw(theme.halo)).join(""),
  };
}

/** The kind badge, in a hairline box hung off the right margin. */
async function studioBadge(eyebrow, theme) {
  const { badge, wordmark, margin } = STUDIO_TYPE;
  const right = WIDTH - margin;
  const height = badge.cap + badge.padY * 2;
  const top = Math.round(wordmark.baseline - wordmark.cap / 2 - height / 2);

  const measured = await metrics(eyebrow, TEXT, badge.tracking);
  const width = Math.round(
    measured.width * (badge.cap / measured.cap) + badge.padX * 2,
  );

  const rect = (stroke, weight = 2) =>
    `<rect x="${right - width + 1}" y="${top + 1}" width="${width - 2}" ` +
    `height="${height - 2}" fill="none" stroke="${stroke}" stroke-width="${weight}"/>`;

  const text = await place({
    text: eyebrow,
    style: TEXT,
    cap: badge.cap,
    tracking: badge.tracking,
    left: right - width + badge.padX,
    baseline: top + badge.padY + badge.cap,
    fill: theme.accent,
  });

  return {
    cap: badge.cap,
    solid: rect(theme.badge) + text.markup,
    // The hairline is the thinnest thing on the card, so it gets the halo too.
    white: rect(theme.halo, 4) + text.draw(theme.halo),
  };
}

async function studioLine(
  text,
  style,
  { baseline, cap, tracking },
  fill,
  theme,
) {
  const placed = await place({
    text,
    style,
    cap,
    tracking,
    left: STUDIO_TYPE.margin,
    baseline,
    fill,
  });
  return { cap, solid: placed.markup, white: placed.draw(theme.halo) };
}

/** The finished 2000x800 type layer, ready to composite over the photograph. */
async function studioTypeLayer({
  headline,
  accentFrom = 99,
  subline,
  eyebrow,
  theme: themeName = "studio",
}) {
  const theme = TYPE_THEMES[themeName] ?? TYPE_THEMES.studio;
  const mark = await place({
    text: "CONSTRUCT",
    style: DISPLAY,
    cap: STUDIO_TYPE.wordmark.cap,
    tracking: STUDIO_TYPE.wordmark.tracking,
    left: STUDIO_TYPE.margin,
    baseline: STUDIO_TYPE.wordmark.baseline,
    fill: theme.ink,
  });

  const blocks = [
    {
      cap: STUDIO_TYPE.wordmark.cap,
      solid: mark.markup,
      white: mark.draw(theme.halo),
    },
    await studioBadge(eyebrow, theme),
    await studioHeadline(headline, accentFrom, theme),
    await studioLine(subline, TEXT, STUDIO_TYPE.subline, theme.muted, theme),
    await studioLine(
      "construct.computer",
      TEXT,
      STUDIO_TYPE.domain,
      theme.muted,
      theme,
    ),
  ].map((block, index) => bloom(index, block));

  return sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">` +
        `<defs>${blocks.map((block) => block.defs).join("")}</defs>` +
        blocks.map((block) => block.body).join("") +
        `</svg>`,
    ),
  )
    .png()
    .toBuffer();
}

// ─── Art ─────────────────────────────────────────────────────────────────────

/**
 * The dark inverse of `scripts/og/poster.mjs`. A separate contract rather than a
 * flag on that one because every value in it differs, and because editing that
 * file re-bases all 28 route OG images.
 *
 * Frozen. Only `supervised-agents` is shot in it, and only because that banner
 * is already published. New cards use the studio contract below.
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
 * The route cards' own contract, widened.
 *
 * The studio, the palette, the mascot, the in-world writing, and the list of
 * things that are never in frame are imported byte-for-byte from
 * `scripts/og/poster.mjs`, so a cover and the 34 blog cards are the same shoot.
 * Only the three things that are genuinely different about a 5:2 banner are
 * written here: the canvas, the crop band, and a wider left column for type.
 *
 * Importing rather than copying is the point. A copied contract is one that
 * drifts the first time the set is retuned and nobody remembers there was a
 * second copy.
 */
const studioContract = `CONSTRUCT COMPUTER — WIDE SOCIAL BANNER
You are shooting one photograph in the same studio, on the same afternoon, as the set of route cards you have been shown. Same lighting rig, same surface, same staging. Only the object being photographed and the shape of the frame change.

CANVAS
Very wide 21:9 landscape banner, filling the frame edge to edge. No border, no frame, no rounded corners, no mockup presentation, no drop shadow around the canvas itself.
The top 5% and the bottom 5% of the frame will be cropped away before publishing. Keep the whole of the hero object inside the middle 90%.

${STUDIO}

${IN_WORLD_TEXT}

WHERE NOTHING GOES — this photograph carries no type, and has to leave room for it
The finished banner has words set over it afterwards, in a separate pass you are not doing. Your job is to photograph the objects so there is somewhere clean to put them. Stage the shot so that:

THE ONE FRAMING RULE, and the easiest one to get wrong:
Picture a vertical line drawn ${Math.round(STUDIO_COLUMN * 100)}% of the way across the frame from the left edge.

  EVERYTHING YOU PHOTOGRAPH SITS ENTIRELY TO THE RIGHT OF THAT LINE.

Nothing crosses it. Not the mascot, not the object it rests on, not a second object, not a corner, not a cable, not a cast shadow, not a highlight, not a blurred edge. If the arrangement is too wide to fit to the right of the line, shoot it from further back until it fits — do not let it stretch across.
Everything to the LEFT of that line is completely empty: plain, smooth, evenly lit pale background, from the top of the frame to the bottom, with nothing in it at all. It is nearly half the picture and it must read as deliberate, generous air.
Also keep the top 12% of the frame clear across the full width. Nothing rises into it.

This is a wide frame, and the temptation it creates is to fill it. Do not. The extra width is air, not room for more objects.

${FORBIDDEN}

OUTPUT
One finished 21:9 photograph obeying every rule above: bright, pale, calm, convincingly photographic, with the mascot's four-lobed form exactly as reference 1 shows it, and with no type anywhere on it.`;

/**
 * The night shoot: the same brand, photographed in a dark room.
 *
 * This exists because of where a cover is actually seen. The studio contract
 * above is high-key white, which is right on a white blog page and wrong in a
 * feed — inside X's dark UI a pale card reads as a blank rectangle and the eye
 * slides off it. The fix is not the old `dark` theme's glowing glass panels,
 * which is the filler this whole direction exists to avoid. It is the same real
 * objects, the same era, and the same mascot, shot at night with the machines
 * themselves as the only light.
 *
 * `MASCOT`, `OBJECTS`, and three of the four forbidden clauses are imported
 * from `poster.mjs` verbatim. Only the room changes: the ground, the light, the
 * palette, and the one forbidden clause that insists on a bright studio.
 *
 * Two clauses are load-bearing and were added after thinking about what a model
 * does with "a room full of switched-on monitors": the screens have to be
 * explicitly wordless, or every CRT comes back carrying garbled interface text,
 * and the glow has to be explicitly sourced to the screens in frame, or it
 * drifts into exactly the cyan haze the filler clause forbids.
 */
const nightContract = `CONSTRUCT COMPUTER — WIDE SOCIAL BANNER, NIGHT SHOOT
You are photographing the same objects, the same era, and the same mascot as the rest of this brand, in a different room. This banner is seen inside a dark social feed rather than on a white page, so the room is dark and the machines are the light.

CANVAS
Very wide 21:9 landscape banner, filling the frame edge to edge. No border, no frame, no rounded corners, no mockup presentation, no drop shadow around the canvas itself.
The top 5% and the bottom 5% of the frame will be cropped away before publishing. Keep everything that matters inside the middle 90%.

THE ROOM — dark, and lit only by the equipment
A real room after hours with the overhead lights off. The only light in the frame comes from the switched-on screens of the machines you are photographing: it falls on the beige plastic nearest each screen, picks out the edges of the cases, and dies away quickly into the dark.
The background is near-black charcoal #05080C and stays that way. There is no window, no lamp, no practical light fitting, no visible light source of any kind other than the screens themselves. There is no coloured gel, no haze in the air, no light beams, no rays, and no glow that is not coming from a screen you can see in the frame.
The darkness is ordinary darkness, not drama: the room is simply unlit, and the machines are simply on.

THE PHOTOGRAPH
A real photograph on a fast prime at a wide-ish aperture, available light only: honest materials, real grain-free digital capture, natural falloff, and soft contact shadows where things touch. Convincingly photographic and calm rather than theatrical.
Not an illustration, not flat vector, not cel shading, not a painting, not a UI mockup, not a glowing marketing render, and not a 3D product visualisation.

COLOUR
Near-black charcoal #05080C for the room. On it: warm beige and grey moulded plastic, brushed aluminium and pale steel, all of it lit by screen light rather than by any lamp. The screens themselves glow a soft pale cyan-white, and brand cyan #01B4C8 is the colour of that screen light. Deep navy #1B3A6B appears only in the mascot's eyes.
No purple, magenta, orange, red, yellow, green, gold, or iridescent oil-slick. No neon signage of any kind.

WHAT IS ON THE SCREENS — nothing readable
Every screen in this photograph is switched on and glowing, and none of them carries an interface. No windows, no icons, no menus, no charts, no code, no cursor, and above all no words: a screen is a soft, evenly glowing rectangle of pale light, slightly brighter at its centre, optionally with two or three very soft out-of-focus bands of lighter light across it that are far too diffuse to read as text.
A screen with legible writing on it is a failed photograph. Leave them glowing and blank.

${MASCOT}

${OBJECTS} This banner is deliberately dense: many machines rather than one, arranged so they read as a group.

${IN_WORLD_TEXT}

WHERE NOTHING GOES — this photograph carries no type, and has to leave room for it
The finished banner has words set over it afterwards, in a separate pass you are not doing. Stage the shot so that:

THE ONE FRAMING RULE, and the easiest one to get wrong:
Picture a vertical line drawn ${Math.round(STUDIO_COLUMN * 100)}% of the way across the frame from the left edge.

  EVERYTHING YOU PHOTOGRAPH SITS ENTIRELY TO THE RIGHT OF THAT LINE.

Nothing crosses it. Not the mascot, not a machine, not a screen, not a cable, not a cast shadow, and not the spill of screen light, which must have died away to black well before it reaches the line. If the arrangement is too wide to fit to the right of the line, shoot it from further back until it fits.
Everything to the LEFT of that line is unbroken near-black, from the top of the frame to the bottom, with nothing in it at all. It is nearly half the picture and it must read as deliberate.
Also keep the top 12% of the frame clear across the full width.

${FORBIDDEN_FILLER}
The glow in this photograph comes only from real screens that are visible in the frame. There is no free-floating glow, no gradient haze, no bloom hanging in empty space, and nothing luminous that is not a switched-on screen.
${FORBIDDEN_MASCOT}
${FORBIDDEN_FRAME}

OUTPUT
One finished 21:9 photograph obeying every rule above: a dark room, real machines lit by their own blank glowing screens, the mascot's four-lobed form exactly as reference 1 shows it, and no type anywhere on it.`;

/**
 * One entry per card. Subjects are staged scenes, not concepts: the model can
 * draw "a cube of glass with the work visible inside it" and cannot draw
 * "observability". The headline is hand-broken because poster type always is,
 * and `accentFrom` is the line the colour switches to the brand on.
 *
 * `theme` picks the contract. Leave it off, and it is `studio`.
 */
const cards = {
  /**
   * Three swings at the launch cover, all shot at night.
   *
   * The studio version below is quiet and correct and dies in a dark feed.
   * These are staged to survive one: a lot of small bright screens against a
   * lot of black, which is a shape the eye stops on at thumbnail size before it
   * has read anything.
   *
   * They differ in what they claim, not just in how they look, so the choice
   * between them is a choice about the pitch:
   *   wall       many agents, many machines. The loudest, and the least subtle.
   *   nightshift the work continues without you. The article's actual promise.
   *   terminal   one agent, one computer. The most iconic, the least busy.
   */
  "construct-wall": {
    theme: "loud",
    title: "Everything you need to know about Construct",
    headline: ["AI COWORKERS", "WITH REAL", "COMPUTERS"],
    accentFrom: 2,
    subline: "Every agent gets its own cloud desktop.",
    eyebrow: "LAUNCHING AUG 23",
    subject: `A wall of beige CRT monitors stacked four across and three high, filling the right-hand portion of the frame, every one of them switched on and glowing softly.

Three identical mascots rest squarely on top of three different monitors at different heights in the stack, each one's whole underside flat on the case beneath it, each lit from below by the screen it is sitting on. The nearest of the three is closest to the camera and the largest thing in the frame.

The stack recedes very slightly to the right and falls away into black at its edges. Cables run down behind it in shadow.`,
  },

  "construct-nightshift": {
    theme: "loud",
    title: "Everything you need to know about Construct",
    headline: ["CLOSE YOUR", "LAPTOP. IT", "KEEPS WORKING"],
    accentFrom: 2,
    subline: "It runs on the cloud, not on your machine.",
    eyebrow: "LAUNCHING AUG 23",
    subject: `A long office desk running away from the camera into a dark empty room, four identical beige workstations set out along it at even intervals, each with its monitor switched on and glowing and its keyboard squared up in front of it.

One mascot rests squarely on top of the nearest monitor, closest to the camera and the largest thing in the frame, lit on its underside by the screen below it. The three machines behind it are progressively smaller, dimmer, and further into the dark.

Every chair at the desk is empty and pushed in. Nobody is here and every machine is running.`,
  },

  "construct-terminal": {
    theme: "loud",
    title: "Everything you need to know about Construct",
    headline: ["NOT A CHAT", "WINDOW"],
    accentFrom: 1,
    subline: "A whole computer: browser, terminal, files, memory.",
    eyebrow: "LAUNCHING AUG 23",
    subject: `One beige CRT monitor alone in a dark room, shot close and square on so it fills the right-hand portion of the frame, switched on and glowing.

The mascot rests squarely on top of it, its whole underside flat on the case, large and lit from below by the screen. A beige keyboard sits in front of the monitor with its cable curling away into the dark, and one desktop tower stands beside it just at the edge of the light.

Nothing else is in the room. The light from the screen reaches the mascot, the top of the keyboard, and nothing further.`,
  },

  /**
   * The cover for the launch thread: the whole pitch in one image.
   *
   * The scene is the boxed retail software of the era the set is shot in,
   * because that is what "everything you need to know" looked like when a
   * product arrived as a thing rather than a signup — the box, the disc, the
   * manual, all of it on the table at once. It is also the one scene in the
   * house vocabulary that can legitimately carry the product's own name
   * silkscreened across it, which the contract allows and wants.
   *
   * No route card photographs a single hero box, so this reads as its own image
   * rather than as a wider cut of `blog-how-to-choose-an-ai-agent-platform`,
   * which stages three of them in a row.
   */
  "everything-about-construct": {
    title: "Everything you need to know about Construct",
    headline: ["AI COWORKERS", "WITH A REAL", "COMPUTER"],
    accentFrom: 2,
    subline: "Not a chat window. A cloud desktop that keeps working.",
    eyebrow: "LAUNCHING AUG 23",
    subject: `The mascot sitting on top of an upright shrink-wrapped software box, CONSTRUCT COMPUTER silkscreened across the box's face, and laid out on the surface in front of the box the two things that came in it: a CD-ROM resting in a paper sleeve, and a slim saddle-stitched manual lying closed beside it.

The box is the hero and it is turned squarely to the camera. The disc and the manual sit low and flat in front of it so nothing competes with it for height, and everything stays grouped compactly together in the right-hand portion of the wide frame with a great deal of empty studio to its left.`,
  },

  "supervised-agents": {
    theme: "dark",
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
const pick = flag("--pick");
const frameOnly = args.includes("--frame-only");
const dryRun = args.includes("--dry-run");
const theme = card.theme ?? "studio";
/** Both photographic contracts take the route set's references and its type layer. */
const photographic = theme === "studio" || theme === "loud";

/**
 * The studio contract puts its own OUTPUT line last, after the forbidden list,
 * exactly as the route cards do — so the subject is spliced in above it rather
 * than appended, and the two contracts end up the same shape from the model's
 * side even though only one of them is a photograph.
 */
const contract = theme === "loud" ? nightContract : studioContract;
const prompt = photographic
  ? contract.replace(
      "\nOUTPUT\n",
      `\nCARD — the only part that differs between cards in this set\n${card.subject}\n\nOUTPUT\n`,
    )
  : `${styleContract}

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

// Before anything is written, not per candidate: a missing condensed cut would
// otherwise be found out after paying for the art.
if (photographic) await preflight();

/** Draws the type over one piece of art and writes the finished card. */
async function setType(artFile, label) {
  const destination = path.join(outputDirectory, `${label}.png`);
  const filled = await sharp(await readFile(artFile))
    .resize(WIDTH, HEIGHT, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();
  const type = photographic
    ? await studioTypeLayer(card)
    : Buffer.from(overlaySvg(card));
  await writeFile(
    destination,
    await sharp(filled)
      .composite([{ input: type, left: 0, top: 0 }])
      .png()
      .toBuffer(),
  );
  return destination;
}

await mkdir(artDirectory, { recursive: true });

/** Every piece of art saved for this card: `<name>.webp` and `<name>-2.webp`. */
async function savedArt() {
  const pattern = new RegExp(`^${name}(-\\d+)?\\.webp$`);
  const existing = (await readdir(artDirectory))
    .filter((file) => pattern.test(file))
    .sort();
  if (!existing.length) {
    throw new Error(
      `No saved art for "${name}" in ${path.relative(root, artDirectory)}. Run without that flag first.`,
    );
  }
  return existing;
}

/**
 * Promotes one candidate to the card and clears the rest away, mirroring
 * `pnpm og:pick`.
 *
 * The losing candidates are deleted rather than kept, because the only thing
 * worse than choosing again later is a directory where it is no longer obvious
 * which image is the published one.
 */
if (pick !== null) {
  const chosen = path.join(artDirectory, `${name}-${pick}.webp`);
  if (!existsSync(chosen)) {
    throw new Error(
      `No candidate ${pick} for "${name}". Saved: ${(await savedArt()).join(", ")}`,
    );
  }
  // Read before deleting: the chosen file is itself one of the candidates the
  // sweep below removes.
  const art = await readFile(chosen);
  for (const file of await savedArt()) {
    const label = path.basename(file, ".webp");
    if (label === name) continue;
    await rm(path.join(artDirectory, file), { force: true });
    await rm(path.join(outputDirectory, `${label}.png`), { force: true });
  }

  const destination = path.join(artDirectory, `${name}.webp`);
  await writeFile(destination, art);
  const written = await setType(destination, name);
  console.log(`Picked candidate ${pick} → ${path.relative(root, written)}`);
  process.exit(0);
}

// `--frame-only` re-sets the type over every piece of art already saved for this
// card, so the headline can be reworked without paying to regenerate anything.
if (frameOnly) {
  for (const file of await savedArt()) {
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
    // The studio theme takes the route set's own list, mascot turnaround first
    // and the approved style plate second, which is what makes a cover look
    // like it came off the same table as the blog cards.
    references: photographic ? posterReferences() : referenceImages,
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
