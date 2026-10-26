import { blogMetadata } from "./blog/metadata.generated";
import { getAuthor, type Author } from "./authors";
import { contentDate, contentTime } from "./content-date";
import type { BlogFrontmatter } from "./schema";

export type ResourceKind = BlogFrontmatter["kind"];

export type ResourceEntry = {
  readonly slug: string;
  readonly kind: ResourceKind;
  readonly title: string;
  readonly seoTitle?: string;
  readonly description: string;
  readonly published: string;
  /** Go-live time on `published`, `HH:MM` UTC, when the post has one. */
  readonly time?: string;
  readonly updated?: string;
  readonly author: Author;
  readonly tags: readonly string[];
  /** Hand-picked OG image; absent means the generated one is used. */
  readonly image?: string;
};

type Schedulable = { draft: boolean; published: string; time?: string };

/**
 * A post is live once it is not a draft and its `published` date, and its
 * `time` when it has one, have arrived (see `contentDate` and `contentTime`).
 * Finished posts dated ahead stay out of every list, feed, and route until the
 * first build after that moment. A day given without a time means its end.
 */
export function isLiveOn(
  post: Schedulable,
  day: string,
  time = "23:59",
): boolean {
  if (post.draft) return false;
  if (post.published !== day) return post.published < day;
  return (post.time ?? "00:00") <= time;
}

/**
 * When a post went (or goes) live: the date alone, or the full UTC timestamp
 * when it has a `time`, for structured data and feeds.
 */
export function publishedAt(post: { published: string; time?: string }): string {
  return post.time ? `${post.published}T${post.time}:00Z` : post.published;
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

export function isLive(post: Schedulable): boolean {
  return showEverything || isLiveOn(post, contentDate, contentTime);
}

function toEntry(post: (typeof blogMetadata)[number]): ResourceEntry {
  return {
    slug: post.slug,
    kind: post.kind,
    title: post.title,
    seoTitle: post.seoTitle,
    description: post.description,
    published: post.published,
    time: post.time,
    updated: post.updated,
    author: getAuthor(post.author),
    tags: post.tags,
    image: post.image,
  };
}

/**
 * Newest first; on a shared day, the post marked `lead` goes first, then the
 * later go-live time.
 */
const newestFirst = (
  left: (typeof blogMetadata)[number],
  right: (typeof blogMetadata)[number],
) =>
  right.published.localeCompare(left.published) ||
  Number(right.lead ?? false) - Number(left.lead ?? false) ||
  (right.time ?? "").localeCompare(left.time ?? "");

export const resourceEntries: readonly ResourceEntry[] = blogMetadata
  .filter(isLive)
  .sort(newestFirst)
  .map(toEntry);

/** Finished posts waiting for their date. Drafts are in neither list. */
export const scheduledEntries: readonly ResourceEntry[] = blogMetadata
  .filter((post) => !post.draft && !isLiveOn(post, contentDate, contentTime))
  .sort(newestFirst)
  .map(toEntry);

export function getResource(slug: string): ResourceEntry | undefined {
  return resourceEntries.find((entry) => entry.slug === slug);
}
