/**
 * Builds everything /deck/ serves from the slides as PNGs at 2x: each slide as
 * NN@2x.webp (3840 wide), NN.webp (1920) and NN-thumb.webp (480, for the slide
 * rail) in public/assets/deck/, replacing what is there; one PDF of every
 * slide with the videos and links still clickable; and the link-preview card,
 * public/og/deck.jpg. Used by `pnpm deck:sync` and `pnpm deck:slides`.
 *
 * `slides` describes them (app/features/deck/slides.ts): the PDF's links come
 * from it. The card is set in the OG cards' typeface (scripts/og/
 * typeset.mjs), Helvetica Neue, which ships with macOS.
 */
import { Buffer } from "node:buffer";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

import { SLIDE_HEIGHT, SLIDE_WIDTH } from "../../app/features/deck/slides.ts";
import { DECK_PDF_MAX_BYTES, DECK_PDF_PATH } from "../../shared/deck-schema.ts";
import { BRAND, DISPLAY, HEIGHT, TEXT, WIDTH, metrics, place, preflight } from "../og/typeset.mjs";

const OUT = path.resolve("public/assets/deck");
const CARD = path.resolve("public/og/deck.jpg");
const SITE = "https://construct.computer";

const VARIANTS = [
  { suffix: "@2x", width: 3840, quality: 80 },
  { suffix: "", width: 1920, quality: 82 },
  { suffix: "-thumb", width: 480, quality: 70 },
];

/** The PDF's pages: 2400 wide, full colour resolution so small coloured text stays sharp. */
const PDF_IMAGE = { width: 2400, quality: 82 };
/** A 16:9 page in points, the size PowerPoint and Keynote use. */
const PAGE = { width: 960, height: 540 };

/** `files` are the slides' PNGs in deck order, `slides` the deck they make. Returns the PDF's size in bytes. */
export async function buildDeckAssets(files, slides) {
  if (files.length !== slides.length) {
    throw new Error(`${files.length} slide images for ${slides.length} slides. They have to match.`);
  }
  // Before anything is replaced: the card can't be set without its typeface.
  await preflight();

  const pages = [];
  const webps = [];
  for (const [index, input] of files.entries()) {
    const n = String(index + 1).padStart(2, "0");
    for (const { suffix, width, quality } of VARIANTS) {
      webps.push({
        name: `${n}${suffix}.webp`,
        data: await sharp(input)
          .resize({ width, withoutEnlargement: true })
          .webp({ quality, effort: 6, smartSubsample: true })
          .toBuffer(),
      });
    }
    const { data, info } = await sharp(input)
      .resize({ width: PDF_IMAGE.width, withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: PDF_IMAGE.quality, mozjpeg: true, chromaSubsampling: "4:4:4" })
      .toBuffer({ resolveWithObject: true });
    pages.push({ jpeg: data, width: info.width, height: info.height });
  }

  const pdf = buildPdf(pages, slides.map(linksOf));
  if (pdf.length > DECK_PDF_MAX_BYTES) {
    throw new Error(
      `The PDF is ${(pdf.length / 2 ** 20).toFixed(2)} MiB, over the ${(DECK_PDF_MAX_BYTES / 2 ** 20).toFixed(1)} MiB an email can carry. Lower PDF_IMAGE in scripts/deck/assets.mjs.`,
    );
  }
  const card = await previewCard(files);

  // Everything is built; only now is the old set replaced.
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  for (const webp of webps) await writeFile(path.join(OUT, webp.name), webp.data);
  await writeFile(path.join(OUT, path.basename(DECK_PDF_PATH)), pdf);
  await writeFile(CARD, card);
  return pdf.length;
}

/**
 * The card a deck link unfurls into in X, LinkedIn, Slack or WhatsApp: the
 * wordmark and "Pre-seed deck" on the left, three real slides fanned on the
 * right with the cover in front. Dark like the deck itself, so it reads as
 * the deck and not one of the site's light poster cards.
 */
async function previewCard(files) {
  const margin = 64;
  const column = 470;
  const white = "#ffffff";
  const soft = "#b9c2cd";

  const background = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">` +
      `<defs><radialGradient id="glow" cx="72%" cy="52%" r="55%">` +
      `<stop offset="0" stop-color="${BRAND}" stop-opacity="0.28"/>` +
      `<stop offset="1" stop-color="${BRAND}" stop-opacity="0"/></radialGradient></defs>` +
      `<rect width="${WIDTH}" height="${HEIGHT}" fill="#0b0b0c"/>` +
      `<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)"/></svg>`,
  );

  // Back to front: the market, the product, then the cover.
  const fan = [
    { file: files[4], width: 500, angle: 9, cx: 948, cy: 236, dim: 0.7 },
    { file: files[2], width: 530, angle: 4, cx: 912, cy: 290, dim: 0.85 },
    { file: files[0], width: 590, angle: -3, cx: 858, cy: 372, dim: 1 },
  ];
  const layers = [];
  for (const card of fan) {
    const { data, info } = await tiltedSlide(card);
    layers.push({
      input: data,
      left: Math.round(card.cx - info.width / 2),
      top: Math.round(card.cy - info.height / 2),
    });
  }

  const headline = ["Pre-seed", "deck"];
  const sizes = await Promise.all(headline.map((line) => metrics(line, DISPLAY, 0)));
  const widest = Math.max(...sizes.map((size) => size.width / size.cap));
  const cap = Math.min(96, column / widest);
  const lines = await Promise.all(
    headline.map((text, index) =>
      place({ text, style: DISPLAY, cap, tracking: 0, left: margin, baseline: 330 + index * cap * 1.18, fill: white }),
    ),
  );
  const type = [
    await place({ text: "CONSTRUCT", style: DISPLAY, cap: 27, tracking: 0.16, left: margin, baseline: 74, fill: white }),
    ...lines,
    await place({ text: "AI employees for small teams,", style: TEXT, cap: 17, tracking: 0, left: margin, baseline: 500, fill: soft }),
    await place({ text: "each with its own desktop.", style: TEXT, cap: 17, tracking: 0, left: margin, baseline: 530, fill: soft }),
    await place({ text: "construct.computer/deck", style: TEXT, cap: 15, tracking: 0.01, left: margin, baseline: 578, fill: BRAND }),
  ];
  const text = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">${type.map((entry) => entry.markup).join("")}</svg>`,
  );

  return sharp(background)
    .composite([...layers, { input: text }])
    .flatten({ background: "#0b0b0c" })
    .jpeg({ quality: 88, mozjpeg: true, chromaSubsampling: "4:4:4" })
    .toBuffer();
}

