/** Types for `typeset.mjs`, which stays plain JS so build scripts can run it directly. */

export declare const WIDTH: number;
export declare const HEIGHT: number;
export declare const TYPE_VERSION: number;

/** The fractions of the frame the photograph has to leave clear for the type. */
export declare const RESERVED: {
  top: number;
  columnWidth: number;
};

/** Throws when the typeface the set is set in is not available to render. */
export declare function preflight(): Promise<void>;

/** The wordmark, badge, headline, and domain as a 1200x630 RGBA PNG. */
export declare function typeLayer(card: {
  eyebrow: string;
  headline: readonly string[];
}): Promise<Buffer>;
