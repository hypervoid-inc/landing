import { blogMetadata } from "./blog/metadata.generated";
import { comparisonPages } from "./comparisons";
import { guidePages } from "./guides";

export type ResourceKind = "article" | "guide" | "comparison";

export type ResourceEntry = {
  readonly slug: string;
  readonly sourceSlug: string;
  readonly kind: ResourceKind;
  readonly title: string;
  readonly seoTitle?: string;
  readonly description: string;
  readonly date: string;
  readonly published: string;
  readonly author: string;
};

export const resourceEntries: readonly ResourceEntry[] = [
  ...blogMetadata
    .filter((post) => !post.draft)
    .map((post) => ({
      slug: post.slug,
      sourceSlug: post.slug,
      kind: "article" as const,
      title: post.title,
      seoTitle: post.seoTitle,
      description: post.description,
      date: post.updated ?? post.date,
      published: post.date,
      author: post.author,
    })),
  ...guidePages.map((guide) => ({
    slug: guide.slug,
    sourceSlug: guide.slug,
    kind: "guide" as const,
    title: guide.title,
    description: guide.description,
    date: guide.updated,
    published: guide.published,
    author: "Construct Team",
  })),
  ...comparisonPages.map((comparison) => ({
    slug: `construct-vs-${comparison.slug}`,
    sourceSlug: comparison.slug,
    kind: "comparison" as const,
    title: comparison.title,
    description: comparison.description,
    date: comparison.updated,
    published: comparison.updated,
    author: "Construct Team",
  })),
].sort((left, right) => right.date.localeCompare(left.date));

export function getResource(slug: string): ResourceEntry | undefined {
  return resourceEntries.find((entry) => entry.slug === slug);
}
