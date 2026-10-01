import mdx from "@mdx-js/rollup";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import { defineConfig } from "vite";

// The day this build publishes for (UTC), fixed once so the prerender list in
// react-router.config.ts and the inlined bundles agree on which scheduled posts
// are live. Override with CONTENT_DATE=YYYY-MM-DD to preview another day. See
// app/content/content-date.ts.
process.env.CONTENT_DATE ??= new Date().toISOString().slice(0, 10);

export default defineConfig({
  build: {
    assetsDir: "_assets",
  },
  define: {
    __CONTENT_DATE__: JSON.stringify(process.env.CONTENT_DATE),
  },
  plugins: [
    mdx({
      remarkPlugins: [
        remarkGfm,
        remarkFrontmatter,
        [remarkMdxFrontmatter, { name: "frontmatter" }],
      ],
    }),
    tailwindcss(),
    reactRouter(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
});
