# Social cards and blog thumbnails

One image per canonical route serves three jobs at once: the `og:image` and
`twitter:image` social card, and the thumbnail on the blog index. They are
published to `public/og/` at 1200×630 and are committed to the repo.

Route names come from `ogName()` in `app/lib/route-manifest.ts`
(`/blog/ai-employee` → `blog-ai-employee`).

## The direction

Every card is one photograph: a real object and the Construct mascot, shot
together on a bright seamless paper-white table, with the type set over the
frame afterwards.

```
┌──────────────────────────────────────────────┐
│ C O N S T R U C T            [ AI EMPLOYEE ] │  ← ink wordmark, cyan badge
│                                              │
│                        (mascot, hero)        │
│                          ▓▓▓▓▓               │  ← one real object, 1995-2005
│  A PERSISTENT            ▓▓▓▓▓               │  ← ink condensed caps
│  WORK OS FOR AN                              │
│  AI EMPLOYEE                                 │
│  construct.computer                          │
└──────────────────────────────────────────────┘
```

The palette is the landing page's own: `--color-canvas` and white for the
ground, `--color-ink` for the type, `--color-brand` for the one accent. A card
and the page it links to are the same two greys and the same cyan.

**The failure mode this set exists to avoid** is the default one: a swarm of
glowing translucent UI panels and dashed orbit rings on a gradient. That is what
an image model reaches for unprompted, and what every AI company already looks
like. `scripts/og/poster.mjs` forbids it by name, and scenes in
`app/content/og-poster.ts` are written as real objects specifically so the model
never has to invent something abstract.

## Two passes, not one

The model draws the photograph. It does not draw the words.

|          | produces                                                   | lives in                 |
| -------- | ---------------------------------------------------------- | ------------------------ |
| generate | the photograph, with the type regions left empty           | `scripts/og/poster.mjs`  |
| publish  | the wordmark, badge, headline, and domain, at exact pixels | `scripts/og/typeset.mjs` |

The whole card used to come out of the model in one pass. That held the _look_
together but never the typography: across the set the wordmark drifted by a
third of its size, headlines were set anywhere from 60 to 110px, and the domain
wandered along the bottom edge. No prompt fixes that, because the model is
interpreting a percentage rather than measuring one.

Two things follow from the split:

- Text style, size, position, and spelling are identical across every card by
  construction, not by luck.
- **Editing a headline no longer costs a generation.** Change it in
  `app/content/og-poster.ts`, run `pnpm og`, and the model is never called.

`poster.mjs` imports `RESERVED` from `typeset.mjs`, so the region the prompt
asks the photograph to keep clear is the same number the type is set into. They
cannot drift apart. The prompt states it as a hard vertical line — "everything
you photograph sits entirely to the right of it" — because a model follows that
where it rounds away a percentage.

### The bloom

Type still has to survive a photograph that ignored the line, so each block is
set over a white bloom: a heavily blurred white pad behind the block, plus a
tight halo on the glyphs themselves. It is lifted from `.pricing-summary` on the
landing page, which solves the same problem, and for the same reason — a
`text-shadow` alone leaves artwork showing through the counters of an O.

On a card that obeyed the framing it is invisible. On one that did not, it is
what keeps the headline readable. Tune it with `BLOOM` in `typeset.mjs`; the pad
blur is deliberately large, since a tight blur reads as a rectangle sitting on
the photograph.

## What holds the set together

Three things, in order of how much they actually do:

1. **`assets/refs/mascot-sheet.png`** — the mascot's real 360° turnaround, cut
   from `assets/refs/construct-rotate.gif` and attached first on every call. The
   shape is what drifted worst, and a shape is fixed with images, not adjectives.
2. **`assets/og/style/master.webp`** — one approved photograph, attached second
   as the studio, the light, and the staging to copy.
3. **The contract in `scripts/og/poster.mjs`**, sent byte-identical every time.

Only the route's entry in `app/content/og-poster.ts` changes between cards.

Regenerating the plate re-bases the whole set, which is why it takes its own
command rather than falling out of a normal run.

## Source layout

```
assets/og/
  <file>.png             a finished 1200x630 card, published verbatim
  poster/<name>.webp     the generated photograph, cropped, typeset, published
  poster/candidates/     options from `--candidates`, awaiting a pick
  style/master.webp      the approved photograph every generation copies
  PROMPTS.md             generated; the paste-ready prompts
  manifest.json          generated; the freshness record
```

