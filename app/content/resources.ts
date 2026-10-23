import { blogMetadata } from "./blog/metadata.generated";
import { getAuthor, type Author } from "./authors";
import { contentDate } from "./content-date";
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
  /** Hand-picked OG image; absent means the generated one is used. */
  readonly image?: string;
};

/**
 * A post is live once it is not a draft and its `published` date has arrived
 * (see `contentDate`). Finished posts dated ahead stay out of every list, feed,
 * and route until the build that falls on their date.
 */
export function isLiveOn(
  post: { draft: boolean; published: string },
  day: string,
): boolean {
  return !post.draft && post.published <= day;
}

declare const __SHOW_ALL_POSTS__: boolean | undefined;

/**
 * The local dev server (`pnpm dev`, which sets `SHOW_ALL_POSTS=1`) shows
 * every post, drafts and scheduled ones included, so a post can be read in
 * place before its day. Builds, the scripts that read content through Vite,
 * and tests never set it, so they keep the schedule.
 */
const showEverything =
  typeof __SHOW_ALL_POSTS__ === "boolean" && __SHOW_ALL_POSTS__;

export function isLive(post: { draft: boolean; published: string }): boolean {
  return showEverything || isLiveOn(post, contentDate);
}

function toEntry(post: (typeof blogMetadata)[number]): ResourceEntry {
  return {
    slug: post.slug,
    kind: post.kind,
    title: post.title,
    seoTitle: post.seoTitle,
    description: post.description,
    published: post.published,
    updated: post.updated,
    author: getAuthor(post.author),
    tags: post.tags,
    image: post.image,
  };
}

/** Newest first; on a shared day, the post marked `lead` goes first. */
const newestFirst = (
  left: (typeof blogMetadata)[number],
  right: (typeof blogMetadata)[number],
) =>
  right.published.localeCompare(left.published) ||
  Number(right.lead ?? false) - Number(left.lead ?? false);

export const resourceEntries: readonly ResourceEntry[] = blogMetadata
  .filter(isLive)
  .sort(newestFirst)
  .map(toEntry);

/** Finished posts waiting for their date. Drafts are in neither list. */
export const scheduledEntries: readonly ResourceEntry[] = blogMetadata
  .filter((post) => !post.draft && post.published > contentDate)
  .sort(newestFirst)
  .map(toEntry);

export function getResource(slug: string): ResourceEntry | undefined {
  return resourceEntries.find((entry) => entry.slug === slug);
}
