/**
 * Brings /deck/ up to date with the deck in Figma, with no hand work.
 *
 *   pnpm deck:sync           update everything, if anything changed
 *   pnpm deck:sync --check   say what changed and touch nothing; exits 1 if out of date
 *   pnpm deck:sync --force   rebuild even if nothing changed
 *
 * It reads the Figma file over the REST API, renders every slide at 2x,
 * rewrites app/features/deck/slides.figma.ts (order, each slide's text as its
 * alt text, the round size, a version) and rebuilds the slide images, the
 * emailed PDF and the preview card (scripts/deck/assets.mjs). Then it checks
 * what it wrote, and lists what only a person can fix: a new slide's title,
 * or a video that moved, both in app/features/deck/slides.ts.
 *
 * Needs FIGMA_TOKEN, a Figma personal access token with the file_content:read
 * scope (Figma, Settings, Security, Personal access tokens), in the
 * environment or in .env.local. FIGMA_API_URL points it at a stand-in API, for
 * testing. The preview card is set in Helvetica Neue, which ships with macOS.
 */
import { createHash } from "node:crypto";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

import { figmaDeck } from "../app/features/deck/slides.figma.ts";
import {
  deckSlides,
  slideDetails,
  SLIDE_HEIGHT,
  SLIDE_WIDTH,
} from "../app/features/deck/slides.ts";
import { DECK_PDF_PATH } from "../shared/deck-schema.ts";
import { buildDeckAssets } from "./deck/assets.mjs";
import {
  FIGMA_API,
  altText,
  compareDecks,
  download,
  exportUrls,
  fetchDeckFile,
  labelOf,
  raiseOf,
  slidesFromFile,
  wordDiff,
  youtubeIdsOf,
} from "./deck/figma.mjs";

const GENERATED = path.resolve("app/features/deck/slides.figma.ts");
const ASSETS = path.resolve("public/assets/deck");
const CARD = path.resolve("public/og/deck.jpg");
/** How far a video may drift in Figma, in slide pixels, before its hotspot needs moving. */
const DRIFT = 4;

const flags = new Set(process.argv.slice(2));
const checkOnly = flags.has("--check");
const force = flags.has("--force");

// The token can live in .env.local, which isn't committed.
try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local: the environment has to carry FIGMA_TOKEN.
}

process.exitCode = await main().catch((error) => {
  console.error(`\ndeck:sync stopped: ${error.message}`);
  return 1;
});

