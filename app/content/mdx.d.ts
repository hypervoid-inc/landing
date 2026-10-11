declare module "*.mdx" {
  import type { ComponentType } from "react";
  import type { useMDXComponents } from "@mdx-js/react";
  import type { BlogFrontmatter } from "./schema";

  export const frontmatter: BlogFrontmatter;
  /** From `scripts/remark-headings.mjs`. */
  export const headings: readonly { id: string; text: string }[];
  export const readingMinutes: number;
  const Content: ComponentType<{
    components?: ReturnType<typeof useMDXComponents>;
  }>;
  export default Content;
}
