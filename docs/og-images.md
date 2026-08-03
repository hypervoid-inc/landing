# Social cards and blog thumbnails

One image per canonical route serves three jobs at once: the `og:image` and
`twitter:image` social card, and the thumbnail on the blog index. They are
published to `public/og/` at 1200×630 and are committed to the repo.

Route names come from `ogName()` in `app/lib/route-manifest.ts`
(`/blog/ai-employee` → `blog-ai-employee`).

## The direction

Every card is a cover from a technology magazine that never existed: one real
object and the Construct mascot, photographed together in a blacked-out blue
studio, with the type set over the frame.

```
┌──────────────────────────────────────────────┐
│ C O N S T R U C T          [ AI EMPLOYEE ]   │  ← silver wordmark, hairline badge
│                                              │
│                    (mascot, hero, lit)       │
│                        ▓▓▓▓▓                 │  ← one real object, 1995-2005
│  A PERSISTENT           ▓▓▓▓▓                │
│  WORK OS FOR AN                              │  ← white condensed caps
│  AI EMPLOYEE            construct.computer   │
└──────────────────────────────────────────────┘
```

The whole card, type included, comes out of the model in one pass. There is no
compositing step and no vector overlay.

**The failure mode this set exists to avoid** is the default one: a swarm of
glowing translucent UI panels and dashed orbit rings on a cyan gradient. That
is what an image model reaches for unprompted, and what every AI company
already looks like. `scripts/og/poster.mjs` forbids it by name, and scenes in
`app/content/og-poster.ts` are written as real objects specifically so the
model never has to invent something abstract.

## What holds 34 cards together

Three things, in order of how much they actually do:

1. **`assets/og/style/master.webp`** — one approved card, attached first on
   every request as the layout and typography to copy. This does more than
   everything else combined. Prose describes a look; an approved card _is_ the
   look.
2. **The contract in `scripts/og/poster.mjs`**, sent byte-identical every time.
3. **The route's entry in `app/content/og-poster.ts`** — the only part that
   changes between cards.

Regenerating the plate re-bases the whole set, which is why it takes its own
command rather than falling out of a normal run.

## Source layout

```
assets/og/
  <file>.png             a finished 1200x630 card, published verbatim
  poster/<name>.webp     the generated card, cropped and published
  poster/candidates/     options from `--candidates`, awaiting a pick
  style/master.webp      the approved card every generation copies
  PROMPTS.md             generated; the paste-ready prompts
  manifest.json          generated; the freshness record
```

`pnpm og` resolves each route in this order:

1. **`assets/og/<file>`** — a finished image, cropped and re-encoded. This is
   the escape hatch for a card laid out by hand.
2. **`assets/og/poster/<name>.webp`** — the generated card.
3. None — reported, and nothing is written. There is no placeholder plate: a
   fallback that looks finished is how a route quietly stays unillustrated.

## Generating

Put a key in `.env` (gitignored):

```
GEMINI_API_KEY="..."
```

Then:

```
pnpm og:master home --candidates 3   the style plate, first and once
pnpm og:generate --dry-run           what it would generate, and the rough spend
pnpm og:generate                     fill in everything missing
pnpm og:generate --only <name>       just one
pnpm og:generate --force <name>      replace a card that already exists
pnpm og:generate --candidates 3      three options per route, to choose between
pnpm og:pick <name> 2                promote candidate 2 to the real file
pnpm og                              crop and publish into public/og/
```

`pnpm og:generate` refuses to run without a style plate, because a run without
one succeeds and quietly produces 34 unrelated images.

### Choosing a style plate

`pnpm og:master <name> --candidates 3` writes `assets/og/style/master-1.webp`
and friends, generated from the written contract alone — these are the only
calls in the set with no plate to copy. Look at all three at published size,
then:

```
cp assets/og/style/master-2.webp assets/og/style/master.webp
```

Judge them on the things the rest of the set will inherit: is the headline
entirely clear of the objects, is the wordmark bright enough to read at
thumbnail size, is the mascot four-lobed rather than an egg. Everything after
copies whatever lands here, mistakes included.

