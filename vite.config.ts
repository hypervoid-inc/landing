import mdx from "@mdx-js/rollup";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import { defineConfig } from "vite";

import { remarkHeadings } from "./scripts/remark-headings.mjs";

// The day this build publishes for (UTC), fixed once so the prerender list in
// react-router.config.ts and the inlined bundles agree on which scheduled posts
// are live. Override with CONTENT_DATE=YYYY-MM-DD to preview another day. See
// app/content/content-date.ts.
process.env.CONTENT_DATE ??= new Date().toISOString().slice(0, 10);

export default defineConfig({
  build: {
    assetsDir: "_assets",
  },
  server: {
    // `pnpm dev` runs the Pages Functions on :8788 (scripts/dev.mjs); the
    // app calls `/api/*` on its own origin, as in production, and Vite hands
    // those to Wrangler. The Origin header passes through unchanged, which
    // is what the functions' origin check reads.
    proxy: {
      "/api": {
        target: process.env.FUNCTIONS_ORIGIN ?? "http://127.0.0.1:8788",
        changeOrigin: false,
      },
    },
  },
  define: {
    __CONTENT_DATE__: JSON.stringify(process.env.CONTENT_DATE),
    // Set only by `pnpm dev`, which lists every post, drafts included. The
    // scripts that load content through Vite (`pnpm og`, generate-content)
    // run in development mode too, so the mode alone cannot be the switch.
    __SHOW_ALL_POSTS__: JSON.stringify(process.env.SHOW_ALL_POSTS === "1"),
  },
  plugins: [
    mdx({
      remarkPlugins: [
        remarkGfm,
        remarkFrontmatter,
        [remarkMdxFrontmatter, { name: "frontmatter" }],
        remarkHeadings,
      ],
    }),
    tailwindcss(),
    reactRouter(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
});
