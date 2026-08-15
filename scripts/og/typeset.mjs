import { Buffer } from "node:buffer";
import sharp from "sharp";

/**
 * The type layer, drawn in code rather than by the image model.
 *
 * Every card used to come out of the model in one pass, type included. That
 * held the *look* together but never the typography: across the set the
 * wordmark drifted by a third of its size, headlines were set anywhere from 60
 * to 110px, the badge changed height card to card, and the domain wandered
 * along the bottom edge. Nothing in a prompt fixes that, because the model is
 * interpreting a percentage, not measuring one.
 *
 * So the split is now clean:
 *
 *   the model   photographs the objects and the mascot, and leaves the type
 *               regions below as empty, evenly lit background
 *   this file   sets CONSTRUCT, the badge, the headline, and the domain at
 *               exact pixel positions, in one typeface, on every card
 *
 * The consequence is that text style, position, size, and spelling are now
 * identical across the set by construction, and a headline edit no longer needs
 * a regeneration — only a republish.
 *
 * `scripts/og/poster.mjs` imports `RESERVED` from here so the regions the
 * prompt asks the model to keep clear are the same numbers this file sets type
 * into. They cannot drift apart.
 *
 * The measurement, placement, and bloom helpers are exported because
 * `scripts/generate-social-card.mjs` sets the same type on a 2000x800 banner.
 * Only `typeLayer` below is bound to 1200x630; everything under it takes its
 * sizes and positions as arguments, so a second layout reuses the craft — ink
 * measured off a real render, not estimated from a width table — rather than
 * reimplementing it and drifting.
 */

export const WIDTH = 1200;
export const HEIGHT = 630;

/** Bump when the type layer changes, to mark every published image stale. */
export const TYPE_VERSION = 2;

/**
 * One typeface for the whole card, in two cuts.
 *
 * Helvetica Neue ships with macOS and its condensed black is the face the set
 * has always been drawn in, so the cards keep the poster weight they had when
 * the model was drawing them. `preflight()` refuses to publish if the condensed
 * cut is not actually resolving, because the fallback — regular Helvetica at
 * weight 900 — is close enough to look deliberate and wrong enough to reset the
 * whole set's typography.
 */
export const DISPLAY = {
  family: "Helvetica Neue",
  weight: 900,
  stretch: "condensed",
};
export const TEXT = {
  family: "Helvetica Neue",
  weight: 500,
  stretch: "normal",
};

/**
 * The palette, taken from the landing page's own tokens in `app/app.css`
 * (`--color-ink`, `--color-ink-muted`, `--color-brand`, `--color-brand-strong`)
 * so a card and the page it links to are the same two greys and the same cyan.
 */
export const INK = "#4e4646";
export const INK_MUTED = "#627c86";
export const BRAND = "#01b4c8";
export const BRAND_STRONG = "#018fa0";

/** 5.33% each side. Everything on the card hangs off these two edges. */
const MARGIN = 64;

/**
 * Cap height for the headline, by line count, and how far apart the baselines
 * sit as a multiple of it.
 *
 * Poster leading is tight so the lines lock into one block rather than reading
 * as separate sentences, but not tighter than 1.18: a comma on one line and a
 * cap on the next are the closest two lines ever come, and below that they
 * touch. A three-line block tops out at y=291, which sets `RESERVED` below.
 */
const HEADLINE_CAP = { 1: 104, 2: 88, 3: 70 };
const LEADING = 1.18;

/** The headline never runs past this, whatever it costs in size. */
const HEADLINE_COLUMN = 612;

/** Baselines and cap heights, in pixels down from the top of the frame. */
const WORDMARK = { baseline: 74, cap: 27, tracking: 0.16 };
const BADGE = { cap: 13, tracking: 0.14, padX: 15, padY: 10, radius: 0 };
const HEADLINE = { baseline: 526 };

/**
 * The domain sits under the headline on the left margin, not in the
 * bottom-right corner where it started.
 *
 * The corner is where an object's base and its cable naturally fall — every
 * plate generated for this set put something there, and the domain landed on a
 * power cord in all three. Moving it left costs a little balance and collapses
 * three reserved regions into two, one of which is a single contiguous column
 * the photograph simply stays out of.
 */
const DOMAIN = { baseline: 578, cap: 13, tracking: 0.01 };

