declare module "*.mdx" {
  import type { ComponentType } from "react";
  import type { useMDXComponents } from "@mdx-js/react";
  import type { BlogFrontmatter } from "./schema";

  export const frontmatter: BlogFrontmatter;
  const Content: ComponentType<{
    components?: ReturnType<typeof useMDXComponents>;
  }>;
  export default Content;
}