async function main() {
  const token = process.env.FIGMA_TOKEN?.trim();
  if (!token) {
    console.error(
      "FIGMA_TOKEN isn't set. Make a personal access token in Figma (Settings, Security, Personal access tokens) " +
        "with the file_content:read scope, then put FIGMA_TOKEN=... in .env.local or the environment.",
    );
    return 1;
  }
  const api = process.env.FIGMA_API_URL?.trim() || FIGMA_API;
  const fileKey = figmaDeck.fileKey;

  console.log(`Reading the deck from Figma (${fileKey})...`);
  const file = await fetchDeckFile({ api, fileKey, token });
  const found = slidesFromFile(file);
  for (const slide of found) {
    if (slide.width !== SLIDE_WIDTH || slide.height !== SLIDE_HEIGHT) {
      throw new Error(
        `Slide ${slide.id} is ${slide.width}x${slide.height}; the site expects ${SLIDE_WIDTH}x${SLIDE_HEIGHT}.`,
      );
    }
  }

  console.log(`Rendering ${found.length} slides...`);
  const urls = await exportUrls({
    api,
    fileKey,
    token,
    ids: found.map((slide) => slide.id),
  });
  const work = await mkdtemp(path.join(os.tmpdir(), "deck-sync-"));
  const files = [];
  const next = [];
  try {
    for (const [index, slide] of found.entries()) {
      const png = await download(urls[slide.id]);
      const { width, height } = await sharp(png).metadata();
      if (width !== SLIDE_WIDTH * 2 || height !== SLIDE_HEIGHT * 2) {
        throw new Error(
          `Figma rendered slide ${slide.id} at ${width}x${height}, not ${SLIDE_WIDTH * 2}x${SLIDE_HEIGHT * 2}.`,
        );
      }
      const target = path.join(
        work,
        `${String(index + 1).padStart(2, "0")}.png`,
      );
      await writeFile(target, png);
      files.push(target);
      next.push({
        id: slide.id,
        label: labelOf(slide.texts),
        text: altText(slide.texts),
        image: createHash("sha256").update(png).digest("hex").slice(0, 16),
      });
    }

    const changes = compareDecks(figmaDeck.slides, next);
    const imageChanged = next
      .filter((slide) =>
        figmaDeck.slides.some(
          (old) => old.id === slide.id && old.image !== slide.image,
        ),
      )
      .map((slide) => slide.id);
    const raise = raiseOf(found) ?? figmaDeck.raise;
    const changed =
      changes.added.length +
        changes.removed.length +
        changes.textChanged.length +
        imageChanged.length >
        0 ||
      changes.reordered ||
      raise !== figmaDeck.raise;

    report({ changes, imageChanged, raise, next });
    const notes = review(found, next);

    if (!changed && !force) {
      console.log("\nThe site already matches Figma.");
      printNotes(notes);
      return 0;
    }
    if (checkOnly) {
      console.log("\nOut of date. Run `pnpm deck:sync` to update.");
      printNotes(notes);
      return 1;
    }

    const version = `${new Date().toISOString().slice(0, 10)}-${createHash(
      "sha256",
    )
      .update(next.map((slide) => slide.image).join(""))
      .digest("hex")
      .slice(0, 8)}`;
    console.log(
      "\nRebuilding the slide images, the PDF and the preview card...",
    );
    const slides = deckSlides(next);
    await buildDeckAssets(files, slides);
    await writeFile(
      GENERATED,
      generatedModule({ fileKey, version, raise, slides: next }),
    );
    await verify(next.length);
    console.log(
      `\nDone: version ${version}. Review with \`git diff\`, then \`pnpm check\` and deploy.`,
    );
    printNotes(notes);
    return 0;
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

/** What changed, slide by slide, in the deck's own order. */
function report({ changes, imageChanged, raise, next }) {
  const title = (id) => {
    const index = next.findIndex((slide) => slide.id === id);
    const known =
      slideDetails[id]?.title ??
      next[index]?.label ??
      figmaDeck.slides.find((s) => s.id === id)?.label;
    return `${index >= 0 ? `slide ${index + 1}` : "removed slide"} (${known ?? id})`;
  };
  const lines = [];
  for (const id of changes.added) lines.push(`+ New ${title(id)}`);
  for (const id of changes.removed) lines.push(`- Gone: ${title(id)}`);
  if (changes.reordered) lines.push("~ The slides are in a new order");
  for (const id of changes.textChanged) {
    const before =
      figmaDeck.slides.find((slide) => slide.id === id)?.text ?? "";
    const after = next.find((slide) => slide.id === id)?.text ?? "";
    lines.push(
      before
        ? `~ Text on ${title(id)}: ${wordDiff(before, after)}`
        : `~ Text recorded for ${title(id)}`,
    );
  }
  for (const id of imageChanged.filter(
    (id) => !changes.textChanged.includes(id),
  )) {
    lines.push(`~ Looks different, same text: ${title(id)}`);
  }
  if (raise !== figmaDeck.raise)
    lines.push(
      `~ The round: ${figmaDeck.raise} is now ${raise} (email and link preview follow)`,
    );
  console.log(
    lines.length
      ? `\nWhat changed in Figma:\n${lines.map((line) => `  ${line}`).join("\n")}`
      : "\nNothing changed in Figma.",
  );
}

/** What only a person can settle in slides.ts. */
function review(found, next) {
  const notes = [];
  for (const [index, slide] of found.entries()) {
    const details = slideDetails[slide.id];
    const where = `slide ${index + 1} (${details?.title ?? next[index].label ?? slide.id})`;
    if (!details) {
      notes.push(
        `${where} has no entry in slideDetails; it's titled "${next[index].label ?? `Slide ${index + 1}`}" for now.`,
      );
    }
    const videos = [...(details?.videos ?? [])].sort(
      (a, b) => a.box.x - b.box.x,
    );
    if (slide.embeds.length !== videos.length) {
      notes.push(
        `${where} has ${slide.embeds.length} video${slide.embeds.length === 1 ? "" : "s"} in Figma and ${videos.length} in slideDetails.`,
      );
    } else {
      videos.forEach((video, i) => {
        const box = slide.embeds[i].box;
        const off = ["x", "y", "w", "h"].some(
          (key) => Math.abs(video.box[key] - box[key]) > DRIFT,
        );
        if (off)
          notes.push(
            `${where}: the ${video.name} video moved in Figma; set its box to ${JSON.stringify(box)}.`,
          );
      });
    }
    const played = new Set(videos.map((video) => video.youtubeId));
    for (const id of youtubeIdsOf(slide.texts)) {
      if (!played.has(id))
        notes.push(
          `${where} links youtu.be/${id}, which slideDetails doesn't play.`,
        );
    }
  }
  return notes;
}

function printNotes(notes) {
  if (!notes.length) return;
  console.log(
    `\nFor a person, in app/features/deck/slides.ts:\n${notes.map((note) => `  - ${note}`).join("\n")}`,
  );
}

/** Reads back what was written: every image, a page per slide in the PDF, the card. */
async function verify(count) {
  const names = (await readdir(ASSETS)).filter((name) =>
    name.endsWith(".webp"),
  );
  if (names.length !== count * 3)
    throw new Error(
      `Expected ${count * 3} slide images, found ${names.length}.`,
    );
  const pdf = await readFile(path.join(ASSETS, path.basename(DECK_PDF_PATH)));
  const pages = pdf.toString("latin1").match(/\/Type \/Page /g)?.length ?? 0;
  if (pages !== count)
    throw new Error(`The PDF has ${pages} pages, not ${count}.`);
  const card = await sharp(await readFile(CARD)).metadata();
  if (card.width !== 1200 || card.height !== 630)
    throw new Error(`The preview card is ${card.width}x${card.height}.`);
  console.log(
    `Checked: ${names.length} slide images, a ${pages}-page PDF and a 1200x630 preview card.`,
  );
}

function generatedModule({ fileKey, version, raise, slides }) {
  const rows = slides
    .map(
      (slide) =>
        `    {\n      id: ${JSON.stringify(slide.id)},\n      label: ${JSON.stringify(slide.label)},\n      image: ${JSON.stringify(slide.image)},\n      text: ${JSON.stringify(slide.text)},\n    },`,
    )
    .join("\n");
  return `// Written by \`pnpm deck:sync\` from the Figma file; don't edit by hand.
// Change the deck in Figma and sync. See slides.ts.

export const figmaDeck: {
  fileKey: string;
  version: string;
  raise: string;
  /** In deck order. \`image\` fingerprints the slide's render, so a visual-only edit counts as a change. */
  slides: Array<{ id: string; label: string | null; text: string; image: string }>;
} = {
  fileKey: ${JSON.stringify(fileKey)},
  version: ${JSON.stringify(version)},
  raise: ${JSON.stringify(raise)},
  slides: [
${rows}
  ],
};
`;
}
