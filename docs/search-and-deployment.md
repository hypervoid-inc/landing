# Search And Deployment Runbook

## Cloudflare Pages

Configure the Pages project with:

| Setting           | Value          |
| ----------------- | -------------- |
| Production branch | `main`         |
| Build command     | `pnpm check`   |
| Build output      | `build/client` |
| Node version      | `24`           |
| pnpm version      | `11.15.0`      |

Replace the placeholder D1 ID in `wrangler.jsonc` after creating the production database. Bind it as `DB`, apply `migrations/` remotely, and use a separate database for previews.

Signups are kept in Listmonk only: the footer newsletter form and the show's claim subscribe there and write nothing to D1, and a failed subscribe returns an error so the visitor can retry. Migration 0005 drops the old `beta_signups` table; export it first if its rows are still wanted (`pnpm wrangler d1 execute DB --remote --command "SELECT * FROM beta_signups" --json > beta-signups.json`, kept out of the repo). Data-subject deletion requests are handled in Listmonk. D1 now holds only `embed_sessions`, the show's per-address limit and once-per-session claim guard.

Configure these production values:

| Variable                      | Scope                                                   |
| ----------------------------- | ------------------------------------------------------- |
| `VITE_TURNSTILE_SITE_KEY`     | Build variable                                          |
| `VITE_POSTHOG_KEY`            | Build variable                                          |
| `VITE_POSTHOG_HOST`           | Build variable, normally `https://x.construct.computer` |
| `POSTHOG_PROJECT_KEY`         | Encrypted Pages secret (campaign-touch server capture)  |
| `POSTHOG_HOST`                | Runtime variable, optional; default `https://x.construct.computer` |
| `TURNSTILE_SECRET_KEY`        | Encrypted Pages secret                                  |
| `EMBED_SESSION_SECRET`        | Encrypted Pages secret; signs the show's session tokens and keys its hashes (`functions/api/embed/`) |
| `EMAIL_API_TOKEN`             | Encrypted Pages secret; a Cloudflare API token with Email Sending send rights, used for the show's claim email (`functions/claim-email.ts`) |
| `TURNSTILE_EXPECTED_HOSTNAME` | Runtime variable, `construct.computer`                  |
| `TURNSTILE_EXPECTED_ACTION`   | Runtime variable, `beta_signup`                         |
| `TURNSTILE_TEST_MODE`         | Runtime variable, `false`                               |
| `ALLOWED_ORIGIN_HOSTNAME`     | Runtime variable, `construct.computer`                  |
| `LISTMONK_API_USER`           | Encrypted Pages secret (attribs + campaign-touch)       |
| `LISTMONK_API_TOKEN`          | Encrypted Pages secret                                  |

Never use Cloudflare's dummy Turnstile keys in production.

The show in an X post (`functions/api/embed/`) needs the `embed_sessions` table: run `pnpm wrangler d1 migrations apply DB --remote` before the first deploy that carries it. `EMBED_PROMO_CODE` is a plain variable in `wrangler.jsonc`. The only limit is five sessions an hour per address (`shared/embed-schema.ts`); there is no overall cap. Create the promo code in Dodo as a 100% off first-month coupon on every plan before the demo goes live; the show and the welcome point people to Pro. A claim also emails the code through Cloudflare Email Service's REST API (Pages Functions can't hold a `send_email` binding), from `EMBED_EMAIL_FROM` on the already onboarded construct.computer sending domain, with `CLOUDFLARE_ACCOUNT_ID` in `wrangler.jsonc` and the `EMAIL_API_TOKEN` secret; without the token the claim still hands out the code and logs that the email was skipped. A `?promo=CODE` link (the email's button, the show's "Start tonight") opens a welcome on the site and keeps the code for checkout (`app/features/landing/promo-welcome.tsx`).

## Cloudflare Security