`pnpm og` resolves each route in this order:

1. **`assets/og/<file>`** — a finished card, cropped and re-encoded. It gets no
   type layer: it is already a finished card, and setting a headline over one
   would land it wherever that card happens to be empty.
2. **`assets/og/poster/<name>.webp`** — the generated photograph, typeset.
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
pnpm og:fix --master                 repair the plate's mascot in place
pnpm og:generate --dry-run           what it would generate, and the rough spend
pnpm og:generate                     fill in everything missing
pnpm og:generate --only <name>       just one
pnpm og:generate --force <name>      replace a card that already exists
pnpm og:generate --candidates 3      three options per route, to choose between
pnpm og:pick <name> 2                promote candidate 2 to the real file
pnpm og:fix <name>                   repair one card's mascot in place
pnpm og                              crop, typeset, and publish into public/og/
```

`pnpm og:generate` refuses to run without a style plate, because a run without
one succeeds and quietly produces a set of unrelated images.

### The mascot, and why cards are made in two passes

The mascot's form is the one thing in this system that generation does not hold
on its own. Expect to make a card twice:

```
pnpm og:generate --only <name>    the photograph: staging, light, composition
pnpm og:fix <name>                the mascot, if it came back wrong
```

`pnpm og:fix` is an image-to-image pass: the model is shown the finished
photograph and the mascot turnaround, and asked to swap that one object and
change nothing else. The composition — usually the expensive part to get right —
survives intact.

**Reach for it before touching the mascot description in `poster.mjs`.** That
paragraph was rewritten five times over one afternoon and each rewrite fixed the
last complaint and introduced a new one: a flat glass slab, a pinched bone, a
cube with corner bumps, a ghost with legs, googly eyes. A paragraph is a lossy
way to specify a solid, and finding out costs a regeneration of the whole set.

Three things that do work, learned the expensive way:

1. **Stage it on top of something larger** (enforced by a test). Free-standing
   on the table beside a small object, the model reads it as a character and
   gives it legs.
2. **Render it large.** An earlier draft of the contract said it was small
   relative to what it rests on, and that one line brought the legs straight
   back — a small soft object next to office furniture reads as a toy creature.
3. **Never show it edge-on.** The first mascot sheet went all the way round,
   including the profile and the eyeless back. Edge-on it looks like two rounded
   masses joined at a waist, and the set came back full of mascots that looked
   like two stuck end to end.

The version before a repair is kept beside it as `<name>.before.webp`. Copy it
back if the repair came out worse, which happens: a pass over an _already-good_
mascot reliably makes it glossier and cloudier. Repair the wrong ones only, once.

### Choosing a style plate

`pnpm og:master <name> --candidates 3` writes `assets/og/style/master-1.webp`
and friends, generated from the written contract alone — these are the only
calls in the set with no plate to copy. Look at all three at published size,
then:

```
cp assets/og/style/master-2.webp assets/og/style/master.webp
```

Judge them on what the rest of the set will inherit: is the ground bright and
even, is the lower-left genuinely empty, does the object sit right of centre,
is the mascot four-lobed and soft rather than a blob. Everything after copies
whatever lands here, mistakes included — so if the composition is right and only
the mascot is wrong, promote it anyway and run `pnpm og:fix --master`.

**Nothing is ever regenerated.** A route is skipped when it already has a
source, so a good card stays good and a rerun after a crash costs nothing for
what already landed. `--force` is the only way past that, and it takes one name
at a time on purpose.

Generation only ever writes into `assets/og/`. Cropping, typesetting, and
publishing stay in `pnpm og`, so a bad generation can be deleted and retried
without `public/og/` ever having held it.

### Cost

Every call is priced from the `usageMetadata` the API returns, not estimated:

```
[4/33] blog-ai-agent-memory … $0.1729  (4,240 in / 1,370 out, 52.7s)
        running total $0.7213
