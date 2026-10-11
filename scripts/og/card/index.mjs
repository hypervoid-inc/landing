import { Buffer } from "node:buffer";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { renderCard } from "./render.mjs";

export { closeRenderer } from "./render.mjs";

/**
 * Renders one route's card from its content and context.
 *
 * Bump `CARD_VERSION` when the frame or a figure changes how it draws, so
 * every published image is marked stale and `pnpm og` rewrites the set.
 */
export const CARD_VERSION = 1;

const root = fileURLToPath(new URL("../../../", import.meta.url));

const uri = (buffer, type) =>
  `data:${type};base64,${Buffer.from(buffer).toString("base64")}`;

/**
 * `images` are the published cards of a mosaic's pages, as JPEG buffers in
 * the order `context.members` lists them.
 */
export async function renderOgCard(card, context, images = []) {
  let figure = card.figure;
  if (figure.kind === "mosaic") {
    figure = {
      ...figure,
      count: context.count,
      images: images.map((image) => ({ uri: uri(image, "image/jpeg") })),
    };
  }
  if (figure.kind === "profile" && figure.photo) {
    const file = path.join(root, "public", figure.photo);
    const type = file.endsWith(".webp") ? "image/webp" : "image/png";
    figure = { ...figure, photo: uri(readFileSync(file), type) };
  }
  return renderCard({
    title: card.title,
    deck: card.deck,
    eyebrow: context.eyebrow,
    figure,
  });
}
