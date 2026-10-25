import type { Buffer } from "node:buffer";

export function zip(entries: readonly { name: string; data: Buffer }[]): Buffer;

export function readme(brand: typeof import("../app/content/brand")): string;

export function buildBrandKit(
  folder: string,
  brand: typeof import("../app/content/brand"),
  catalog: string,
): Promise<Buffer>;
