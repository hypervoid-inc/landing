# Construct Landing

The public Construct Computer website. It preserves the established landing-page design while replacing the previous custom build and router with a statically prerendered React application.

## Stack

- React Router framework mode with Vite and React 19
- Tailwind CSS 4 and shadcn/Radix primitives
- Repository-authored MDX editorial content
- Cloudflare Pages, Pages Functions, D1, Turnstile, and WAF
- PostHog analytics with full autocapture and unmasked session replay
- Vitest, Playwright, axe, ESLint, Prettier, and strict TypeScript

## Commands

| Command          | Purpose                                                   |
| ---------------- | --------------------------------------------------------- |
| `pnpm dev`       | Functions on :8788 and the site on :5173, `/api` proxied  |
| `pnpm dev:web`   | The site alone (no Functions)                             |
| `pnpm dev:api`   | The Pages Functions alone                                 |
| `pnpm build`     | Generate discovery files and prerender every public route |
| `pnpm preview`   | Serve the built site and Pages Functions with Wrangler    |
| `pnpm test`      | Run unit and API tests                                    |
| `pnpm test:e2e`  | Build and test the deployed Pages behavior in Chromium    |
| `pnpm lint`      | Run ESLint                                                |
| `pnpm typecheck` | Generate route types and run TypeScript                   |
| `pnpm check`     | Run lint, types, unit tests, and the production build     |

## Local Setup

1. Install Node 24 and pnpm 11.15.0.
2. Run `pnpm install`.
3. Use `.env.example` for public Vite variables and `.dev.vars.example` for local Pages secrets.
4. Apply the local database migration with `pnpm wrangler d1 migrations apply DB --local`.
5. Run `pnpm dev` for the site with its Functions (it applies the local D1 migrations and writes `.dev.vars` from the example if missing), or `pnpm test:e2e` for the complete Pages, Function, Turnstile and D1 flow.

Cloudflare's published Turnstile test keys are intentionally included in the example and E2E configuration. Production keys must be configured in Cloudflare.

## Architecture

- `app/features/landing/` owns the homepage sections, motion, media, and beta modal.
- `app/content/` is the editorial source of truth.
- `app/content/resources.ts` maps generated MDX metadata into one ordered collection.
- Every editorial resource uses `/blog/<slug>/`; company and legal utilities remain top-level.
- `app/lib/route-manifest.ts` drives prerendering, canonical metadata, sitemap entries, feeds, crawler files, and OG images.
- `functions/api/beta-signup.ts` takes the site's signups; `functions/api/embed/` runs Night Shift, the playable show X renders inside a post (see below).
- `scripts/finalize-build.mjs` creates a real `404.html` and removes the SPA fallback.

See `docs/decisions/001-static-prerendered-react.md` for the architectural rationale and `docs/search-and-deployment.md` for production setup and indexing operations.

## Night Shift, the show in an X post

The homepage carries X Player Card tags (`app/lib/player-card.ts`), so a post that links `construct.computer` renders `/embed/` inside the post on desktop and opens it full screen from the phone apps. The page is Night Shift (`app/features/night-shift/`), the launch film as a one minute show you play: wake the mascot at 11 pm, hand it your list in a Slack thread, pull the chain, then skip or peek through its night shift until the morning report. The email comes last, as the exit offer of a free first month of Pro. The show runs on a small engine in `app/features/show/` (a 960 by 720 board scaled to fit, the mascot, the speech bubble and the CRT). `public/_headers` lets only X frame that path.

`functions/api/embed/session.ts` turns the viewer's first name into a signed session token (Turnstile, five sessions an hour per address, a row in D1's `embed_sessions` with keyed hashes only). `functions/api/embed/claim.ts` takes the email at the exit offer, subscribes it to the newsletter in Listmonk like every other form does (`cta_source` `embed-x`, the post's `src` as the campaign; Listmonk is the only place leads are kept) and hands back `EMBED_PROMO_CODE`, which it also emails through Cloudflare Email Service (`functions/claim-email.ts`). "Start tonight" and the email's button open `/?promo=CODE`, where `app/features/landing/promo-welcome.tsx` welcomes the visitor and keeps the code for checkout. `shared/embed-schema.ts` holds the wire shapes and the per-address cap. There is no overall cap. `EMBED_SESSION_SECRET` is a Pages secret.

## Content

Add articles, guides, and comparisons as MDX under `app/content/blog/`. The filename is the canonical `/blog/<slug>/` slug, and every file is discovered automatically.

Frontmatter requires `title`, `description`, `published` (`YYYY-MM-DD`), a registered `author` ID, nonempty `tags`, `kind` (`article`, `guide`, or `comparison`), and `draft`. `seoTitle` is optional. Add `updated` only after a substantive update and use a date later than `published`. Run `pnpm generate:content`; the build fails on invalid or stale metadata.

The homepage social image source is `assets/og/home.png`. Generation copies it to `public/og/home.png` after rebuilding other OG images, so replace the source file rather than editing the generated copy.

## Verification

`pnpm check && pnpm test:e2e` is the release gate. It verifies all canonical pages, the real 404 response, the ordered resource grid, the Turnstile-checked newsletter signup, and automated accessibility checks.
