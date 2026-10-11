/** Types for `index.mjs`, which stays plain JS so build scripts can run it directly. */

export declare const CARD_VERSION: number;

export declare function renderOgCard(
  card: unknown,
  context: unknown,
  images?: readonly Buffer[],
): Promise<Buffer>;

export declare function closeRenderer(): Promise<void>;
