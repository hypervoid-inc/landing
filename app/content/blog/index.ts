import type { useMDXComponents } from "@mdx-js/react";
import type { ComponentType } from "react";

import {
  blogFrontmatterSchema,
  validateContent,
  type BlogFrontmatter,
} from "../schema";
import { blogMetadata } from "./metadata.generated";

type BlogModule = {
  default: ComponentType<{
    components?: ReturnType<typeof useMDXComponents>;
  }>;
  frontmatter: BlogFrontmatter;
};

const modules = import.meta.glob<BlogModule>("./*.mdx", { eager: true });

export const blogPosts = Object.entries(modules)
  .map(([path, module]) => ({
    slug: path.slice(2, -4),
    ...blogFrontmatterSchema.parse(module.frontmatter),
    Content: module.default,
  }))
  .sort((left, right) => left.slug.localeCompare(right.slug));

validateContent(blogMetadata);

if (blogPosts.length !== blogMetadata.length) {
  throw new Error("Generated blog metadata and imported MDX posts differ");
}

for (const [index, post] of blogPosts.entries()) {
  const generated = blogMetadata[index];
  if (
    !generated ||
    Object.entries(generated).some(
      ([key, value]) =>
        JSON.stringify(post[key as keyof typeof post]) !==
        JSON.stringify(value),
    )
  ) {
    throw new Error(
      "Generated blog metadata is stale; run scripts/generate-content.mjs",
    );
  }
}

export type BlogPost = (typeof blogPosts)[number];

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug && !post.draft);
}
