import { Buffer } from "node:buffer";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";
import { createServer } from "vite";

/**
 * `pnpm brand:art <folder> [--art <banner-2560x1440.png>] [--layers <dir>]`:
 * draws every derived brand file into the CDN folder from the hand-made ones.
 *
 * - Lockup, stacked and square marks: the logomark path and the wordmark SVGs
 *   composed at the geometry in `app/content/brand.ts`, as SVG and PNG.
 * - Every mascot the maker offers, assembled from the private layers into
 *   `mascot/` as 1024px PNGs. The layers themselves never go to the CDN;
 *   `pnpm brand` writes the page's 512px previews from these PNGs.
 * - Ad banners, in the launch art's own language: a halftone cloud cut from
 *   the YouTube channel art, the headline in cream condensed black with a
 *   navy shadow (Helvetica Neue, the face the OG cards use), the mascot in
 *   its hard hat, a cream "Start now" pill and the domain.
 *
 * Hand-made files (wordmark, logomark, app icon, avatar, mascot masters,
 * launch slides, the hero banner, badges) are read, never written. Run
 * `pnpm brand <folder>` afterwards to check the folder, print the PDFs, zip
 * it and refresh the thumbnails.
 */

const root = process.cwd();
const args = process.argv.slice(2);
const folder = args[0] && !args[0].startsWith("--") && path.resolve(args[0]);
const option = (flag, fallback) => {
  const index = args.indexOf(flag);
  return path.resolve(index >= 0 ? args[index + 1] : fallback);
};
if (!folder) {
  console.error(
    "Usage: pnpm brand:art <folder mirrored to cdn.construct.computer/brand/> [--art banner-2560x1440.png] [--layers mascot-layers]",
  );
  process.exit(1);
}
const art = option(
  "--art",
  path.join(root, "../youtube-assets/banner-2560x1440.png"),
);
/** The agent-avatar 1024 tier, one WebP per layer, kept out of the mirror. */
const layersDir = option("--layers", path.join(folder, "../../mascot-layers"));
for (const [what, target] of [
  ["channel art", art],
  ["mascot layers", layersDir],
]) {
  await access(target).catch(() => {
    console.error(`No ${what} at ${target}`);
    process.exit(1);
  });
}

const vite = await createServer({
  root,
  logLevel: "error",
  server: { middlewareMode: true, watch: null },
  appType: "custom",
});
let brand;
let mascotLayerRect;
try {
  brand = await vite.ssrLoadModule("/app/content/brand.ts");
  ({ mascotLayerRect } = await vite.ssrLoadModule(
    "/app/features/content/mascot-layers.ts",
  ));
} finally {
  await vite.close();
}

const { LOGOMARK_PATH, LOCKUP, STACKED, SQUARE, WORDMARK_BOX } = brand;
const NAVY = "#18325C";
/** The launch art's own cream and the navy under its headline. */
const CREAM = "#F4EEE2";
const INK = "#0D1A45";
const HEADLINE = brand.brandTaglines[0].replace(/\.$/, "").toUpperCase();
const DOMAIN = brand.brandName.domain;
const CTA = "Start now";

const out = (name) => path.join(folder, name);
const sizeOf = (id, format) => {
  for (const group of brand.brandGroups) {
    for (const asset of group.assets) {
      if (asset.id !== id) continue;
      const file = asset.files.find((entry) => entry.format === format);
      if (file) return [file.width, file.height];
    }
  }
  throw new Error(`${id}.${format.toLowerCase()} is not in brand.ts`);
};

/* ----------------------------------------------------------- Vectors */

/** The wordmark SVG's drawing group, in its own units. */
async function wordmarkGroup(variant) {
  const svg = await readFile(out(`construct-wordmark${variant}.svg`), "utf8");
  const match = svg.match(/<g[\s\S]*<\/g>/);
  if (!match) throw new Error(`No group in construct-wordmark${variant}.svg`);
  const viewBox = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  return { inner: match[0], unitsWide: Number(viewBox[1]) };
}

