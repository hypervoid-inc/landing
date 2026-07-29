/** Types for `prompt.mjs`, which stays plain JS so build scripts can run it directly. */

export type Layout = {
  aspectRatio: string;
  canvas: string;
  composition: string;
};

export type ReferenceImage = { file: string; note: string };

export declare const referenceImages: readonly ReferenceImage[];
export declare const layouts: Record<"tile" | "full", Layout>;
export declare const styleContract: string;

export declare function buildPrompt(route: {
  name: string;
  kind: string;
  title: string;
  subject: string;
  layout?: "tile" | "full";
}): string;

export declare function promptHeader(): string;