```

and at the end, the run total plus lifetime spend across all runs, tracked in
`assets/og/generation-log.jsonl` (gitignored). Rates live in
`scripts/og/pricing.mjs`. A full set is about $4.75.

### The model matters more than the prompt

Defaults to **`gemini-3.1-flash-image` (Nano Banana 2)** at 2K, about $0.13 a
card. Override with `GEMINI_IMAGE_MODEL` and `GEMINI_IMAGE_SIZE`; anything you
point it at needs an entry in `pricing.mjs` or it refuses to run rather than
generate uncosted.

This was `gemini-3-pro-image` until 2026-08-09, which despite the "pro" is a
generation older. On identical prompts and references it got the mascot right
about one card in three; the rest came back as bones, cubes, ghosts with legs,
or two shapes joined end to end. Five rewrites of the mascot contract did not
move that number. Swapping the model fixed the three worst cards on the first
attempt and costs ~20% less a call.

Worth remembering the next time a card looks wrong: check what is generating it
before rewriting how it is described. If Nano Banana 2 ever plateaus, the
next things to try are FLUX.2 `[pro]` or FLUX Kontext on Cloudflare Workers AI,
both of which are built around multi-reference consistency — Kontext especially
for the `og:fix` repair pass, which is exactly the job it exists for. Both would
need their own client; nothing here is Gemini-specific except `og/gemini.mjs`.

### Generating by hand instead

`pnpm og:prompts` writes `assets/og/PROMPTS.md` — the same prompts, paste-ready
for a chat UI. `pnpm og --print <name>` prints one to stdout. **Attach the
reference images listed at the top of that file**, turnaround first. Save the
result to `assets/og/poster/<name>.webp` (16:9, ≥1600 wide), then run `pnpm og`
to typeset and publish it.

Commit both the source photograph and the published JPEG.

## Writing a card

```ts
"blog-ai-agent-memory": {
  headline: ["AI AGENT MEMORY", "YOU CAN CONTROL"],
  scene:
    "The mascot on top of a wooden card index drawer pulled fully open, ...",
},
```

**`headline`** is hand-broken, because poster type always is. At most three
lines of sixteen characters — those are the sizes the type grid is drawn around
(104px cap for one line, 88 for two, 70 for three). A longer line is set smaller
to fit rather than allowed past the margin, which is a card that no longer
matches the set. The badge above it comes from the route kind, not from here.

**`scene`** names real objects, from roughly 1995 to 2005. A camera can
photograph "an index card drawer pulled open"; it cannot photograph "memory you
can control". Scenes carry no colour, lighting, material, or camera notes,
because those would start disagreeing with the contract and the model would
split the difference. The moment a scene asks for something abstract, the model
falls back on floating glass panels and the card stops being a photograph.

Writing **on** the objects is allowed and wanted — a product name silkscreened
on a box, a label on a file tab. It is what makes a card read as an artifact
rather than a render, and it is now the only writing in the frame at all. The
contract fences it: short, plainly spelled, physically part of the object, and
blank rather than garbled.

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
and `twitter:image`. The generated card is skipped, and so is the type layer —
a hand-made card carries its own words.

The value is a bare filename, not a path — the file always lives in
`assets/og/`. If it is missing, `pnpm og` fails loudly rather than writing an
image to the wrong name and leaving the route pointing at a 404.

### The homepage card is one of these

`assets/og/home.png` is a hand-made printed poster — a cut-out CRT and mascot
over clouds, with its own display type and wordmark — and it is **never
generated**. Because a hand-made image wins outright, `pnpm og:generate` skips
the route entirely and no run can overwrite it. It is the one card in the set
that does not match the studio direction, on purpose.

It is the only card with `fullFrame: true`. Its composition runs to all four
edges, so the usual centre crop clips the top of the headline, the wordmark up
the right edge, and the domain; the 6.7% squash that replaces the crop is
invisible on flat poster type. Replace it by dropping a new file at the same
path and running `pnpm og`.

## Wide covers for X articles

An X article cover is 5:2, not 1.91:1, so it cannot be a route card cropped.
`pnpm social <name>` makes one at 2000×800 into `assets/social/`, and it is the
same shoot: `scripts/generate-social-card.mjs` imports the studio, the mascot,
the in-world writing rules, and the forbidden list from `poster.mjs` and
attaches `posterReferences()`, so only three things differ — the canvas is 21:9
(centre-cropped to 5:2), the crop band is 5% rather than 4%, and the type column
widens to 48%.

The type layer is `typeset.mjs`'s own helpers at 2000×800 rather than a second
implementation: same measured-ink placement, same white bloom, positions scaled
by 800/630. A cover gains one element the route cards do not have, a subline,
because it is read once in a feed with no page behind it.

```
pnpm social <name> --dry-run         print the prompt, call nothing
pnpm social <name> --candidates 3    options to choose between
pnpm social <name> --pick 3          promote one, delete the rest
pnpm social <name> --frame-only      re-set the type over art already on disk
```

Unlike the route set these are not published into `public/og/` and carry no
manifest entry: they are uploaded by hand to the post they were made for.

`supervised-agents` is the one card still on the old `dark` theme, kept because
it is already published. **Do not start a new card in it** — its glowing panels
and orbit rings are the failure mode named at the top of this file, written
before the rebase.

## Inline banners, which are not generated at all

`pnpm banner <name>` writes a long, low strip into `assets/social/` from
`scripts/generate-banner.mjs`. It never calls Gemini, and that is deliberate
rather than a shortcut.

A banner's entire content is a date and a URL. That is precisely the half
`typeset.mjs` exists to take away from the model, and `poster.mjs` forbids it
drawing type at all — a garbled `construct.computer/ph` is a dead link sitting
in the middle of a post. The shape rules generation out independently: the
widest ratio Gemini offers is 21:9 and these run at 5:1, so more than half of
every frame would be cropped away and the model would be composing for a frame
it never sees.

So the ground is a flat fill, the type is `typeset.mjs`'s own measured-ink
placement, and the mascot is the shipped artwork composited in. It costs
nothing, it is pixel-identical on every run, and the URL is always spelled
correctly.

Two things worth knowing before editing it:

- **The mascot comes from `public/icon-512.png`, not the turnaround.** The GIF's
  frames carry an opaque white rectangle behind the object, so a cutout taken
  from it brings a white box along and a shadow built from its alpha comes back
  a blurred square. `mascot-sheet.mjs` never hits this because it composites
  onto a white sheet.
- **The drop shadow pads before it blurs.** The cutout fills its buffer edge to
  edge, and a blur that clamps against the boundary fills in the concave corners
  between the lobes and reads as a grey box. Padding happens while the image is
  still RGBA, because `extend` on a single-channel image does not honour the
  background and comes back opaque.

## Where each piece lives

| Concern                                 | File                          | Changing it affects     |
| --------------------------------------- | ----------------------------- | ----------------------- |
| Studio, palette, mascot, reserved areas | `scripts/og/poster.mjs`       | every card, and covers  |
| Typeface, sizes, positions, colours     | `scripts/og/typeset.mjs`      | every card, and covers  |
| The mascot reference sheet              | `scripts/og/mascot-sheet.mjs` | every card              |
| What one card says and photographs      | `app/content/og-poster.ts`    | one card                |
| The badge for a route kind              | `app/content/og-poster.ts`    | every card of that kind |
| Crop and encode                         | `scripts/og/publish.mjs`      | every card              |
| An inline article banner                | `scripts/generate-banner.mjs` | one banner              |

If one card comes out wrong, fix its **scene**, or run `pnpm og:fix`. Only
re-base the **contract** when the whole set should change — and regenerate
everything after, or the set stops matching itself.

## Why this is not part of `pnpm build`

The photographs cost money and take about forty seconds each, and they are
reviewed by eye before they ship. They are committed artifacts, generated once.

That trades one failure mode for another: an edited headline with a stale card.
`tests/og-images.test.ts` closes it by recomputing each image's signature from
live route data plus the source files on disk and comparing it to
`assets/og/manifest.json`. Change a headline, replace a card, or bump
`PUBLISH_VERSION` (which tracks `TYPE_VERSION`), and the suite fails with
"run `pnpm og`".

## Typeface

The type layer is set in Helvetica Neue — condensed black for the wordmark and
headline, medium for the badge and domain. It ships with macOS; `pnpm og` runs
a preflight and refuses to publish if the condensed cut is not resolving, since
the fallback is regular Helvetica at weight 900, which is close enough to look
deliberate and wrong enough to reset the whole set's typography. On a machine
without it, point `DISPLAY` in `scripts/og/typeset.mjs` at a heavy condensed
grotesque you do have.
