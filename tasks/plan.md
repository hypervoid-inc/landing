# Editorial Content Completeness

## Objective

Make articles, guides, and comparisons one consistent MDX system with honest publication/update dates, explicit authors, topical tags, accurate copy, compact preview cards, feed metadata, and structured data.

## Rules

- Every resource owns `published`, optional `updated`, `author`, and at least one topical tag.
- Publication ordering uses `published`; updates never impersonate publication dates.
- UI shows Published and shows Updated only when it is later.
- Articles use Ankush, guides use Nischal, and comparisons use Construct Team, explicitly in each source record.
- Tags appear in UI, Atom/RSS, Open Graph, and BlogPosting JSON-LD.
- Comparison scope and titles name the products actually compared.
- Copy changes correct mismatches or unsupported generalizations; no filler sections are added.
- The blog index uses its editorial proposition as the H1 instead of a generic “Blog” title or repetitive category explanations.
- Cards render title first, then one-line `type · date · author` metadata.
- The index uses a short “Construct insights and guides” H1 while its breadcrumb remains “Blog.”
- Feature and capability writing leads the editorial mix; comparisons are occasional decision content.

## Files

- `app/content/blog/*.mdx`: the only editorial text source for all 12 resources.
- `app/content/blog/index.ts`: automatic eager MDX discovery and validation.
- `app/content/resources.ts`: normalized generated metadata and publication ordering.
- `app/features/content/resource-pages.tsx`: consistent dates, tags, and contrast.
- `app/lib/{route-manifest,seo,generated-content}.ts`: display titles, tags, dates, feeds, and structured data.

## Verification

- Unit tests validate dates, author IDs, tags, sources, related links, unique slugs/features, feed authors/categories, and SEO taxonomy.
- E2E verifies publication labels, tags, bylines, and readable metadata across every content type.
- Final gate: `pnpm check && pnpm test:e2e`.

## Boundaries

- No new routes, dependencies, CMS, or runtime content service.
- No URL slug changes for existing indexed resources.
- No fabricated update dates or unverifiable personal attribution.
- The obsolete typed guide/comparison modules are removed after migration.

## Content Strategy

The publishing mix and feature backlog live in `docs/editorial-strategy.md`. The first feature-led article is “How Construct Builds Internal Tools in Your Workspace,” published July 27, 2026 with explicit current-runtime boundaries.
