# Construct Landing

The public Construct Computer website. It preserves the established landing-page design while replacing the previous custom build and router with a statically prerendered React application.

## Stack

- React Router framework mode with Vite and React 19
- Tailwind CSS 4 and shadcn/Radix primitives
- Repository-authored MDX editorial content
- Cloudflare Pages, Pages Functions, D1, Turnstile, and WAF
- PostHog analytics and masked session replay
- Vitest, Playwright, axe, ESLint, Prettier, and strict TypeScript

## Commands

| Command          | Purpose                                                   |
| ---------------- | --------------------------------------------------------- |
| `pnpm dev`       | Start the UI development server                           |
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
5. Run `pnpm dev` for UI work or `pnpm test:e2e` for the complete Pages, Function, Turnstile, and D1 flow.

Cloudflare's published Turnstile test keys are intentionally included in the example and E2E configuration. Production keys must be configured in Cloudflare.

## Architecture

- `app/features/landing/` owns the homepage sections, motion, media, and beta modal.
- `app/content/` is the editorial source of truth.
- `app/content/resources.ts` maps generated MDX metadata into one ordered collection.
- Every editorial resource uses `/blog/<slug>/`; company and legal utilities remain top-level.
- `app/lib/route-manifest.ts` drives prerendering, canonical metadata, sitemap entries, feeds, crawler files, and OG images.
- `functions/api/beta-signup.ts` is the only application endpoint.
- `scripts/finalize-build.mjs` creates a real `404.html` and removes the SPA fallback.

See `docs/decisions/001-static-prerendered-react.md` for the architectural rationale and `docs/search-and-deployment.md` for production setup and indexing operations.

## Content

Add articles, guides, and comparisons as MDX under `app/content/blog/`. The filename is the canonical `/blog/<slug>/` slug, and every file is discovered automatically.

Frontmatter requires `title`, `description`, `published` (`YYYY-MM-DD`), a registered `author` ID, nonempty `tags`, `kind` (`article`, `guide`, or `comparison`), and `draft`. `seoTitle` is optional. Add `updated` only after a substantive update and use a date later than `published`. Run `pnpm generate:content`; the build fails on invalid or stale metadata.

The homepage social image source is `assets/og/home.png`. Generation copies it to `public/og/home.png` after rebuilding other OG images, so replace the source file rather than editing the generated copy.

## Verification

`pnpm check && pnpm test:e2e` is the release gate. It verifies all canonical pages, legacy redirects, the real 404 response, the ordered resource grid, Turnstile plus D1 signup, and automated accessibility checks.
