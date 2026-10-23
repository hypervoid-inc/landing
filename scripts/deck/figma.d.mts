export type Box = { x: number; y: number; w: number; h: number };

export type FigmaText = { text: string; box: Box; url?: string };

export type FigmaSlide = {
  id: string;
  name: string;
  width: number;
  height: number;
  /** In reading order. */
  texts: FigmaText[];
  /** Embedded videos, left to right. */
  embeds: Array<{ box: Box }>;
};

export const FIGMA_API: string;

export function fetchDeckFile(options: { api?: string; fileKey: string; token: string }): Promise<unknown>;
export function exportUrls(options: {
  api?: string;
  fileKey: string;
  token: string;
  ids: string[];
}): Promise<Record<string, string>>;
export function download(url: string): Promise<Uint8Array>;

export function slidesFromFile(file: unknown): FigmaSlide[];
export function altText(texts: FigmaText[]): string;
export function labelOf(texts: FigmaText[]): string | null;
export function raiseOf(slides: FigmaSlide[]): string | null;
export function youtubeIdsOf(texts: FigmaText[]): string[];
export function wordDiff(before: string, after: string): string;
export function compareDecks(
  previous: ReadonlyArray<{ id: string; text: string }>,
  next: ReadonlyArray<{ id: string; text: string }>,
): { added: string[]; removed: string[]; reordered: boolean; textChanged: string[] };
