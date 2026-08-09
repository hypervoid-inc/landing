/** Types for `poster.mjs`, which stays plain JS so build scripts can run it directly. */

export type ReferenceImage = { file: string; note: string };

export declare const POSTER_VERSION: number;
export declare const POSTER_ASPECT: string;
export declare const stylePlatePath: string;

/** The references attached to a call, style plate first when one exists. */
export declare function posterReferences(): ReferenceImage[];

/**
 * The prompt for one photograph. The headline and badge are deliberately not
 * part of it: they are set in code at publish time and the model never sees
 * them.
 */
export declare function buildPosterPrompt(card: {
  scene: string;
  note?: string;
}): string;

/** The card being repaired, then the mascot turnaround. */
export declare function repairReferences(card: string): ReferenceImage[];

/** The image-to-image pass that replaces a bad mascot and changes nothing else. */
export declare function buildRepairPrompt(): string;

export declare function promptHeader(): string;
