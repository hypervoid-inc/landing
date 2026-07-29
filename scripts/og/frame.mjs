import { Buffer } from "node:buffer";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

/**
 * The branded 1200x630 frame every OG image is composited into.
 *
 * All type is drawn here as vector text rather than generated, so the wordmark,
 * eyebrow, and title are pixel-identical across the set and stay sharp at
 * thumbnail size. The generated artwork only ever fills the square tile on the
 * right, where it has no legibility burden.
 */

export const WIDTH = 1200;
export const HEIGHT = 630;

/** Bump when the frame design changes, to force every image to re-render. */
export const FRAME_VERSION = 3;

/**
 * Published images are JPEG, flattened onto white.
 *
 * These cards are near-photographic gradient renders, which PNG stores badly —
 * the same image is 705KB as PNG and 78KB at q92, with no difference visible
 * even on the vector type. Weight matters twice over: social crawlers fetch
 * them, and the blog index renders fourteen of them as thumbnails.
 *
 * Flattening also drops the alpha channel. An OG image must be opaque, because
 * clients composite it onto backgrounds we do not control and transparent
 * regions can come out black.
 */
const JPEG_QUALITY = 92;

function encode(image) {
  return image
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true, chromaSubsampling: "4:4:4" })
    .toBuffer();
}

/** Re-encodes a hand-made card so every published image shares one format. */
export function encodeImage(input) {
  return encode(sharp(input).resize(WIDTH, HEIGHT, { fit: "cover" }));
}

const LOGO_PATH = fileURLToPath(
  new URL("../../public/icon-512.png", import.meta.url),
);
const LOGO_SIZE = 176;

const TILE = 430;
const TILE_X = WIDTH - 56 - TILE;
const TILE_Y = 100;
const TILE_RADIUS = 34;
const TILE_CENTER_X = TILE_X + TILE / 2;
const TILE_CENTER_Y = TILE_Y + TILE / 2;

const TEXT_X = 80;
const TEXT_MAX_WIDTH = TILE_X - TEXT_X - 44;

const INK = "#4e4646";
const ACCENT = "#01b4c8";
const DEEP = "#017b89";
const MUTED = "#627c86";

const DISPLAY_FONT = "Georgia, 'Times New Roman', 'DejaVu Serif', serif";
const UI_FONT = "'Helvetica Neue', Helvetica, Arial, 'DejaVu Sans', sans-serif";

const eyebrowLabels = {
  home: "AI Employee",
  page: "Construct",
  "blog-index": "Insights & Guides",
  "blog-post": "Article",
  guide: "Guide",
  comparison: "Comparison",
  "author-index": "Authors",
  author: "Author",
  tag: "Topic",
};

export function eyebrowFor(kind) {
  return eyebrowLabels[kind] ?? "Construct";
}

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * Approximate advance widths for Georgia italic, normalised to font size.
 * librsvg gives no way to measure text, so wrapping estimates instead and errs
 * narrow — a title that wraps one word early looks fine; one that overruns the
 * artwork does not.
 */
const WIDE_GLYPHS = new Set(["M", "W", "@", "%", "m", "w"]);
const NARROW_GLYPHS = new Set([..."ijltfr.,;:'\"!|()[]-"]);

function glyphWidth(character) {
  if (character === " ") return 0.26;
  if (WIDE_GLYPHS.has(character)) return 0.86;
  if (NARROW_GLYPHS.has(character)) return 0.31;
  if (character >= "A" && character <= "Z") return 0.65;
  if (character >= "0" && character <= "9") return 0.53;
  return 0.5;
}

function textWidth(text, size) {
  let total = 0;
  for (const character of text) total += glyphWidth(character);
  return total * size;
}

function wrap(title, size) {
  const lines = [];
  for (const word of title.split(/\s+/)) {
    const last = lines.at(-1);
    if (last && textWidth(`${last} ${word}`, size) <= TEXT_MAX_WIDTH) {
      lines[lines.length - 1] = `${last} ${word}`;
    } else lines.push(word);
  }
  return lines;
}

/**
 * The largest size in the ladder that keeps the title inside three lines,
 * falling back to the smallest size and four lines for the rare long headline.
 */
function layoutTitle(title) {
  for (const size of [56, 50, 45, 40, 36]) {
    const lines = wrap(title, size);
    if (lines.length <= 3) return { size, lines };
  }
  const size = 32;
  return { size, lines: wrap(title, size).slice(0, 4) };
}

/**
 * The wordmark, eyebrow, title, and domain. Shared by both layouts so a tile
 * card and a full-bleed card are typographically identical — only what sits
 * behind the type changes.
 */