1. Enable Full (strict) SSL and HTTPS redirects.
2. Redirect `www.construct.computer` to `https://construct.computer` with a permanent zone Redirect Rule.
3. Enable applicable managed WAF rules.
4. Add a rate-limiting rule for `POST /api/beta-signup`; start with a Managed Challenge after 10 requests per IP in 10 seconds and tune from observed traffic.
5. Add a rate-limiting rule for `POST /api/campaign-touch` (subscriber UUID → email); start with a Managed Challenge after 20 requests per IP in 10 seconds. The endpoint returns opaque 404s for misses, still throttle enumeration.
6. Keep verified search bots out of generic challenge rules.
7. Confirm Managed Robots and AI crawler settings do not override `public/robots.txt`.
8. Protect preview deployments with Cloudflare Access when possible. `_headers` also marks Pages preview hosts `noindex`.

Static requests bypass Functions through `_routes.json`. DDoS absorption, bot screening, and request-rate enforcement belong at Cloudflare's edge rather than in a per-instance JavaScript counter.

## URL Contract

The canonical editorial namespace is singular `/blog/` (comparisons live at `/blog/construct-vs-<slug>/`). Canonicals use trailing slashes. Do not invent alternate path schemes in internal links, feeds, or the sitemap. Do not redirect unrelated missing pages to the homepage.

`_redirects` maps `/security.txt` → `/.well-known/security.txt`, the `/discord` and `/ph` shortlinks, and the pre-rebuild guide (`/ai-employee`) and comparison (`/vs/<slug>`) URLs to the posts that replaced them.

## Google Search Console

1. Verify the `construct.computer` Domain property using DNS.
2. Submit `https://construct.computer/sitemap.xml`.
3. Inspect the homepage, `/blog/`, one article, one guide, and one comparison after launch.
4. Confirm the tested page returns `200`, its rendered HTML contains the expected canonical, and indexing is allowed.
5. Request indexing for the most important changed canonical pages.
6. Export every URL from Page Indexing before validating an issue group.
7. Treat intentional redirects, canonical alternates, and genuine 404s as correct exclusions. The target is not zero excluded URLs; the target is every valuable canonical URL indexed.
8. For "Discovered - currently not indexed", verify useful original content, direct internal links, sitemap membership, status, and canonical consistency before requesting another crawl.
9. Monitor Page Indexing, Core Web Vitals, Rich Results, Security Issues, Manual Actions, and Generative AI performance.

Google does not guarantee crawling, indexing, rich results, or rankings. `llms.txt` is generated for compatible third-party systems, but Google states that it neither helps nor harms Google Search rankings.

## Other Search And AI Systems

1. Import the verified property into Bing Webmaster Tools and submit the same sitemap.
2. IndexNow: after each production deploy, CI submits the URLs whose sitemap entry was added, re-dated or removed (`scripts/indexnow.mjs`) to `api.indexnow.org`, which shares them with Bing, Yandex, Seznam, Naver and Yep. The key is served at `/4f4cf45200d8fc35b732a9af1c7df772.txt`. Confirm submissions in Bing Webmaster Tools under IndexNow. To resubmit the whole site after a broad change, run `pnpm build && node scripts/indexnow.mjs` with no argument. Cloudflare Crawler Hints is not a substitute: it reports URLs on cache MISS, and Pages serves our HTML as `DYNAMIC`.
3. The wildcard allow rule in `robots.txt` permits Bingbot, Applebot, OAI-SearchBot, GPTBot, and other compliant crawlers.
4. Keep public content visible in raw HTML, use descriptive links and headings, publish representative images, and cite primary sources.
5. Do not create doorway pages or keyword variants solely for AI systems.

## Post-Launch Checks

- Request every sitemap URL and require `200`.
- Request a random unknown URL and require `404`.
- Validate representative pages with Google's Rich Results Test.
- Check social cards in the major platform debuggers.
- Confirm PostHog events use the first-party proxy and session replay captures the beta dialog (unmasked).
- Review Search Console weekly during migration, then monthly.
