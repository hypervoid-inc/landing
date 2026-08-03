import sharp from "sharp";

/**
 * Turns a generated card into the file that ships.
 *
 * There is nothing to compose any more: the type is rendered inside the card,
 * so publishing is a crop and an encode. What is left here is the part that
 * still has to be exactly right every time, and the version number that marks
 * every committed image stale when it changes.
 */

export const WIDTH = 1200;
export const HEIGHT = 630;

/** Bump when publishing changes, to force every image to be rewritten. */
export const PUBLISH_VERSION = 4;

/**
 * Published images are JPEG, flattened onto white.
 *
 * These cards are near-photographic renders, which PNG stores about nine times
 * larger for no visible gain. Weight matters twice over: social crawlers fetch
 * them, and the blog index renders fourteen of them as thumbnails.
 *
 * Flattening also drops the alpha channel. An OG image must be opaque, because
 * clients composite it onto backgrounds we do not control and a transparent
 * region can come out black. `4:4:4` is not the usual default and is worth the
 * bytes here: these cards are saturated blue with white type on top, and
 * chroma subsampling puts coloured fringes on exactly that.
 *
 * 88 rather than the 92 the old vector-type cards used. These are photographs
 * of dark studio scenes, which cost far more to store than a flat gradient did:
 * at 92 the set ran about 4.2MB against a 4MB budget, and at 88 it runs 3.7MB
 * with no visible difference on the type, which is the only place artefacts
 * would show.
 */
const JPEG_QUALITY = 88;

/**
 * Cards are generated 16:9 because Gemini offers no 1.91:1, so something has to
 * give across the 3.9% difference in height.
 *
 * Normally that is a centre crop, and the contract reserves a safe band at the
 * top and bottom so the crop only ever eats empty studio.
 *
 * `fullFrame` cards are scaled to fit instead, accepting a 6.7% vertical
 * squash. That is for a card composed as a poster rather than a photograph:
 * type running to all four edges, a wordmark up the full height, a rule along
 * the bottom. Cropping one of those clips the composition, while squashing it
 * is imperceptible — condensed type gets very slightly more condensed and
 * nothing else in the frame has a shape the eye holds a reference for. Reach
 * for it only when the composition genuinely uses the whole frame; a squashed
 * photograph of a real object looks wrong straight away.
 */
export function publish(input, { fullFrame = false } = {}) {
  return sharp(input)
    .resize(WIDTH, HEIGHT, {
      fit: fullFrame ? "fill" : "cover",
      position: "centre",
    })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true, chromaSubsampling: "4:4:4" })
    .toBuffer();
}
