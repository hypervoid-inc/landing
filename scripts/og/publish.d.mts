/** Types for `publish.mjs`, which stays plain JS so build scripts can run it directly. */

export declare const WIDTH: number;
export declare const HEIGHT: number;
export declare const PUBLISH_VERSION: number;

/**
 * Fits a generated 16:9 card to 1200x630 and encodes the published JPEG.
 * Centre-crops by default; `fullFrame` scales to fit instead, for a card whose
 * composition runs to all four edges and cannot be cropped.
 */
export declare function publish(
  input: Buffer | string,
  options?: { fullFrame?: boolean },
): Promise<Buffer>;