/** The wordmark placed at `x, y`, `width` px wide. */
function wordmarkAt({ inner, unitsWide }, x, y, width) {
  const scale = width / unitsWide;
  return `<g transform="translate(${x} ${y}) scale(${scale.toFixed(6)})">${inner}</g>`;
}

/** The logomark placed at `x, y`, `height` px tall. */
function markAt(fill, x, y, height) {
  const scale = height / 1170;
  return `<path fill="${fill}" fill-rule="evenodd" transform="translate(${x} ${y}) scale(${scale.toFixed(6)})" d="${LOGOMARK_PATH}"/>`;
}

function svgDocument(width, height, body, viewBox = `0 0 ${width} ${height}`) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${width}" height="${height}"><title>Construct Computer</title>${body}</svg>\n`;
}

/** Rasterises an SVG string at exactly `width` by `height` pixels. */
function rasterise(svg, width, height) {
  const sized = svg.replace(
    /<svg([^>]*) width="[^"]*" height="[^"]*"/,
    `<svg$1 width="${width}" height="${height}"`,
  );
  return sharp(Buffer.from(sized), { density: 72 }).png({
    compressionLevel: 9,
  });
}

const VARIANTS = [
  { suffix: "", mark: NAVY },
  { suffix: "-black", mark: "#000000" },
  { suffix: "-white", mark: "#FFFFFF" },
];

async function drawLockups() {
  for (const { suffix, mark } of VARIANTS) {
    const wordmark = await wordmarkGroup(suffix);

    const lockupY =
      (LOCKUP.height - WORDMARK_BOX.height) / 2 + LOCKUP.wordmarkNudge;
    const lockup = svgDocument(
      LOCKUP.width,
      LOCKUP.height,
      markAt(mark, 0, 0, LOCKUP.markHeight) +
        wordmarkAt(
          wordmark,
          LOCKUP.markWidth + LOCKUP.gap,
          lockupY.toFixed(2),
          WORDMARK_BOX.width,
        ),
    );
    await writeFile(out(`construct-lockup${suffix}.svg`), lockup);
    await rasterise(
      lockup,
      ...sizeOf(`construct-lockup${suffix}`, "PNG"),
    ).toFile(out(`construct-lockup${suffix}.png`));

    const stacked = svgDocument(
      STACKED.width,
      STACKED.height,
      markAt(
        mark,
        ((STACKED.width - STACKED.markWidth) / 2).toFixed(2),
        0,
        STACKED.markHeight,
      ) +
        wordmarkAt(
          wordmark,
          ((STACKED.width - WORDMARK_BOX.width) / 2).toFixed(2),
          STACKED.markHeight + STACKED.gap,
          WORDMARK_BOX.width,
        ),
    );
    await writeFile(out(`construct-stacked${suffix}.svg`), stacked);
    await rasterise(
      stacked,
      ...sizeOf(`construct-stacked${suffix}`, "PNG"),
    ).toFile(out(`construct-stacked${suffix}.png`));
  }
}

async function drawSquares() {
  const inner = SQUARE.size - 2 * SQUARE.padding;
  const markHeight = (inner * 1170) / 1198;
  const y = (SQUARE.size - markHeight) / 2;
  for (const [id, background, mark] of [
    ["construct-mark-square", "#FFFFFF", NAVY],
    ["construct-mark-square-navy", NAVY, "#FFFFFF"],
  ]) {
    const svg = svgDocument(
      SQUARE.size,
      SQUARE.size,
      `<rect width="${SQUARE.size}" height="${SQUARE.size}" fill="${background}"/>` +
        markAt(mark, SQUARE.padding, y.toFixed(2), markHeight.toFixed(2)),
    );
    await writeFile(out(`${id}.svg`), svg);
    await rasterise(svg, ...sizeOf(id, "PNG")).toFile(out(`${id}.png`));
  }
}

/* ----------------------------------------------------------- Mascots */

const layerCache = new Map();

