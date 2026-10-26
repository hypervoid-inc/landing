/**
 * Every page in the sitemap also ships as Markdown at its path with `.md` on
 * the end, the AEO spec's convention (dualmark.dev/docs/spec):
 * `/` is `/index.md` and `/pricing/` is `/pricing.md`.
 * `scripts/markdown-twins.mjs` writes them; `functions/_middleware.ts` and
 * `public/_headers` serve them.
 */
export function twinPath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed === "" ? "/index.md" : `${trimmed}.md`;
}

/** The page a twin stands in for: `/index.md` is `/`, `/pricing.md` is `/pricing/`. */
export function pagePath(twin: string): string {
  const page = twin.replace(/\.md$/, "");
  return page === "/index" ? "/" : `${page}/`;
}
