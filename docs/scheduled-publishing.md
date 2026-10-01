# Scheduled Publishing

A finished post goes live by itself on its `published` date. Write it ahead, merge it, and the morning build publishes it: the page, the blog index, tag and author pages, the sitemap, RSS and Atom, `llms.txt`, related links, and the homepage journal all pick it up together.

## How it works

- A post is **live** when `draft: false` and `published` is on or before the build's day (`isLive` in `app/content/resources.ts`).
- The build's day is `contentDate` (`app/content/content-date.ts`): today in UTC, fixed once per build in `vite.config.ts` so the prerendered HTML and the browser bundle agree.
- `.github/workflows/ci.yml` runs every day at 00:05 UTC (07:05 Bangkok, 17:05 the previous day in San Francisco), rebuilds `main`, and deploys it. A post dated October 5 goes live on the first run on October 5, UTC.

| Frontmatter                           | Result                                         |
| ------------------------------------- | ---------------------------------------------- |
| `draft: true`                         | Never shown, whatever the date                 |
| `draft: false`, date today or earlier | Live now                                       |
| `draft: false`, date in the future    | Scheduled: hidden until the build on that date |

## Scheduling a post

1. Finish the post and resolve every TODO. Scheduling is publishing in advance: nobody reviews it again on the day.
2. Set `published: "YYYY-MM-DD"` to the go-live date and `draft: false`.
3. Add its FAQs to `app/content/faqs.ts`.
4. Add its card (headline and scene) to `app/content/og-poster.ts` and run `pnpm og`. Scheduled posts get their card now, and the OG tests fail at merge time if one is missing, so publish day never fails on a card.
5. Run `pnpm generate:content && pnpm check`, then `CONTENT_DATE=<its date> pnpm test`. Some tests depend on which posts are live (related posts weigh tags by how rare they are), and the morning build runs them, so a failure that only appears on the post's date would block that day's deploy. Then merge to `main`.

## Preview a future day

```
CONTENT_DATE=2026-10-05 pnpm dev
```

The site renders as it will on that date, scheduled posts included. `CONTENT_DATE` works for `pnpm build` and `pnpm test` too.

## Links between scheduled posts

A post may link to any live post, or to a scheduled post dated on or before its own date. A live post linking to a scheduled one fails the content test, because the link would 404 until that date.

## When something goes wrong

- **Need it live now, or a morning run failed:** Actions tab, CI, "Run workflow" on `main`. Any push to `main` also republishes.
- **Pull a scheduled post:** set it back to `draft: true` (or move its date) and merge before its morning run.
- **Publish at another time of day:** change the cron in `ci.yml`. The publish date itself is always compared in UTC.
- GitHub can start scheduled runs late when it is busy, and pauses schedules on public repositories after 60 days with no commits.
