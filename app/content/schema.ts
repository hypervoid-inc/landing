import { z } from "zod";

const isoDate = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
  );
}, "Expected a real YYYY-MM-DD date");

export const blogFrontmatterSchema = z
  .object({
    title: z.string().min(1),
    description: z.string().min(1),
    date: isoDate,
    updated: isoDate.optional(),
    seoTitle: z.string().min(1).optional(),
    author: z.string().min(1),
    tags: z.array(z.string().min(1)).min(1),
    draft: z.boolean(),
  })
  .strict()
  .refine(({ date, updated }) => !updated || updated >= date, {
    message: "Updated date cannot precede publication date",
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
