/** Types for `frame.mjs`, which stays plain JS so build scripts can run it directly. */

export declare const WIDTH: number;
export declare const HEIGHT: number;
export declare const FRAME_VERSION: number;

export declare function eyebrowFor(kind: string): string;

/** Re-encodes a hand-made card to the published format: JPEG, opaque, 1200x630. */
export declare function encodeImage(
  input: Buffer | string,
): Promise<Buffer>;

export declare function renderPortrait(input: {
  title: string;
  kind: string;
  photo: Buffer | string;
}): Promise<Buffer>;

export declare function renderFullBleed(input: {
  title: string;
  kind: string;
  artwork: Buffer | string;
}): Promise<Buffer>;

/** @deprecated The square-tile layout is retired; only the placeholder path is wired. */
export declare function renderFrame(input: {
  title: string;
  kind: string;
  artwork?: string | null;
}): Promise<Buffer>;
