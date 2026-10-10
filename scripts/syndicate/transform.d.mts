export type Platform =
  "devto" | "hashnode" | "medium" | "substack" | "linkedin" | "x";

export const siteUrl: string;
export const minimumAgeDays: number;
export const platforms: Record<
  Platform,
  {
    label: string;
    format: "markdown" | "html";
    length: "full" | "teaser";
    tables: boolean;
  }
>;

export function canonicalUrl(slug: string): string;

export function parsePost(source: string): {
  frontmatter: Record<string, unknown>;
  body: string;
};

export function eligibility(
  post: { draft: boolean; published: string; kind: string },
  today: string,
): { ok: true } | { ok: false; hard: boolean; reason: string };

export function devtoTags(tags: readonly string[]): string[];

export function tablesToLists(markdown: string): string;

export function toMarkdown(
  body: string,
  options: {
    slug: string;
    platform: Platform;
    titles: Record<string, string>;
  },
): string;

export function toTeaser(markdown: string, url: string): string;

export function toHtml(markdown: string): string;

export type Copy = {
  platform: Platform;
  title: string;
  description: string;
  tags: string[];
  canonical: string;
  coverImage?: string;
  markdown: string;
  filename: string;
  content: string;
};

export function buildCopy(input: {
  slug: string;
  source: string;
  platform: Platform;
  titles: Record<string, string>;
  coverImage?: string;
}): Copy;