function typeLayer({ title, eyebrow }) {
  const { size, lines } = layoutTitle(title);
  const lineHeight = size * 1.16;
  const capHeight = size * 0.72;
  const pillHeight = 32;
  const pillGap = 28;
  const pillWidth = Math.round(textWidth(eyebrow.toUpperCase(), 15) + 60);

  const blockHeight =
    pillHeight + pillGap + (lines.length - 1) * lineHeight + capHeight;
  const blockTop = 336 - blockHeight / 2;
  const firstBaseline = blockTop + pillHeight + pillGap + capHeight;

  const titleLines = lines
    .map(
      (line, index) =>
        `<tspan x="${TEXT_X}" dy="${index === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`,
    )
    .join("");

  return `<text x="${TEXT_X}" y="112" font-family="${DISPLAY_FONT}" font-size="30" font-style="italic" fill="${INK}">Construct<tspan fill="${ACCENT}">Computer</tspan></text>
  <rect x="${TEXT_X}" y="${blockTop}" width="${pillWidth}" height="${pillHeight}" rx="16" fill="#e2f7fa"/>
  <text x="${TEXT_X + pillWidth / 2}" y="${blockTop + 21}" text-anchor="middle" font-family="${UI_FONT}" font-size="15" font-weight="600" letter-spacing="1.6" fill="${DEEP}">${escapeXml(eyebrow.toUpperCase())}</text>
  <text x="${TEXT_X}" y="${firstBaseline}" font-family="${DISPLAY_FONT}" font-size="${size}" font-style="italic" fill="${INK}">${titleLines}</text>
  <circle cx="${TEXT_X + 5}" cy="551" r="5" fill="${ACCENT}"/>
  <text x="${TEXT_X + 22}" y="557" font-family="${UI_FONT}" font-size="22" fill="${MUTED}">construct.computer</text>`;
}

function backgroundSvg({ title, eyebrow }) {
  return `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="page" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#eef9fc"/>
    </linearGradient>
    <radialGradient id="bloom">
      <stop offset="0" stop-color="#5fd9ef" stop-opacity="0.5"/>
      <stop offset="0.5" stop-color="#a9ebf7" stop-opacity="0.24"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="empty" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#d6f2fa"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#page)"/>
  <ellipse cx="${TILE_CENTER_X}" cy="${TILE_CENTER_Y}" rx="440" ry="392" fill="url(#bloom)"/>
  <g fill="none" stroke="${ACCENT}" stroke-opacity="0.16" stroke-dasharray="2 11">
    <circle cx="${TILE_CENTER_X}" cy="${TILE_CENTER_Y}" r="294"/>
    <circle cx="${TILE_CENTER_X}" cy="${TILE_CENTER_Y}" r="352"/>
  </g>
  <g fill="none" stroke="${ACCENT}" stroke-opacity="0.14" stroke-width="1.5">
    <path d="M0 596 H112 L146 562 H236"/>
    <path d="M0 78 H68 L96 106 H188"/>
  </g>
  ${typeLayer({ title, eyebrow })}
</svg>`;
}

/**
 * The type stack over a left-hand scrim, for artwork that fills the whole card.
 * The scrim is what makes a full-bleed layout safe: the prompt asks the model
 * to keep the left side quiet, but a headline cannot depend on it having done
 * so, and unreadable is a worse failure than slightly veiled.
 */
function fullBleedOverlaySvg({ title, eyebrow }) {
  return `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="scrim" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.94"/>
      <stop offset="0.42" stop-color="#ffffff" stop-opacity="0.88"/>
      <stop offset="0.72" stop-color="#ffffff" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#scrim)"/>
  ${typeLayer({ title, eyebrow })}
</svg>`;
}

/**
 * The backdrop for routes with no artwork yet: the same glass tile, lit from
 * behind, with the Construct mark composited into the centre. It has to look
 * like a deliberate brand plate rather than a missing asset, because some
 * routes will sit on it indefinitely.
 */
function placeholderSvg() {
  return `<svg width="${TILE}" height="${TILE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="fill" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#cdeff9"/>
    </linearGradient>
    <radialGradient id="core">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="0.6" stop-color="#ffffff" stop-opacity="0.45"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${TILE}" height="${TILE}" rx="${TILE_RADIUS}" fill="url(#fill)"/>
  <g fill="none" stroke="#ffffff" stroke-opacity="0.75" stroke-dasharray="3 9">
    <circle cx="${TILE / 2}" cy="${TILE / 2}" r="122"/>
    <circle cx="${TILE / 2}" cy="${TILE / 2}" r="168"/>
  </g>
  <circle cx="${TILE / 2}" cy="${TILE / 2}" r="146" fill="url(#core)"/>
</svg>`;
}

async function placeholderBuffer() {
  const mark = await sharp(LOGO_PATH)
    .resize(LOGO_SIZE, LOGO_SIZE, { fit: "contain" })
    .png()
    .toBuffer();
  const offset = Math.round((TILE - LOGO_SIZE) / 2);
  return sharp(Buffer.from(placeholderSvg()))
    .composite([{ input: mark, left: offset, top: offset }])
    .png()
    .toBuffer();
}

function tileMaskSvg() {
  return `<svg width="${TILE}" height="${TILE}" xmlns="http://www.w3.org/2000/svg"><rect width="${TILE}" height="${TILE}" rx="${TILE_RADIUS}" fill="#fff"/></svg>`;
}

