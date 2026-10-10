export const siteUrl: string;
export const minimumAgeDays: number;

export function canonicalUrl(slug: string): string;

export function parsePost(source: string): {
  frontmatter: Record<string, unknown>;
  body: string;
};

export function inFeed(
  post: { draft: boolean; published: string; kind: string },
  today: string,
): boolean;

export function toMarkdown(
  body: string,
  options: {
    slug: string;
    utmSource: string;
    titles: Record<string, string>;
  },
): string;

export function toHtml(markdown: string): string;
