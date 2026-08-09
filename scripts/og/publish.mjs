import sharp from "sharp";

import { HEIGHT, TYPE_VERSION, WIDTH, typeLayer } from "./typeset.mjs";

/**
 * Turns a generated photograph into the file that ships.
 *
 * Publishing is a crop, a type layer, and an encode. The type used to come out
 * of the model with the rest of the card; it is now set here, at exact pixel
 * positions, which is what makes the wordmark, the badge, the headline and the
 * domain identical across every card instead of merely similar. See
 * `scripts/og/typeset.mjs` for why.
 *
 * One consequence worth knowing: a headline edit is now a republish, not a
 * regeneration. `pnpm og` alone picks it up, and the model is never called.
 */

export { WIDTH, HEIGHT };

/**
 * Bump when publishing changes, to force every image to be rewritten. Tracks
 * the type layer too, so a change to the typography marks the set stale.
 */
export const PUBLISH_VERSION = 5 + TYPE_VERSION;

/**
 * Published images are JPEG, flattened onto white.
 *
 * These cards are near-photographic renders, which PNG stores about nine times
 * larger for no visible gain. Weight matters twice over: social crawlers fetch
 * them, and the blog index renders fourteen of them as thumbnails.
 *
 * Flattening also drops the alpha channel. An OG image must be opaque, because
 * clients composite it onto backgrounds we do not control and a transparent
 * region can come out black.
 *
 * `4:4:4` is not the default and is worth the bytes: chroma subsampling puts
 * coloured fringes on hard type edges, and the type here is a flat vector layer
 * sitting on a pale ground, which is the worst case for it.
 */
const JPEG_QUALITY = 88;

/**
 * Cards are generated 16:9 because Gemini offers no 1.91:1, so something has to
 * give across the 3.9% difference in height.
 *
 * Normally that is a centre crop, and the contract reserves a safe band at the
 * top and bottom so the crop only ever eats empty studio.
 *
 * `fullFrame` scales to fit instead, accepting a 6.7% vertical squash. It is
 * for a hand-made card composed to all four edges, where cropping would clip
 * the composition and the squash is imperceptible. A photograph of a real
 * object squashed by 6.7% looks wrong straight away, so it is never right for a
 * generated card.
 */
export async function publish(input, { fullFrame = false, type } = {}) {
  const photograph = await sharp(input)
    .resize(WIDTH, HEIGHT, {
      fit: fullFrame ? "fill" : "cover",
      position: "centre",
    })
    .toBuffer();

  const composed = type
    ? await sharp(photograph)
        .composite([{ input: await typeLayer(type) }])
        .toBuffer()
    : photograph;

  return sharp(composed)
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true, chromaSubsampling: "4:4:4" })
    .toBuffer();
}
