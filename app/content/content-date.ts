declare const __CONTENT_DATE__: string | undefined;

/**
 * The day the site is built for, as `YYYY-MM-DD` in UTC. A finished post
 * (`draft: false`) goes live on the first build on or after its `published`
 * date, and the scheduled CI run rebuilds every morning, so a post written
 * ahead publishes itself on its date. See docs/scheduled-publishing.md.
 *
 * Vite inlines `__CONTENT_DATE__` (vite.config.ts) so the prerendered HTML and
 * the browser bundle agree on what is live. Code Vite does not compile, such
 * as react-router.config.ts, reads the same day from `CONTENT_DATE`, which
 * vite.config.ts sets when it loads. Set `CONTENT_DATE=2026-10-05` yourself to
 * preview the site as it will look on that day.
 */
const fromEnvironment = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env?.CONTENT_DATE;

export const contentDate: string =
  (typeof __CONTENT_DATE__ === "string" ? __CONTENT_DATE__ : undefined) ??
  fromEnvironment ??
  new Date().toISOString().slice(0, 10);

if (!/^\d{4}-\d{2}-\d{2}$/.test(contentDate)) {
  throw new Error(`CONTENT_DATE must be YYYY-MM-DD, got "${contentDate}"`);
}