/** One slide with rounded corners and a soft shadow, turned by `angle` degrees. */
async function tiltedSlide({ file, width, angle, dim }) {
  const height = Math.round((width * SLIDE_HEIGHT) / SLIDE_WIDTH);
  const radius = Math.round(width * 0.014);
  const pad = 48;
  const corners = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" rx="${radius}" fill="#fff"/></svg>`,
  );
  const slide = await sharp(file)
    .resize(width, height)
    .modulate({ brightness: dim })
    .composite([{ input: corners, blend: "dest-in" }])
    .png()
    .toBuffer();
  const shadow = await sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width + pad * 2}" height="${height + pad * 2}">` +
        `<rect x="${pad}" y="${pad + 16}" width="${width}" height="${height}" rx="${radius}" fill="#000" fill-opacity="0.75"/></svg>`,
    ),
  )
    .blur(20)
    .png()
    .toBuffer();
  const framed = await sharp(shadow)
    .composite([{ input: slide, left: pad, top: pad }])
    .png()
    .toBuffer();
  return sharp(framed)
    .rotate(angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer({ resolveWithObject: true });
}

/** Clickable areas on a slide: its videos open on YouTube, its links on the site. */
function linksOf(slide) {
  const links = [];
  for (const video of slide.videos ?? []) {
    const url = `https://www.youtube.com/watch?v=${video.youtubeId}`;
    links.push({ box: video.box, url }, { box: video.button, url });
  }
  for (const link of slide.links ?? []) {
    links.push({ box: link.box, url: `${SITE}${link.href}&utm_medium=pdf` });
  }
  return links;
}

/**
 * A minimal PDF: one page per slide, each a full-bleed JPEG with link
 * annotations over the slide's videos and links. Written by hand rather than
 * with a library, since this is all it needs.
 */
function buildPdf(pages, linksByPage) {
  const objects = [];
  const add = (body) => {
    objects.push(body);
    return objects.length;
  };
  const text = (value) => `(${value.replace(/[\\()]/g, (c) => `\\${c}`)})`;
  const scaleX = PAGE.width / SLIDE_WIDTH;
  const scaleY = PAGE.height / SLIDE_HEIGHT;

  const catalog = add(null);
  const pageTree = add(null);
  const info = add(
    Buffer.from(
      `<< /Title ${text("Construct Computer deck")} /Author ${text("Construct Computer")} /Producer ${text("construct.computer")} >>`,
    ),
  );
  const pageIds = pages.map((page, index) => {
    const image = add(
      Buffer.concat([
        Buffer.from(
          `<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.jpeg.length} >>\nstream\n`,
        ),
        page.jpeg,
        Buffer.from("\nendstream"),
      ]),
    );
    const draw = `q ${PAGE.width} 0 0 ${PAGE.height} 0 0 cm /Im Do Q`;
    const content = add(Buffer.from(`<< /Length ${draw.length} >>\nstream\n${draw}\nendstream`));
    const annots = linksByPage[index].map(({ box, url }) => {
      const x1 = box.x * scaleX;
      const x2 = (box.x + box.w) * scaleX;
      const y1 = PAGE.height - (box.y + box.h) * scaleY;
      const y2 = PAGE.height - box.y * scaleY;
      return add(
        Buffer.from(
          `<< /Type /Annot /Subtype /Link /Rect [${[x1, y1, x2, y2].map((v) => v.toFixed(2)).join(" ")}] /Border [0 0 0] /A << /S /URI /URI ${text(url)} >> >>`,
        ),
      );
    });
    return add(
      Buffer.from(
        `<< /Type /Page /Parent ${pageTree} 0 R /MediaBox [0 0 ${PAGE.width} ${PAGE.height}] /Resources << /XObject << /Im ${image} 0 R >> >> /Contents ${content} 0 R${annots.length ? ` /Annots [${annots.map((id) => `${id} 0 R`).join(" ")}]` : ""} >>`,
      ),
    );
  });
  objects[catalog - 1] = Buffer.from(`<< /Type /Catalog /Pages ${pageTree} 0 R >>`);
  objects[pageTree - 1] = Buffer.from(
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`,
  );

  const chunks = [Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "latin1")];
  let offset = chunks[0].length;
  const offsets = objects.map((body, index) => {
    const start = offset;
    const chunk = Buffer.concat([Buffer.from(`${index + 1} 0 obj\n`), body, Buffer.from("\nendobj\n")]);
    chunks.push(chunk);
    offset += chunk.length;
    return start;
  });
  const xref = [
    "xref",
    `0 ${objects.length + 1}`,
    "0000000000 65535 f ",
    ...offsets.map((start) => `${String(start).padStart(10, "0")} 00000 n `),
    "trailer",
    `<< /Size ${objects.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>`,
    "startxref",
    String(offset),
    "%%EOF",
    "",
  ].join("\n");
  chunks.push(Buffer.from(xref));
  return Buffer.concat(chunks);
}
