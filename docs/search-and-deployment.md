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

Beta signups receive an `expires_at` timestamp 180 days after capture. Configure a small scheduled Worker or an operational job to run `DELETE FROM beta_signups WHERE expires_at < datetime('now')` at least daily. Data-subject deletion requests should delete the normalized email immediately rather than waiting for expiry.

Configure these production values:

| Variable                      | Scope                                                   |
| ----------------------------- | ------------------------------------------------------- |
| `VITE_TURNSTILE_SITE_KEY`     | Build variable                                          |
| `VITE_POSTHOG_KEY`            | Build variable                                          |
| `VITE_POSTHOG_HOST`           | Build variable, normally `https://x.construct.computer` |
| `POSTHOG_PROJECT_KEY`         | Encrypted Pages secret (campaign-touch server capture)  |
| `POSTHOG_HOST`                | Runtime variable, optional; default `https://x.construct.computer` |
| `TURNSTILE_SECRET_KEY`        | Encrypted Pages secret                                  |
| `TURNSTILE_EXPECTED_HOSTNAME` | Runtime variable, `construct.computer`                  |
| `TURNSTILE_EXPECTED_ACTION`   | Runtime variable, `beta_signup`                         |
| `TURNSTILE_TEST_MODE`         | Runtime variable, `false`                               |
| `ALLOWED_ORIGIN_HOSTNAME`     | Runtime variable, `construct.computer`                  |
| `LISTMONK_API_USER`           | Encrypted Pages secret (attribs + campaign-touch)       |
| `LISTMONK_API_TOKEN`          | Encrypted Pages secret                                  |

Never use Cloudflare's dummy Turnstile keys in production.

## Cloudflare Security

1. Enable Full (strict) SSL and HTTPS redirects.
2. Redirect `www.construct.computer` to `https://construct.computer` with a permanent zone Redirect Rule.
3. Enable applicable managed WAF rules.
4. Add a rate-limiting rule for `POST /api/beta-signup`; start with a Managed Challenge after 10 requests per IP in 10 seconds and tune from observed traffic.
5. Add a rate-limiting rule for `POST /api/campaign-touch` (subscriber UUID → email); start with a Managed Challenge after 20 requests per IP in 10 seconds. The endpoint returns opaque 404s for misses — still throttle enumeration.
6. Keep verified search bots out of generic challenge rules.
7. Confirm Managed Robots and AI crawler settings do not override `public/robots.txt`.
8. Enable Crawler Hints for IndexNow notifications.
9. Protect preview deployments with Cloudflare Access when possible. `_headers` also marks Pages preview hosts `noindex`.

Static requests bypass Functions through `_routes.json`. DDoS absorption, bot screening, and request-rate enforcement belong at Cloudflare's edge rather than in a per-instance JavaScript counter.

## URL Contract

The canonical editorial namespace is singular `/blog/`. `_redirects` permanently maps previous routes:

| Previous                   | Canonical                       |
| -------------------------- | ------------------------------- |
| `/blogs/*`                 | `/blog/*`                       |
| `/ai-employee/`            | `/blog/ai-employee/`            |
| `/ai-workflow-automation/` | `/blog/ai-workflow-automation/` |
| `/ai-agent-memory/`        | `/blog/ai-agent-memory/`        |
| `/vs/<slug>/`              | `/blog/construct-vs-<slug>/`    |

Do not add redirected URLs to internal links, feeds, or the sitemap. Do not redirect unrelated missing pages to the homepage.

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
2. Confirm Cloudflare Crawler Hints submissions in Bing's IndexNow report.
3. The wildcard allow rule in `robots.txt` permits Bingbot, Applebot, OAI-SearchBot, GPTBot, and other compliant crawlers.
4. Keep public content visible in raw HTML, use descriptive links and headings, publish representative images, and cite primary sources.
5. Do not create doorway pages or keyword variants solely for AI systems.

## Post-Launch Checks

- Request every sitemap URL and require `200`.
- Request every legacy URL without following redirects and require one permanent hop.
- Request a random unknown URL and require `404`.
- Validate representative pages with Google's Rich Results Test.
- Check social cards in the major platform debuggers.
- Confirm PostHog events use the first-party proxy and session replay captures the beta dialog (unmasked).
- Review Search Console weekly during migration, then monthly.
