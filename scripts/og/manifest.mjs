import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PUBLISH_VERSION } from "./publish.mjs";

/**
 * Source layout and the freshness record for `public/og/`.
 *
 *   assets/og/<file>.png         a finished 1200x630 card, published as-is
 *   assets/og/poster/<name>.webp a generated 16:9 card, cropped and published
 *   assets/og/style/master.webp  the approved card every generation matches
 *
 * Because the images are committed rather than rebuilt, something has to notice
 * when a headline changes or a card is replaced and the JPEGs are not
 * re-rendered. `pnpm og` writes a signature per image; `tests/og-images.test.ts`
 * recomputes it from live route data and disk, and fails when the two disagree.
 */

const root = fileURLToPath(new URL("../../", import.meta.url));

export const sourceDirectory = path.join(root, "assets/og");
export const posterDirectory = path.join(sourceDirectory, "poster");
export const styleDirectory = path.join(sourceDirectory, "style");
export const outputDirectory = path.join(root, "public/og");
export const manifestPath = path.join(sourceDirectory, "manifest.json");
export const promptsPath = path.join(sourceDirectory, "PROMPTS.md");

async function readIfPresent(file) {
  try {
    return await readFile(file);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

/** Source cards may be authored in any of these; output is always JPEG. */
const CUSTOM_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

async function readFirst(directory, stem, extensions) {
  for (const extension of extensions) {
    const found = await readIfPresent(
      path.join(directory, `${stem}${extension}`),
    );
    if (found) return found;
  }
  return null;
}

function readCustom(stem) {
  return readFirst(sourceDirectory, stem, CUSTOM_EXTENSIONS);
}

/**
 * Generated cards are stored as WebP: at q95 it is several times smaller than
 * the PNG the model returns, and the published JPEG comes out within a few KB
 * of identical. PNG is still read so hand-saved cards keep working.
 */
function readPoster(name) {
  return readFirst(posterDirectory, name, [".webp", ".png"]);
}

/**
 * The source files behind one image, in precedence order: `custom` is a
 * finished card that wins outright, `poster` is the generated card. `stem` is
 * the published filename without its extension, which differs from the route
 * name only when MDX frontmatter names its own image.
 */
export async function readSources(name, stem = name) {
  const [custom, poster] = await Promise.all([
    readCustom(stem),
    readPoster(name),
  ]);
  return { custom, poster };
}

/**
 * Every input that can change an output image, collapsed to one hash.
 *
 * The route title is deliberately absent: the card carries the hand-broken
 * `headline` from `app/content/og-poster.ts`, not the page title, so editing an
 * SEO string is not a reason to re-render. Editing the headline or the badge
 * is, because the card is then making a promise it no longer keeps.
 */
export function signature({
  stem,
  eyebrow,
  headline,
  fullFrame = false,
  custom,
  poster,
}) {
  return digest(
    JSON.stringify({
      stem,
      eyebrow,
      headline,
      fullFrame,
      publish: PUBLISH_VERSION,
      custom: custom && digest(custom),
      poster: poster && digest(poster),
    }),
  );
}

export async function readManifest() {
  const source = await readIfPresent(manifestPath);
  return source ? JSON.parse(source.toString()) : {};
}
