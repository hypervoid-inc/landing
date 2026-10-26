# Scheduled Publishing

A finished post goes live by itself at its `published` date and `time`. Write it ahead, merge it, and the next build after that moment publishes it: the page, the blog index, tag and author pages, the sitemap, RSS and Atom, `llms.txt`, related links, and the homepage journal all pick it up together.

## How it works

- A post is **live** when `draft: false` and its `published` date and optional `time` (`HH:MM`, UTC) are at or before the build's moment (`isLive` in `app/content/resources.ts`). Without a `time` it goes live with the first build of its day.
- The build's moment is `contentDate` and `contentTime` (`app/content/content-date.ts`): now in UTC, fixed once per build in `vite.config.ts` so the prerendered HTML and the browser bundle agree.
- `.github/workflows/ci.yml` checks every quarter hour (`scripts/due-posts.mjs`): when a post's moment has passed and the live sitemap does not list it yet, it runs the full build and deploys. It compares with the live site rather than a time window, so a delayed or skipped run is caught by the next one. A full rebuild also runs every day at 00:05 UTC.
- GitHub starts scheduled runs late when it is busy, sometimes by hours, so treat `time` as "not before", not as an exact minute.

| Frontmatter                           | Result                                         |
| ------------------------------------- | ---------------------------------------------- |
| `draft: true`                         | Never shown, whatever the date                 |
| `draft: false`, date today or earlier | Live now                                       |
| `draft: false`, date in the future    | Scheduled: hidden until the build on that date |
| `draft: false`, today, `time` ahead   | Scheduled: hidden until the first build after that time |

## Scheduling a post

1. Finish the post and resolve every TODO. Scheduling is publishing in advance: nobody reviews it again on the day.
2. Set `published: "YYYY-MM-DD"` to the go-live date, `time: "HH:MM"` (UTC) to the go-live time, and `draft: false`. Keep the cadence in [blog-plan-2026-q4.md](blog-plan-2026-q4.md): three or four posts a week on varied days and times, never two on one day, and never a post that has not met the post standard in [editorial-strategy.md](editorial-strategy.md) just to fill a slot.
3. Check its FAQs in `app/content/faqs.ts` (drafts already have them) still match the post.
4. Make its card. Drafts already have one in `app/content/og-card-content.ts` (see [og-images.md](og-images.md#rendered-cards)), and every topic hub and index is a mosaic of its posts' cards. For a new post, pick the figure its content already is, fill it with the post's own facts, check it full size with `pnpm og:sheet --only <name>` and beside its neighbours with `pnpm og:sheet`, then run `pnpm og`; it re-renders the topic hubs the post appears on too. Scheduled posts get their card now, and the OG tests fail at merge time if one is missing, stale, or repeats a neighbour's figure, so publish day never fails on a card.
5. Run `pnpm generate:content && pnpm check`, then `CONTENT_DATE=<its date> pnpm test`. Some tests depend on which posts are live (related posts weigh tags by how rare they are), and the morning build runs them, so a failure that only appears on the post's date would block that day's deploy. Then merge to `main`.

## Two posts on one day

The blog leads with the newest post. Avoid two on one day; if it happens, the later `time` leads, or add `lead: true` to the one that should lead; it sorts first among that day's posts on the blog index, the menu and the feeds. Only one post may lead a day, and the flag can stay after its day, since a newer post takes the lead by date.

## Preview a future day

`pnpm dev` shows every post, drafts and scheduled ones included, so a post can be read in place while it is written. To see the site exactly as it will look on a given day, build it for that day:

```
CONTENT_DATE=2026-10-05 pnpm build && pnpm preview
```

`CONTENT_DATE` alone means the end of that day, so every post dated that day shows. Add `CONTENT_TIME=14:00` to see the site at a moment within it. Both work for `pnpm test` too.

## Links between scheduled posts

A post may link to any live post, or to a scheduled post dated on or before its own date. A live post linking to a scheduled one fails the content test, because the link would 404 until that date.

Drafts are written in schedule order, so a draft may also link to another draft dated on or before its own date. Once you schedule it, the stricter rule applies: every draft it links to must be scheduled or live by then. If one slipped, the test names the link; turn it into plain text until that post is live.

## When something goes wrong

- **Need it live now, or a morning run failed:** Actions tab, CI, "Run workflow" on `main`. Any push to `main` also republishes.
- **Pull a scheduled post:** set it back to `draft: true` (or move its date) and merge before its morning run.
- **Publish at another time of day:** change the post's `time`. Dates and times are always UTC.
- GitHub can start scheduled runs late when it is busy, and pauses schedules on public repositories after 60 days with no commits.