/** The glass edge, drawn over the artwork so the tile reads as one material. */
function tileEdgeSvg() {
  return `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <rect x="${TILE_X + 0.75}" y="${TILE_Y + 0.75}" width="${TILE - 1.5}" height="${TILE - 1.5}" rx="${TILE_RADIUS}" fill="none" stroke="#ffffff" stroke-opacity="0.9" stroke-width="1.5"/>
  <rect x="${TILE_X - 0.5}" y="${TILE_Y - 0.5}" width="${TILE + 1}" height="${TILE + 1}" rx="${TILE_RADIUS + 1}" fill="none" stroke="${ACCENT}" stroke-opacity="0.22" stroke-width="1"/>
</svg>`;
}

async function tileBuffer(artwork) {
  const source = artwork
    ? sharp(artwork).resize(TILE, TILE, { fit: "cover", position: "centre" })
    : sharp(await placeholderBuffer());
  return source
    .composite([{ input: Buffer.from(tileMaskSvg()), blend: "dest-in" }])
    .png()
    .toBuffer();
}

/**
 * The author card: a real photograph on the branded background.
 *
 * Its own layout because the source headshots are 256px square. Full-bleed
 * would upscale one nearly five times across a 1200x630 card; a 300px circle is
 * a 1.2x upscale, which holds. A portrait is also simply the right image for a
 * byline, where generated art would be a stand-in for the person.
 */
const PORTRAIT = 300;
const PORTRAIT_X = Math.round(TILE_CENTER_X - PORTRAIT / 2);
const PORTRAIT_Y = Math.round(TILE_CENTER_Y - PORTRAIT / 2);

function portraitMaskSvg() {
  return `<svg width="${PORTRAIT}" height="${PORTRAIT}" xmlns="http://www.w3.org/2000/svg"><circle cx="${PORTRAIT / 2}" cy="${PORTRAIT / 2}" r="${PORTRAIT / 2}" fill="#fff"/></svg>`;
}

/** Glow behind the portrait, then the white ring drawn back over its edge. */
function portraitGlowSvg() {
  return `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="halo">
      <stop offset="0.62" stop-color="#7fe3f5" stop-opacity="0.55"/>
      <stop offset="0.8" stop-color="#bff0f8" stop-opacity="0.28"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="${TILE_CENTER_X}" cy="${TILE_CENTER_Y}" r="${PORTRAIT / 2 + 62}" fill="url(#halo)"/>
</svg>`;
}

function portraitRingSvg() {
  return `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <circle cx="${TILE_CENTER_X}" cy="${TILE_CENTER_Y}" r="${PORTRAIT / 2 + 3}" fill="none" stroke="#ffffff" stroke-width="7"/>
  <circle cx="${TILE_CENTER_X}" cy="${TILE_CENTER_Y}" r="${PORTRAIT / 2 + 7}" fill="none" stroke="${ACCENT}" stroke-opacity="0.3" stroke-width="1.5"/>
</svg>`;
}

export async function renderPortrait({ title, kind, photo }) {
  const circle = await sharp(photo)
    .resize(PORTRAIT, PORTRAIT, { fit: "cover", position: "attention" })
    .composite([{ input: Buffer.from(portraitMaskSvg()), blend: "dest-in" }])
    .png()
    .toBuffer();

  return encode(
    sharp(
      Buffer.from(backgroundSvg({ title, eyebrow: eyebrowFor(kind) })),
    ).composite([
      { input: Buffer.from(portraitGlowSvg()), left: 0, top: 0 },
      { input: circle, left: PORTRAIT_X, top: PORTRAIT_Y },
      { input: Buffer.from(portraitRingSvg()), left: 0, top: 0 },
    ]),
  );
}

/**
 * Renders a card whose artwork fills the whole 1200x630, with the type set over
 * a scrim rather than beside a tile.
 */
export async function renderFullBleed({ title, kind, artwork }) {
  const filled = await sharp(artwork)
    .resize(WIDTH, HEIGHT, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();
  return encode(
    sharp(filled).composite([
      {
        input: Buffer.from(
          fullBleedOverlaySvg({ title, eyebrow: eyebrowFor(kind) }),
        ),
        left: 0,
        top: 0,
      },
    ]),
  );
}

/**
 * Renders a card with the type on the left and a square tile on the right.
 *
 * Now only ever called with `artwork: null`, as the fallback for a route whose
 * artwork has not been generated yet — the tile layout itself is retired,
 * because at feed size a small tile in a field of white did not read. The
 * `artwork` path still works and `--layout tile` still writes tiles to
 * `assets/og/art/`, so reviving the layout is a matter of re-wiring
 * `renderOne`, not rebuilding this.
 */
export async function renderFrame({ title, kind, artwork = null }) {
  const background = backgroundSvg({ title, eyebrow: eyebrowFor(kind) });
  return encode(
    sharp(Buffer.from(background)).composite([
      { input: await tileBuffer(artwork), left: TILE_X, top: TILE_Y },
      { input: Buffer.from(tileEdgeSvg()), left: 0, top: 0 },
    ]),
  );
}
