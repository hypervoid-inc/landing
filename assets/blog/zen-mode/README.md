# Zen Mode post assets (held back)

`app/content/blog/zen-mode.mdx` is committed with `draft: true`. Its launch film,
poster, captions, and figures live here, outside `public/`, because everything
under `public/` deploys and the film should not be reachable before launch.

To publish:

1. Set `draft: false` and the real `published` date in the post's frontmatter.
2. Move this folder's media to `public/blog/zen-mode/` (not this README).
3. Run `pnpm generate:content` and `pnpm og` (publishes `public/og/blog-zen-mode.jpg`
   from `assets/og/blog-zen-mode.png`).
4. Add `/blog/zen-mode/` back to the accessibility list in `e2e/site.spec.ts`.
5. Run `pnpm check && pnpm test:e2e`, then commit and push.