/**
 * The parts of the frame the photograph has to leave alone, as fractions of the
 * frame, rounded outward from the type above with room to spare.
 *
 * Exported because `poster.mjs` writes them into the prompt. A number changed
 * here changes what the model is asked to keep clear, in the same commit.
 */
export const RESERVED = {
  /** The wordmark and badge line, across the full width. */
  top: 0.17,
  /**
   * The type column: this fraction of the width, for the whole height.
   *
   * It covers the full height rather than only the part the headline occupies
   * because that is a rule a model can actually follow — "everything you
   * photograph sits right of this line" survives where "keep the lower-left
   * 58% by 55% clear" was rounded away on two cards in three.
   */
  columnWidth: 0.58,
};

/**
 * The white bloom that keeps type legible wherever it lands.
 *
 * Lifted from the pricing cards on the landing page (`.pricing-summary` in
 * `app/features/landing/landing.css`), which solve the same problem — words
 * over artwork — and solve it in two layers rather than one:
 *
 *   PAD    the glyphs dilated and then blurred, which spreads them into a
 *          shaped white backing. A plain `text-shadow` cannot do this: it
 *          blurs outward from the outlines without thickening them, so artwork
 *          stays visible through the counters of an O and between words.
 *   HALO   a tight blur of the same glyphs, which firms up the core of the pad
 *          directly under the letters.
 *
 * Both follow the words. Two earlier attempts did not and both showed: a flat
 * gradient over the whole lower left washed the photograph pale whether or not
 * anything was behind the type, and a blurred rectangle around each block put a
 * pale slab in the ragged margin beside every short line.
 *
 * Sizes are fractions of the block's cap height so the bloom scales with the
 * type, from the 104px headline down to the 13px domain.
 */
const BLOOM = {
  /**
   * The pad is the glyphs fattened and softened, not a rectangle behind them.
   *
   * It started as a blurred rect around the block's ink box, which is what the
   * landing page does — but the landing page's blocks are a line or two of
   * small text, while a headline here is three ragged-right lines of 70px caps.
   * A rectangle around that covers a great deal of photograph the words never
   * touch, and it showed: a pale slab sitting behind the short lines.
   *
   * Dilating the glyph alpha and then blurring it gives the same opacity
   * directly under the letters while following the shape of the words, so the
   * photograph stays visible in the ragged margin beside a short line.
   */
  padDilate: 0.09,
  padBlur: 0.2,
  padPasses: 2,
  /**
   * A third, much wider blur under both, with no dilation.
   *
   * The pad alone stops fairly abruptly — enough opacity to carry the type, but
   * it reads as a defined shape sitting on the photograph. This spreads far
   * past it at low density so the whole thing fades out gradually instead of
   * ending. It contributes almost nothing to legibility and everything to the
   * bloom looking like light rather than a cut-out.
   */
  glowBlur: 0.45,
  glowPasses: 2,
  /** The tight halo on the glyphs, which firms up the core of the pad. */
  haloBlur: 0.05,
  haloPasses: 2,
};

/* ── Measurement ─────────────────────────────────────────────────────────── */

/**
 * Text is measured by rendering it and looking at the pixels.
 *
 * There is no metrics API behind sharp's SVG renderer, and estimating advance
 * widths from a table is exactly the kind of nearly-right that puts one card's
 * headline 8px past the margin. Rendering the string and finding its ink is
 * slower and exact, and this runs a few dozen times on a manual command.
 *
 * Ink scales linearly with font size, so every string is probed once at
 * `PROBE` and the result is scaled. Results are cached: across the set the
 * wordmark and the domain are the same string every time.
 */
const PROBE = 200;
const cache = new Map();

