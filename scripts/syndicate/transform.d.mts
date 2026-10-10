export const siteUrl: string;

export function canonicalUrl(slug: string): string;

export function parsePost(source: string): {
  frontmatter: Record<string, unknown>;
  body: string;
};

export function toMarkdown(
  body: string,
  options: {
    slug: string;
    utmSource: string;
    titles: Record<string, string>;
  },
): string;

export function toHtml(markdown: string): string;
