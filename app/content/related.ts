import { resourceEntries, type ResourceEntry } from "./resources";

/**
 * How many posts a tag appears on. Built once at module scope, like everything
 * else in this folder, so related lists resolve during prerender and cost
 * nothing at runtime.
 */
const tagFrequency: ReadonlyMap<string, number> = (() => {
  const counts = new Map<string, number>();
  for (const entry of resourceEntries) {
    for (const tag of entry.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return counts;
})();

/**
 * What one shared tag is worth.
 *
 * Rarity is the whole point. `ai-agent` and `ai-employee` sit on more than half
 * the library and say almost nothing about whether two posts belong together,
 * while `zapier`, `cloudflare`, or `reliability` sit on one or two and are a
 * strong signal. Weighting every tag equally makes each post equally related to
 * every other one, which is the same as having no related list at all.
 *
 * The weight is the inverse share of the library, so a tag on 1 of 17 posts
 * outscores a tag on 9 of 17 by roughly nine to one.
 */
function tagWeight(tag: string): number {
  const count = tagFrequency.get(tag) ?? 0;
  return count > 0 ? resourceEntries.length / count : 0;
}

function relatednessScore(left: ResourceEntry, right: ResourceEntry): number {
  const shared = new Set(right.tags);
  let score = 0;
  for (const tag of left.tags) if (shared.has(tag)) score += tagWeight(tag);
  return score;
}

/**
 * Posts to offer a reader at the end of `slug`, best match first.
 *
 * Ordering is fully deterministic: score, then a matching `kind`, then the
 * newer post, then slug. Nothing here reads the clock or the request, so two
 * builds of the same content always produce the same list, which is what makes
 * it testable and safe to prerender.
 *
 * A post with too few genuine matches is topped up with the most recent
 * remaining entries rather than returned short, so the card grid never renders
 * a ragged final row.
 */
export function getRelatedResources(
  slug: string,
  limit = 4,
): readonly ResourceEntry[] {
  const current = resourceEntries.find((entry) => entry.slug === slug);
  if (!current) return [];

  const candidates = resourceEntries.filter((entry) => entry.slug !== slug);
  const scored = candidates
    .map((entry) => ({ entry, score: relatednessScore(current, entry) }))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      const kindMatch =
        Number(right.entry.kind === current.kind) -
        Number(left.entry.kind === current.kind);
      if (kindMatch !== 0) return kindMatch;
      const byDate = right.entry.published.localeCompare(left.entry.published);
      if (byDate !== 0) return byDate;
      return left.entry.slug.localeCompare(right.entry.slug);
    });

  return scored.slice(0, limit).map(({ entry }) => entry);
}

/** One post by slug, for the hand-picked mid-article `ReadNext`. */
export function getRelatedResource(slug: string): ResourceEntry | undefined {
  return resourceEntries.find((entry) => entry.slug === slug);
}
