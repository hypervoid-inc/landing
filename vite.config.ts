import mdx from "@mdx-js/rollup";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import { defineConfig } from "vite";

import { remarkHeadings } from "./scripts/remark-headings.mjs";

// The moment this build publishes for (UTC), fixed once so the prerender list
// in react-router.config.ts and the inlined bundles agree on which scheduled
// posts are live. Override with CONTENT_DATE=YYYY-MM-DD to preview the end of
// another day, plus CONTENT_TIME=HH:MM for a moment within it. See
// app/content/content-date.ts.
if (!process.env.CONTENT_DATE) {
  const now = new Date().toISOString();
  process.env.CONTENT_DATE = now.slice(0, 10);
  process.env.CONTENT_TIME ??= now.slice(11, 16);
}
process.env.CONTENT_TIME ??= "23:59";

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
    __CONTENT_TIME__: JSON.stringify(process.env.CONTENT_TIME),
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
