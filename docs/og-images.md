# OG images and blog thumbnails

One image per canonical route serves three jobs at once: the `og:image` and
`twitter:image` social card, and the thumbnail on the blog index. They are
published to `public/og/` at 1200×630 and are committed to the repo.

Route names come from `ogName()` in `app/lib/route-manifest.ts`
(`/blog/ai-employee` → `blog-ai-employee`).

## How an image is put together

Generated artwork fills the whole card, and the type is drawn over it:

```
┌──────────────────────────────────────┐
│ ConstructComputer ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│                   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│ [ GUIDE ]         ▓▓▓  artwork  ▓▓▓▓ │ ← assets/og/full/<name>.png
│ AI Agent Memory   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │   (16:9, wordless)
│ You Can Control   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│ ● construct.computer ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
└──────────────────────────────────────┘
  ↑ vector text over a scrim, drawn by scripts/og/frame.mjs
```

The split is the point. Image models render type inconsistently, so they never
render any: the wordmark, eyebrow, title, and domain are drawn as real text in
`scripts/og/frame.mjs` and are pixel-identical across the set. The prompt asks
the model to keep the left 45% of the frame empty, and a white scrim guarantees
legibility when it does not.

Routes with no artwork yet fall back to a branded plate with the Construct mark
— a finished-looking placeholder rather than a missing asset.

### The retired tile layout

Artwork used to be square and sit in a tile on the right of an otherwise white
card. Side by side, it lost: at the size these images are actually seen, a small
tile in a field of white does not read. Full-bleed replaced it everywhere.

The code was unwired rather than deleted. `renderFrame` still composites a tile
and still draws the placeholder, `--layout tile` still generates square art into
`assets/og/art/`, and `ogTiled` in `app/content/og-art.ts` still exists. What is
gone is the wiring: `readSources` no longer looks in `assets/og/art/`, so a tile
sitting there is inert. Reviving the layout means restoring that branch in
`renderOne` and populating `ogTiled` — not rebuilding the renderer.

## Source layout

```
assets/og/
  <file>.png        a finished 1200×630 image, published verbatim
  full/<name>.png   wide artwork filling the card, type set over a scrim
  art/<name>.png    retired square artwork — inert, nothing reads it
  PROMPTS.md        generated; the paste-ready prompts
  manifest.json     generated; the freshness record
```

`pnpm og` resolves each route in this order:

1. **`assets/og/<file>`** — a finished image, copied straight to `public/og/`.
   The homepage works this way: `assets/og/home.png` is laid out by hand and
   carries its own type.
2. **`assets/og/full/<name>.png`** — 16:9 artwork cover-cropped to fill the
   card, with the wordmark, eyebrow, title, and domain drawn over it.
3. None — the branded placeholder plate.

## Generating artwork with Gemini

Put a key in `.env` (gitignored):

```
GEMINI_API_KEY="..."
```

Then:

```
pnpm og:generate --dry-run          what it would generate, and the rough spend
pnpm og:generate                    fill in everything missing
pnpm og:generate --only <name>      just one
pnpm og:generate --force <name>     replace art that already exists
pnpm og:generate --candidates 3     three options per route, to choose between
pnpm og:pick <name> 2               promote candidate 2 to the real file
pnpm og:generate --layout full --only <name>   a full-bleed variant to compare
pnpm og                             composite the new artwork into public/og/
```

### Comparing a tile against a full-bleed card

`--layout <tile|full>` generates a variant for a route whatever its configured
layout is. Because `assets/og/full/` outranks `assets/og/art/` when
compositing, the next `pnpm og` switches the route over:

```
pnpm og:generate --layout full --only blog-ai-employee
pnpm og                                    # now full-bleed
rm assets/og/full/blog-ai-employee.png
pnpm og                                    # back to the tile
```

Both source files can coexist; whichever exists in `full/` wins. Once you have
decided, record it in `ogTiled` rather than leaving it implied by which files
happen to be on disk — the skip logic reads the configured layout, so a route
listed as tiled will never have full-bleed art generated for it again.

**Nothing is ever regenerated.** A route is skipped when it already has _any_
source — a finished card, full-bleed art, or a tile — so a good image stays
good and a rerun after a crash costs nothing for what already landed. `--force`
is the only way past that, and it takes one name at a time on purpose.

Generation only ever writes into `assets/og/`. Compositing stays in `pnpm og`,
so a bad generation can be deleted and retried without `public/og/` ever having
held it.

### Cost

Every call is priced from the `usageMetadata` the API returns, not estimated:

```
[4/28] blog-ai-agent-memory … $0.1381  (5,102 in / 1,680 out, 8.3s)
        running total $0.5347
```

and at the end, the run total plus lifetime spend across all runs, tracked in
`assets/og/generation-log.jsonl` (gitignored). Rates live in
`scripts/og/pricing.mjs` and were verified against Google's pricing page on
2026-07-29 — if a total looks wrong, check there first.

Defaults to `gemini-3-pro-image` at 2K, about $0.134 an image. Override with
`GEMINI_IMAGE_MODEL` and `GEMINI_IMAGE_SIZE`; anything you point it at needs an
entry in `pricing.mjs` or it refuses to run rather than generate uncosted.

### Generating by hand instead

`pnpm og:prompts` writes `assets/og/PROMPTS.md` — the same prompts, paste-ready
for a chat UI. `pnpm og --print <name>` prints one to stdout. **Attach the
reference images listed at the top of that file**; they pin the mascot's
geometry and the glass material far more reliably than prose, and a run without
them will drift. Save the result to `assets/og/full/<name>.png` (16:9, ≥1024
wide), then run `pnpm og`.

Commit both the source art and the published PNG.

## Giving one post its own image

Drop a finished 1200×630 image into `assets/og/` and name it from the post's
frontmatter:

```yaml
---
title: "AI Employee for Real Business Work"
kind: "guide"
draft: false
image: "ai-employee-hero.png"
---
```

`assets/og/ai-employee-hero.png` is then published to
`public/og/ai-employee-hero.png` and used as that post's `og:image`, thumbnail,
and `twitter:image`. The frame, the art tile, and the prompt are all skipped.

The value is a bare filename, not a path — the file always lives in
`assets/og/`. If it is missing, `pnpm og` fails loudly rather than writing an
image to the wrong name and leaving the route pointing at a 404.

## Where each piece of the prompt lives

| Concern                                      | File                    | Changing it affects |
| -------------------------------------------- | ----------------------- | ------------------- |
| Palette, lighting, mascot, forbidden content | `scripts/og/prompt.mjs` | every image         |
| What a given image depicts                   | `app/content/og-art.ts` | one image           |
| Frame layout, type, tile geometry            | `scripts/og/frame.mjs`  | every image         |

If one image comes out wrong, fix its **subject**. Only re-base the **style
contract** when the whole set should change — and re-generate everything after,
or the set stops matching itself.

Subjects are staged scenes, not concepts: a model can draw "two glass panels
balanced on a beam of light" and cannot draw "cost efficiency". They also carry
no palette or medium notes, because those would start disagreeing with the style
contract and the model would split the difference.

## Why this is not part of `pnpm build`

The frame renders text with Georgia, and OG images used to be regenerated on
every build — including on CI, where that font is absent and the output
silently differed from what was reviewed locally. They are now committed
artifacts, rendered once on a machine that has the font.

That trades one failure mode for another: an edited title with a stale image.
`tests/og-images.test.ts` closes it by recomputing each image's signature from
live route data plus the source files on disk and comparing it to
`assets/og/manifest.json`. Change a title, replace artwork, or bump
`FRAME_VERSION`, and the suite fails with "run `pnpm og`".