function escapeXml(value) {
  return value.replace(
    /[<>&]/g,
    (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[character],
  );
}

function textMarkup({ text, style, size, x, y, tracking = 0, fill = "#000" }) {
  return (
    `<text x="${x}" y="${y}" fill="${fill}" xml:space="preserve"` +
    ` font-family="${style.family}" font-size="${size}"` +
    ` font-weight="${style.weight}" font-stretch="${style.stretch}"` +
    ` letter-spacing="${(tracking * size).toFixed(3)}">${escapeXml(text)}</text>`
  );
}

/** The bounding box of everything non-transparent, or null for a blank render. */
async function inkBox(markup, width, height) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
    `${markup}</svg>`;
  const { data, info } = await sharp(Buffer.from(svg))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let left = info.width;
  let right = -1;
  let top = info.height;
  let bottom = -1;

  for (let y = 0; y < info.height; y += 1) {
    const row = y * info.width * info.channels;
    for (let x = 0; x < info.width; x += 1) {
      if (data[row + x * info.channels + 3] < 8) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }

  if (right < 0) return null;
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

/**
 * One string's ink, as multiples of font size: how far its first glyph sits
 * from the drawing origin, how wide it runs, and how tall its capitals are.
 */
export async function metrics(text, style, tracking) {
  const key = `${style.family}|${style.weight}|${style.stretch}|${tracking}|${text}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const box = await inkBox(
    textMarkup({ text, style, size: PROBE, x: PROBE, y: PROBE * 2, tracking }),
    PROBE * (4 + text.length),
    PROBE * 3,
  );
  if (!box) throw new Error(`Nothing rendered for "${text}"`);

  const value = {
    bearing: (box.left - PROBE) / PROBE,
    width: box.width / PROBE,
    cap: (PROBE * 2 - box.top) / PROBE,
  };
  cache.set(key, value);
  return value;
}

/**
 * Places one string so its ink starts exactly at `left` and its capitals stand
 * exactly `cap` tall on `baseline`.
 *
 * Returns the ink width (the badge and the right-aligned elements need it to
 * position anything) and a `draw(fill)` so the same glyphs can be re-emitted in white underneath
 * themselves for the halo.
 */
export async function place({
  text,
  style,
  cap,
  tracking,
  left,
  baseline,
  fill,
}) {
  const measured = await metrics(text, style, tracking);
  const size = cap / measured.cap;
  const width = measured.width * size;
  const x = left - measured.bearing * size;
  const draw = (colour) =>
    textMarkup({ text, style, size, x, y: baseline, tracking, fill: colour });

  return {
    width,
    cap,
    draw,
    markup: draw(fill),
  };
}

/* ── Preflight ───────────────────────────────────────────────────────────── */

/**
 * Refuses to publish into a font that is not the one the set is set in.
 *
 * A missing condensed cut does not fail — it silently falls back to regular
 * Helvetica at weight 900, which is legible, plausible, and a different
 * typeface from the other 33 cards. Comparing the two widths is the only
 * reliable way to notice: condensed is materially narrower, and if it is not,
 * the request resolved to the same face twice.
 */
export async function preflight() {
  const probe = "CONSTRUCT COMPUTER";
  const condensed = await metrics(probe, DISPLAY, 0);
  const regular = await metrics(probe, { ...DISPLAY, stretch: "normal" }, 0);

  if (condensed.width > regular.width * 0.92) {
    throw new Error(
      `The condensed cut of "${DISPLAY.family}" is not resolving, so the type ` +
        `layer would be set in a different face from the rest of the set.\n` +
        `On macOS it ships with the system; elsewhere, install Helvetica Neue ` +
        `or change DISPLAY in scripts/og/typeset.mjs to a heavy condensed ` +
        `grotesque you do have.`,
    );
  }
}

/* ── The layer ───────────────────────────────────────────────────────────── */

/**
 * Scales the headline down when a line would otherwise run past the column.
 *
 * `tests/og-generation.test.ts` caps headlines at three lines of sixteen
 * characters, which fits at the sizes above, so this is a floor rather than a
 * routine step: it keeps a long line inside the margin instead of letting it
 * run under the photograph.
 */
async function headlineBlock(lines) {
  const cap = HEADLINE_CAP[lines.length];
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
  const scale = widest > HEADLINE_COLUMN ? HEADLINE_COLUMN / widest : 1;
  const fitted = cap * scale;
  const advance = fitted * LEADING;

  const placed = await Promise.all(
    lines.map((line, index) =>
      place({
        text: line,
        style: DISPLAY,
        cap: fitted,
        tracking: 0,
        left: MARGIN,
        baseline: HEADLINE.baseline - (lines.length - 1 - index) * advance,
        fill: INK,
      }),
    ),
  );

  return {
    cap: fitted,
    solid: placed.map((entry) => entry.markup).join(""),
    white: placed.map((entry) => entry.draw("#ffffff")).join(""),
  };
}

/**
 * The bloom under one block, plus the filters it needs.
 *
 * Both layers are the block's own glyphs drawn in white: the pad is dilated and
 * softened so it spreads into a shaped backing, the halo is a tight blur that
 * firms up its core. Each is emitted as several separately-filtered copies
 * rather than one group drawn several times — repeating opaque white inside a
 * single group composites to exactly the same pixels, so it would build no
 * density at all.
 */
export function bloom(id, block) {
  const { cap } = block;
  const dilate = Math.max(1, cap * BLOOM.padDilate);
  const padBlur = Math.max(2, cap * BLOOM.padBlur);
  const glowBlur = Math.max(4, cap * BLOOM.glowBlur);
  const haloBlur = Math.max(1, cap * BLOOM.haloBlur);
  // Generous, because a filter region that clips its own blur leaves a hard
  // edge exactly where the falloff was supposed to disappear.
  const room = ` x="-150%" y="-200%" width="400%" height="500%"`;

  const defs =
    `<filter id="glow${id}"${room}>` +
    `<feGaussianBlur stdDeviation="${glowBlur.toFixed(2)}"/></filter>` +
    `<filter id="pad${id}"${room}>` +
    `<feMorphology operator="dilate" radius="${dilate.toFixed(2)}"/>` +
    `<feGaussianBlur stdDeviation="${padBlur.toFixed(2)}"/></filter>` +
    `<filter id="halo${id}"${room}>` +
    `<feGaussianBlur stdDeviation="${haloBlur.toFixed(2)}"/></filter>`;

  const layer = (filter, passes) =>
    Array.from(
      { length: passes },
      () => `<g filter="url(#${filter}${id})">${block.white}</g>`,
    ).join("");

  return {
    defs,
    body:
      layer("glow", BLOOM.glowPasses) +
      layer("pad", BLOOM.padPasses) +
      layer("halo", BLOOM.haloPasses) +
      block.solid,
  };
}

/** The badge: the route kind in a hairline box, hung off the right margin. */
async function badge(eyebrow) {
  const right = WIDTH - MARGIN;
  const height = BADGE.cap + BADGE.padY * 2;
  const top = Math.round(WORDMARK.baseline - WORDMARK.cap / 2 - height / 2);
  const baseline = top + BADGE.padY + BADGE.cap;

  const measured = await metrics(eyebrow, TEXT, BADGE.tracking);
  const size = BADGE.cap / measured.cap;
  const width = Math.round(measured.width * size + BADGE.padX * 2);

  const rect = (stroke, weight = 1.5) =>
    `<rect x="${right - width + 0.75}" y="${top + 0.75}" ` +
    `width="${width - 1.5}" height="${height - 1.5}" rx="${BADGE.radius}" ` +
    `fill="none" stroke="${stroke}" stroke-width="${weight}"/>`;

  const text = await place({
    text: eyebrow,
    style: TEXT,
    cap: BADGE.cap,
    tracking: BADGE.tracking,
    left: right - width + BADGE.padX,
    baseline,
    fill: BRAND_STRONG,
  });

  return {
    cap: BADGE.cap,
    solid: rect(BRAND) + text.markup,
    // The hairline is the thinnest thing on the card, so it gets the halo too.
    white: rect("#ffffff", 3) + text.draw("#ffffff"),
  };
}

/** `construct.computer`, on the left margin below the headline. */
async function domain() {
  const placed = await place({
    text: "construct.computer",
    style: TEXT,
    cap: DOMAIN.cap,
    tracking: DOMAIN.tracking,
    left: MARGIN,
    baseline: DOMAIN.baseline,
    fill: INK_MUTED,
  });
  return {
    cap: DOMAIN.cap,
    solid: placed.markup,
    white: placed.draw("#ffffff"),
  };
}

/**
 * The finished type layer as a 1200x630 RGBA PNG, ready to composite over a
 * cropped photograph.
 */
export async function typeLayer({ eyebrow, headline }) {
  const mark = await place({
    text: "CONSTRUCT",
    style: DISPLAY,
    cap: WORDMARK.cap,
    tracking: WORDMARK.tracking,
    left: MARGIN,
    baseline: WORDMARK.baseline,
    fill: INK,
  });

  const blocks = [
    {
      cap: WORDMARK.cap,
      solid: mark.markup,
      white: mark.draw("#ffffff"),
    },
    await badge(eyebrow),
    await headlineBlock(headline),
    await domain(),
  ].map((block, index) => bloom(index, block));

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">` +
    `<defs>${blocks.map((block) => block.defs).join("")}</defs>` +
    blocks.map((block) => block.body).join("") +
    `</svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}