/** One layer at `size`, decoded once per size. */
async function layerPng(layer, size) {
  const key = `${layer}@${size}`;
  if (!layerCache.has(key)) {
    const rect = mascotLayerRect(layer);
    layerCache.set(
      key,
      await sharp(path.join(layersDir, `${layer}.webp`))
        .resize(Math.round(rect.w * size), Math.round(rect.h * size))
        .png()
        .toBuffer(),
    );
  }
  return layerCache.get(key);
}

/** The mascot in a role, colour and mood, exactly as the page drew it. */
async function composeMascot(combo, size) {
  const layers = [];
  for (const layer of brand.mascotLook(combo.tint, combo.role, combo.happy)) {
    const rect = mascotLayerRect(layer);
    layers.push({
      input: await layerPng(layer, size),
      left: Math.round(rect.x * size),
      top: Math.round(rect.y * size),
    });
  }
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(layers)
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function drawMascots() {
  await mkdir(out("mascot"), { recursive: true });
  let done = 0;
  for (const combo of brand.mascotCombos) {
    const png = await composeMascot(combo, brand.MASCOT_PX);
    await writeFile(out(path.join("mascot", `${combo.stem}.png`)), png);
    done += 1;
    if (done % 50 === 0 || done === brand.mascotCombos.length) {
      console.log(`  mascots ${done}/${brand.mascotCombos.length}`);
    }
  }
}

/* ----------------------------------------------------------- Banners */

const esc = (text) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * A piece of the channel art's halftone sky, from outside its text box
 * (x 556 to 1998, y 535 to 909), scaled to the banner.
 */
function sky(left, top, width, height, outWidth, outHeight) {
  return sharp(art)
    .extract({ left, top, width, height })
    .resize(outWidth, outHeight)
    .png()
    .toBuffer();
}

/**
 * Text as a trimmed transparent PNG, so it can be placed by its ink box.
 * The condensed black cut is the launch art's headline face; the shadow is
 * the same text again, offset, underneath.
 */
async function ink(
  text,
  { size, weight = 900, stretch = "condensed", color = CREAM, shadow = 0 },
) {
  const pad = Math.ceil(size);
  const width = Math.ceil(size * 0.8 * text.length) + pad * 2 + 24;
  const height = Math.ceil(size * 1.5) + pad * 2;
  const run = (dx, dy, fill) =>
    `<text x="${pad + dx}" y="${pad + Math.round(size * 1.05) + dy}" font-family="Helvetica Neue" font-weight="${weight}" font-stretch="${stretch}" font-size="${size}" fill="${fill}">${esc(text)}</text>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${shadow ? run(shadow, shadow, INK) : ""}${run(0, 0, color)}</svg>`;
  const { data, info } = await sharp(Buffer.from(svg))
    .trim({ threshold: 1 })
    .png()
    .toBuffer({ resolveWithObject: true });
  return { buffer: data, width: info.width, height: info.height };
}

/** A cream pill with navy text. */
async function pill(text, size, height) {
  const label = await ink(text, {
    size,
    weight: 700,
    stretch: "normal",
    color: INK,
  });
  const padX = Math.round(height * 0.5);
  const width = label.width + padX * 2;
  const buffer = await sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" rx="${height / 2}" fill="${CREAM}"/></svg>`,
    ),
  )
    .composite([
      {
        input: label.buffer,
        left: padX,
        top: Math.round((height - label.height) / 2),
      },
    ])
    .png()
    .toBuffer();
  return { buffer, width, height };
}

/** The mascot in a role, trimmed to its own edges and `height` tall. */
async function roleMascot(roleId, height) {
  const combo = brand.mascotCombo(roleId, "construct", false);
  const trimmed = await sharp(await composeMascot(combo, brand.MASCOT_PX))
    .trim({ threshold: 1 })
    .png()
    .toBuffer();
  const { data, info } = await sharp(trimmed)
    .resize({ height })
    .png()
    .toBuffer({ resolveWithObject: true });
  return { buffer: data, width: info.width, height: info.height };
}

const centred = (canvas, size) => Math.round((canvas - size) / 2);
const place = (layer, left, top) => ({
  input: layer.buffer,
  left: Math.round(left),
  top: Math.round(top),
});

