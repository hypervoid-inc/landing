import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { FRAME_VERSION } from "./frame.mjs";

/**
 * Source layout and the freshness record for `public/og/`.
 *
 *   assets/og/<file>.png       a finished 1200x630 image, published as-is
 *   assets/og/full/<name>.png  wide artwork filling the card, type set over it
 *
 * Because the images are committed rather than rebuilt, something has to notice
 * when a title changes or artwork is replaced and the PNGs are not re-rendered.
 * `pnpm og` writes a signature per image; `tests/og-images.test.ts` recomputes
 * it from live route data and disk, and fails when the two disagree.
 */

const root = fileURLToPath(new URL("../../", import.meta.url));

export const sourceDirectory = path.join(root, "assets/og");
export const fullDirectory = path.join(sourceDirectory, "full");

/**
 * @deprecated Square tile artwork. Nothing reads this directory any more —
 * `readSources` no longer looks in it and `renderOne` no longer composites from
 * it. Kept so `--layout tile` can still write here if the layout is ever
 * revived.
 */
export const artDirectory = path.join(sourceDirectory, "art");
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
 * Generated artwork is stored as WebP: at q95 it is eight times smaller than
 * the PNG the model returns, and the published JPEG comes out within 4KB of
 * identical. PNG is still read so older artwork keeps working.
 */
function readFull(name) {
  return readFirst(fullDirectory, name, [".webp", ".png"]);
}

/**
 * The source files behind one image, in precedence order: `custom` is a
 * finished card that wins outright, `full` is wide artwork the type is set
 * over. `stem` is the published filename without its extension, which differs
 * from the route name only when MDX frontmatter names its own image.
 */
export async function readSources(name, stem = name) {
  const [custom, full] = await Promise.all([readCustom(stem), readFull(name)]);
  return { custom, full };
}

/** Every input that can change an output image, collapsed to one hash. */
export function signature({ title, kind, stem, custom, full, photo }) {
  return digest(
    JSON.stringify({
      title,
      kind,
      stem,
      frame: FRAME_VERSION,
      custom: custom && digest(custom),
      full: full && digest(full),
      photo: photo && digest(photo),
    }),
  );
}

export async function readManifest() {
  const source = await readIfPresent(manifestPath);
  return source ? JSON.parse(source.toString()) : {};
}
