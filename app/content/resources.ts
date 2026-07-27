import { blogMetadata } from "./blog/metadata.generated";
import { getAuthor, type Author } from "./authors";
import type { BlogFrontmatter } from "./schema";

export type ResourceKind = BlogFrontmatter["kind"];

export type ResourceEntry = {
  readonly slug: string;
  readonly kind: ResourceKind;
  readonly title: string;
  readonly seoTitle?: string;
  readonly description: string;
  readonly published: string;
  readonly updated?: string;
  readonly author: Author;
  readonly tags: readonly string[];
};

export const resourceEntries: readonly ResourceEntry[] = blogMetadata
  .filter((post) => !post.draft)
  .map((post) => ({
    slug: post.slug,
    kind: post.kind,
    title: post.title,
    seoTitle: post.seoTitle,
    description: post.description,
    published: post.published,
    updated: post.updated,
    author: getAuthor(post.author),
    tags: post.tags,
  }))
  .sort((left, right) => right.published.localeCompare(left.published));

export function getResource(slug: string): ResourceEntry | undefined {
  return resourceEntries.find((entry) => entry.slug === slug);
}
