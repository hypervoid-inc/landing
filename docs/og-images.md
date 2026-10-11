# Social cards and blog thumbnails

One image per canonical route serves three jobs at once: the `og:image` and
`twitter:image` social card, and the thumbnail on the blog index. They are
published to `public/og/` at 1200x630 and are committed to the repo.

Route names come from `ogName()` in `app/lib/route-manifest.ts`
(`/blog/ai-employee` becomes `blog-ai-employee`).

Every route has a **rendered card**, drawn in code from the page's own content.
Three routes keep a **hand-made card** in `assets/og/` instead (the homepage
poster, the Clef vs Jev data card, and the Zen Mode film frame), because each
was made for its page and is one of a kind.

No card is an AI image. Two generated sets were tried and rejected, a studio
still life per post and then a photograph per post of paper with the post's
content printed on it: both read as stock imagery however unique each one was.
The blogs worth copying (Vercel, Linear, Stripe, Anthropic, Notion, Dub, Clerk)
use designed cards with real data, diagrams, product UI and logos.

## Rendered cards

```
+------------------------------------------------------------+
| ConstructComputer                                          |
|                                    +--------------------+  |
|                                    |                    |  |
| COMPARISON . OCT 7, 2026           |  the figure, made  |  |
| Construct vs Lindy                 |  from the page     |  |
| One plan for the whole team...     |                    |  |
|                                    +--------------------+  |
+------------------------------------------------------------+
```

The frame is constant: the italic wordmark as in the site header, an eyebrow
(the page kind, and the date for a post), a headline in Geist with one phrase
in the brand cyan, and an optional one-line deck, on the site's canvas with
its cyan glow and dashed orbit rings. The **figure** is what makes a card that
page's and no other's, and it is built from what the page actually says:

| Figure      | For                          | Shows                                                    |
| ----------- | ---------------------------- | -------------------------------------------------------- |
| `versus`    | a one-to-one comparison      | Construct and the rival's logo, the facts that decide it |
| `matrix`    | an alternatives list         | each tool's logo, scored criteria, price                 |
| `bars`      | a cost comparison            | each tool's price as a bar                               |
| `plans`     | three options or plans       | three cards, the middle one raised                       |
| `curve`     | a post built on a formula    | the curve plotted from the post's numbers                |
| `statement` | a post built on one number   | the number and what it means                             |
| `sheet`     | research into a spreadsheet  | the file the agent fills in                              |
| `activity`  | a job the agent runs         | Construct's Activity log, a row per step                 |
| `message`   | work that lands in a channel | the post in Slack (or wherever) and its sources          |
| `chat`      | asking the agent             | the exchange, in the homepage's bubbles                  |
| `email`     | the agent's inbox            | the mail and the agent's note on it                      |
| `week`      | schedules                    | a week in the Calendar with the jobs on it               |
| `flow`      | how a system connects        | nodes with logos or icons, an optional boundary          |
| `terminal`  | the sandbox                  | the commands from the page                               |
| `checklist` | rules or steps               | each allowed, refused, or to do                          |
| `contrast`  | one approach against another | two columns, Construct's on the right                    |
| `mosaic`    | topic hubs and indexes       | the published cards of the pages listed                  |
| `profile`   | authors                      | photo, role, the topics they write about                 |

### Writing one

Cards live in `app/content/og-card-content.ts`, keyed by OG name, typed by
`OgCard` in `app/content/og-cards.ts`. Topic hubs, indexes and authors are
derived there, so a new topic has its card the moment its hub exists.

1. Pick the figure the page's content already is.
2. Fill it with the page's own numbers, names, steps and example. Everything
   on the card must be true of the page; a card that says something the page
   does not is worse than none. Comparisons show the rival.
3. Headline in eight words or fewer, `*one phrase*` marked for the brand
   colour. A deck only if it adds a fact the figure does not show.
4. Check it: `pnpm og:sheet --only <name>` renders it full size into
   `assets/og/check/`, and `pnpm og:sheet` shows the calendar as thumbnails
   so it can be judged beside its neighbours.
5. `pnpm og` publishes it, along with any topic hub it appears on.

The renderer fails a card whose headline does not fit, whose line is clipped,
or whose figure runs past its area, so a card that publishes is a card that
fits. `tests/og-cards.test.ts` checks that every product a card names shows
its real logo, that no two cards carry the same figure, and that the publishing
calendar never repeats a figure kind within three posts or more than twice in
fourteen days.

### Logos

Logos are matched by product name in `scripts/og/card/logos.mjs`, so a matrix
row called "Claude Cowork" shows Claude's mark without anyone choosing an
image. Files are in `assets/og/logos/`, with provenance in its `SOURCES.md`. A
new product needs its logo added there before a card can name it.

### How a card is made

`scripts/og/card/` builds the card as HTML in the site's own tokens, fonts
and icons (Hugeicons), and screenshots it in headless Chromium at 2x; `pnpm og`
encodes it to JPEG. Geist is embedded from `@fontsource-variable/geist`. The
wordmark's Georgia and the terminal's Menlo come from the system, and the
renderer refuses to run without them, so cards are made on macOS. Nothing is
generated by a model, a card costs nothing, and the same content renders to
the same bytes.

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
and `twitter:image`. No card is rendered for it; a hand-made card carries its
own words. Remove the route's entry from `app/content/og-card-content.ts` and
register it in `app/content/og-poster.ts`.

The value is a bare filename, not a path, the file always lives in
`assets/og/`. If it is missing, `pnpm og` fails loudly rather than writing an
image to the wrong name and leaving the route pointing at a 404.

### The homepage card is one of these

`assets/og/home.png` is a hand-made printed poster, a cut-out CRT and mascot
over clouds, with its own display type and wordmark. It is the one card in the
set that does not match the rendered frame, on purpose.

It is the only card with `fullFrame: true`. Its composition runs to all four
edges, so the usual centre crop clips the top of the headline, the wordmark up
the right edge, and the domain; the 6.7% squash that replaces the crop is
invisible on flat poster type. Replace it by dropping a new file at the same
path and running `pnpm og`.

## Source layout

```
app/content/og-card-content.ts   each route's card
app/content/og-cards.ts          the types, the derived cards, the eyebrow
app/content/og-poster.ts         the routes with a hand-made card
scripts/og/card/                 the renderer: frame, figures, logos
assets/og/<file>.png             a hand-made card, published as is
assets/og/logos/                 brand logos
assets/og/manifest.json          generated; the freshness record
assets/og/check/                 og:sheet output, not committed
```

## Why this is not part of `pnpm build`

The cards are committed artifacts, reviewed by eye before they ship, and the
renderer needs a browser and the macOS system fonts.

That trades one failure mode for another: an edited card with a stale image.
`tests/og-images.test.ts` closes it by recomputing each image's signature from
the card's content, its eyebrow, the renderer version (`CARD_VERSION` in
`scripts/og/card/index.mjs`) and, for a mosaic, the cards on it, and comparing
it to `assets/og/manifest.json`. Change a card or bump the version and the
suite fails with "run `pnpm og`".

## Wide covers for X articles

An X article cover is 5:2, not 1.91:1, so it cannot be a route card cropped.
`pnpm social <name>` makes one at 2000×800 into `assets/social/`, and it is the
same shoot: `scripts/generate-social-card.mjs` imports the studio, the mascot,
the in-world writing rules, and the forbidden list from `poster.mjs` and
attaches `posterReferences()`, so only three things differ, the canvas is 21:9
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
it is already published. **Do not start a new card in it.**