**Nothing is ever regenerated.** A route is skipped when it already has a
source, so a good card stays good and a rerun after a crash costs nothing for
what already landed. `--force` is the only way past that, and it takes one name
at a time on purpose.

Generation only ever writes into `assets/og/`. Cropping and publishing stay in
`pnpm og`, so a bad generation can be deleted and retried without `public/og/`
ever having held it.

### Cost

Every call is priced from the `usageMetadata` the API returns, not estimated:

```
[4/33] blog-ai-agent-memory … $0.1774  (3,710 in / 1,412 out, 41.2s)
        running total $0.7213
```

and at the end, the run total plus lifetime spend across all runs, tracked in
`assets/og/generation-log.jsonl` (gitignored). Rates live in
`scripts/og/pricing.mjs`. A full 34-card set is about $6.

Defaults to `gemini-3-pro-image` (Nano Banana Pro) at 2K, about $0.18 a card.
Override with `GEMINI_IMAGE_MODEL` and `GEMINI_IMAGE_SIZE`; anything you point
it at needs an entry in `pricing.mjs` or it refuses to run rather than generate
uncosted.

### Generating by hand instead

`pnpm og:prompts` writes `assets/og/PROMPTS.md` — the same prompts, paste-ready
for a chat UI. `pnpm og --print <name>` prints one to stdout. **Attach the
reference images listed at the top of that file**, style plate first. Save the
result to `assets/og/poster/<name>.webp` (16:9, ≥1600 wide), then run `pnpm og`.

Commit both the source card and the published JPEG.

## Writing a card

```ts
"blog-ai-agent-memory": {
  headline: ["AI AGENT MEMORY", "YOU CAN CONTROL"],
  scene:
    "The mascot on top of a wooden card index drawer pulled fully open, ...",
},
```

**`headline`** is hand-broken, because poster type always is. At most three
lines of about sixteen characters — beyond that the model has to choose between
shrinking the headline and running it into the object, and it usually chooses
wrong. The badge above it comes from the route kind, not from here.

**`scene`** names real objects, from roughly 1995 to 2005. A camera can
photograph "an index card drawer pulled open"; it cannot photograph "memory you
can control". Scenes carry no colour, lighting, material, or camera notes,
because those would start disagreeing with the contract and the model would
split the difference. The moment a scene asks for something abstract, the model
falls back on floating glass panels and the card stops being a photograph.

Writing **on** the objects is allowed and wanted — a product name silkscreened
on a box, a label on a file tab. It is what makes a card read as an artifact
rather than a render. The contract fences it: short, plainly spelled, never
competing with the headline, and blank rather than garbled.

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
and `twitter:image`. The generated card is skipped.

The value is a bare filename, not a path — the file always lives in
`assets/og/`. If it is missing, `pnpm og` fails loudly rather than writing an
image to the wrong name and leaving the route pointing at a 404.

## Where each piece lives

| Concern                                        | File                       | Changing it affects     |
| ---------------------------------------------- | -------------------------- | ----------------------- |
| Studio, palette, mascot, typography, forbidden | `scripts/og/poster.mjs`    | every card              |
| What one card says and photographs             | `app/content/og-poster.ts` | one card                |
| The badge for a route kind                     | `app/content/og-poster.ts` | every card of that kind |
| Crop and encode                                | `scripts/og/publish.mjs`   | every card              |

If one card comes out wrong, fix its **scene**. Only re-base the **contract**
when the whole set should change — and regenerate everything after, or the set
stops matching itself.

## Why this is not part of `pnpm build`

The cards cost money and take about forty seconds each, and they are reviewed
by eye before they ship. They are committed artifacts, generated once.

That trades one failure mode for another: an edited headline with a stale card.
`tests/og-images.test.ts` closes it by recomputing each image's signature from
live route data plus the source files on disk and comparing it to
`assets/og/manifest.json`. Change a headline, replace a card, or bump
`PUBLISH_VERSION`, and the suite fails with "run `pnpm og`".
