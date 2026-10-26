declare const __CONTENT_DATE__: string | undefined;
declare const __CONTENT_TIME__: string | undefined;

/**
 * The day the site is built for, as `YYYY-MM-DD` in UTC. A finished post
 * (`draft: false`) goes live on the first build on or after its `published`
 * date (and its `time`, when it has one), and CI rebuilds whenever a post
 * comes due, so a post written ahead publishes itself. See
 * docs/scheduled-publishing.md.
 *
 * Vite inlines `__CONTENT_DATE__` (vite.config.ts) so the prerendered HTML and
 * the browser bundle agree on what is live. Code Vite does not compile, such
 * as react-router.config.ts, reads the same day from `CONTENT_DATE`, which
 * vite.config.ts sets when it loads. Set `CONTENT_DATE=2026-10-05` yourself to
 * preview the site as it will look at the end of that day.
 */
const environment = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

const now = new Date().toISOString();

export const contentDate: string =
  (typeof __CONTENT_DATE__ === "string" ? __CONTENT_DATE__ : undefined) ??
  environment?.CONTENT_DATE ??
  now.slice(0, 10);

/**
 * The time of day the site is built for, `HH:MM` in UTC. A build for today
 * uses the clock; a day chosen with `CONTENT_DATE` alone means the whole day,
 * so every post dated that day shows. `CONTENT_TIME=09:00` narrows it.
 */
export const contentTime: string =
  (typeof __CONTENT_TIME__ === "string" ? __CONTENT_TIME__ : undefined) ??
  environment?.CONTENT_TIME ??
  (environment?.CONTENT_DATE ? "23:59" : now.slice(11, 16));

if (!/^\d{4}-\d{2}-\d{2}$/.test(contentDate)) {
  throw new Error(`CONTENT_DATE must be YYYY-MM-DD, got "${contentDate}"`);
}
if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(contentTime)) {
  throw new Error(`CONTENT_TIME must be HH:MM, got "${contentTime}"`);
}
