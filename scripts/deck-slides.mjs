/**
 * Builds the deck's images, PDF and preview card from slides exported from
 * Figma by hand, as PNG at 2x.
 *
 *   pnpm deck:slides <folder holding 01.png, 02.png, ...>
 *
 * `pnpm deck:sync` does the export and this in one go, and keeps
 * app/features/deck/slides.figma.ts current; this is for when there is no
 * Figma token to hand. Either way, see scripts/deck/assets.mjs.
 */
import { readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { slides } from "../app/features/deck/slides.ts";
import { buildDeckAssets } from "./deck/assets.mjs";

const source = process.argv[2];
if (!source) {
  console.error("Usage: pnpm deck:slides <folder holding 01.png, 02.png, ...>");
  process.exit(1);
}

const pngs = (await readdir(source))
  .filter((name) => /^\d{2}\.png$/.test(name))
  .sort();
if (pngs.length === 0) {
  console.error(`No slides named 01.png, 02.png, ... in ${source}`);
  process.exit(1);
}

const bytes = await buildDeckAssets(
  pngs.map((png) => path.join(source, png)),
  slides,
);
console.log(
  `Wrote ${pngs.length} slides and a ${(bytes / 2 ** 20).toFixed(2)} MiB PDF to public/assets/deck/, and the preview card to public/og/deck.jpg.`,
);
