/** Types for `poster.mjs`, which stays plain JS so build scripts can run it directly. */

export type ReferenceImage = { file: string; note: string };

export declare const POSTER_VERSION: number;
export declare const POSTER_ASPECT: string;
export declare const stylePlatePath: string;

/** The references attached to a call, style plate first when one exists. */
export declare function posterReferences(): ReferenceImage[];

export declare function buildPosterPrompt(card: {
  eyebrow: string;
  headline: readonly string[];
  scene: string;
  note?: string;
}): string;

export declare function promptHeader(): string;