async function banner(id, build) {
  const [width, height] = sizeOf(id, "PNG");
  const { background, layers } = await build(width, height);
  await sharp(background)
    .composite(layers)
    .png({ compressionLevel: 9 })
    .toFile(out(`${id}.png`));
}

async function drawBanners() {
  // Leaderboard: mascot, one-line headline over the domain, pill at right.
  await banner("construct-banner-leaderboard", async (w, h) => {
    const mascot = await roleMascot("construction", 80);
    const head = await ink(HEADLINE, { size: 27, shadow: 2 });
    const domain = await ink(DOMAIN, {
      size: 12,
      weight: 700,
      stretch: "normal",
    });
    const cta = await pill(CTA, 14, 32);
    const textTop = centred(h, head.height + 7 + domain.height);
    return {
      background: await sky(80, 130, 2400, 297, w, h),
      layers: [
        place(mascot, 14, centred(h, mascot.height)),
        place(head, 110, textTop),
        place(domain, 112, textTop + head.height + 7),
        place(cta, w - 16 - cta.width, centred(h, cta.height)),
      ],
    };
  });

  // Mobile strip: mascot, the headline on two lines, pill at right.
  await banner("construct-banner-mobile", async (w, h) => {
    const mascot = await roleMascot("construction", 40);
    const [a, b] = HEADLINE.split(" THAT ");
    const line1 = await ink(`${a} THAT`, { size: 13, shadow: 1 });
    const line2 = await ink(b, { size: 13, shadow: 1 });
    const cta = await pill(CTA, 11, 24);
    const top = centred(h, line1.height + 4 + line2.height);
    return {
      background: await sky(400, 150, 1600, 250, w, h),
      layers: [
        place(mascot, 8, centred(h, mascot.height)),
        place(line1, 58, top),
        place(line2, 58, top + line1.height + 4),
        place(cta, w - 8 - cta.width, centred(h, cta.height)),
      ],
    };
  });

  // Medium rectangle: headline top left, mascot bottom right, pill bottom left.
  await banner("construct-banner-rectangle", async (w, h) => {
    const [a, b] = HEADLINE.split(" THAT ");
    const line1 = await ink(`${a} THAT`, { size: 30, shadow: 3 });
    const line2 = await ink(b, { size: 30, shadow: 3 });
    const domain = await ink(DOMAIN, {
      size: 13,
      weight: 700,
      stretch: "normal",
    });
    const mascot = await roleMascot("construction", 126);
    const cta = await pill(CTA, 14, 32);
    return {
      background: await sky(1900, 0, 636, 530, w, h),
      layers: [
        place(line1, 18, 24),
        place(line2, 18, 24 + line1.height + 6),
        place(domain, 19, 24 + line1.height + 6 + line2.height + 12),
        place(mascot, w - 12 - mascot.width, h - 10 - mascot.height),
        place(cta, 18, h - 18 - cta.height),
      ],
    };
  });

  // Skyscraper: headline on three lines, the mascot, pill, domain.
  await banner("construct-banner-skyscraper", async (w, h) => {
    const words = HEADLINE.split(" ");
    const lines = [
      words.slice(0, 2).join(" "),
      words.slice(2, 4).join(" "),
      words.slice(4).join(" "),
    ];
    const inks = [];
    for (const line of lines) {
      inks.push(await ink(line, { size: 24, shadow: 2 }));
    }
    const mascot = await roleMascot("construction", 190);
    const cta = await pill(CTA, 13, 30);
    const domain = await ink(DOMAIN, {
      size: 11,
      weight: 700,
      stretch: "normal",
    });
    let top = 52;
    const layers = [];
    for (const line of inks) {
      layers.push(place(line, centred(w, line.width), top));
      top += line.height + 7;
    }
    layers.push(
      place(mascot, centred(w, mascot.width), 196),
      place(cta, centred(w, cta.width), 430),
      place(domain, centred(w, domain.width), 484),
    );
    return { background: await sky(200, 0, 143, 535, w, h), layers };
  });
}

await drawLockups();
await drawSquares();
await drawMascots();
await drawBanners();
console.log(`Drew the lockups, squares, mascots and banners into ${folder}.`);
