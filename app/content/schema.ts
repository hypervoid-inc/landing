import { z } from "zod";
import { authorIds } from "./authors";

const isoDate = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
  );
}, "Expected a real YYYY-MM-DD date");

/**
 * A hand-made OG image used instead of the generated one: the filename of a
 * finished 1200x630 image sitting in `assets/og/`, alongside the homepage's.
 * `pnpm og` publishes it verbatim to `public/og/`, and
 * `tests/og-images.test.ts` fails if the source file is missing.
 */
const ogImageOverride = z
  .string()
  .regex(
    /^[\w-]+\.(png|jpg|jpeg|webp)$/,
    'Expected a filename in assets/og/, such as "my-post.png"',
  );

/**
 * One sentence on what Construct does differently for this post's reader,
 * shown with a call to action above the cover (see `PostPitch`). Kept to one
 * line on a desktop and three on a phone, so it never pushes the post itself
 * out of the first screen.
 */
export const PITCH_MAX_LENGTH = 160;
const pitch = z.string().min(1).max(PITCH_MAX_LENGTH);

export const blogFrontmatterSchema = z
  .object({
    title: z.string().min(1),
    description: z.string().min(1),
    pitch: pitch.optional(),
    published: isoDate,
    updated: isoDate.optional(),
    seoTitle: z.string().min(1).optional(),
    author: z.enum(authorIds),
    tags: z.array(z.string().min(1)).min(1),
    kind: z.enum(["article", "guide", "comparison"]),
    draft: z.boolean(),
    image: ogImageOverride.optional(),
  })
  .strict()
  .refine(({ published, updated }) => !updated || updated > published, {
    message: "Updated date must be later than publication date",
    path: ["updated"],
  });

export type BlogFrontmatter = z.infer<typeof blogFrontmatterSchema>;

export function validateContent(
  posts: readonly ({ slug: string } & BlogFrontmatter)[],
): void {
  const slugs = new Set<string>();
  for (const post of posts) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug)) {
      throw new Error(`Invalid blog slug: ${post.slug}`);
    }
    if (slugs.has(post.slug))
      throw new Error(`Duplicate blog slug: ${post.slug}`);
    slugs.add(post.slug);
    const frontmatter: Record<string, unknown> = { ...post };
    delete frontmatter.slug;
    blogFrontmatterSchema.parse(frontmatter);
  }
}
