export type Schedule = {
  published?: string;
  time?: string;
  draft?: boolean;
};

export function scheduleOf(source: string): Schedule | undefined;

export function dueSlugs(
  posts: readonly ({ slug: string } & Schedule)[],
  now: Date,
): string[];

export function unpublished(
  slugs: readonly string[],
  sitemapXml: string,
): string[];
