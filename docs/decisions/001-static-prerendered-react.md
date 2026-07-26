# ADR-001: Use Static Prerendering With A Minimal Edge API

## Status

Accepted

## Date

2026-07-26

## Context

The previous landing site had strong visual and search output but maintained a custom static generator, custom client router, duplicate desktop/mobile trees, and a worker that mixed asset routing with signup behavior. The product application in `v2` solves a much larger authenticated problem and is not an appropriate template for a public content site.

The public site needs fast crawlable HTML, exact visual control, repository-authored content, per-page social previews, beta email capture, analytics, and Cloudflare deployment without a permanent application server.

## Decision

Use React Router framework mode on Vite with `ssr: false` and an explicit prerender list. Serve the generated files from Cloudflare Pages. Use one Pages Function and D1 database for beta signup.

All editorial resources use the canonical `/blog/<slug>/` namespace. A single typed route manifest drives prerender paths, metadata, sitemap, feeds, OG images, and tests.

## Alternatives Considered

### Plain Vite SPA

Rejected because crawlers would receive a generic shell and route metadata would depend on client execution.

### Runtime SSR

Rejected because every public page changes only at deployment time. Runtime rendering adds cost and failure modes without improving freshness.

### Copy the v2 monorepo

Rejected because Turbo, shared packages, product stores, API domains, and desktop architecture do not earn their cost for one public site.

### Separate guide and comparison URL trees

Rejected because they split editorial authority and made navigation, feeds, sitemaps, and discovery inconsistent. Content type remains metadata, not routing architecture.

## Consequences

- Public pages work without JavaScript and are edge cached.
- Adding content updates all discovery surfaces from one source.
- Unknown URLs return a real 404 instead of an SPA soft 404.
- Editorial publication requires a deployment.
- Interactive server behavior must remain small enough for Pages Functions.
