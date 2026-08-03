# Homepage card candidates

Kept artwork from the round that chose the homepage card. Nothing here is
published except `home-22`, which was promoted to `../home.webp`. They are
committed rather than thrown away because they are worth reusing and because
generating them again costs money.

None of them follows the studio system in `scripts/og/poster.mjs`. Each takes
its whole look from one of the references in `assets/refs/`, so dropping one
into the route set would break its consistency.

| File           | Direction  | Notes                                                                    |
| -------------- | ---------- | ------------------------------------------------------------------------ |
| `home-22`      | poster     | **Published.** Colossal `AI EMPLOYEE`, photographed CRT over clouds, monospace spec block. |
| `home-4`       | poster     | The style lock for this direction. Attach it when generating more.        |
| `home-5`       | poster     | Alternate composition.                                                    |
| `home-6`       | poster     | Alternate composition. Its vertical wordmark is misspelled.               |
| `home-25`      | poster     | `24/7` display type with the same spec block.                             |
| `home-11`      | catalogue  | Cream page, ruled frame, boxed software, `SYSTEM REQUIREMENTS` list.      |
| `home-12`      | catalogue  | The same, with a quick-start card in the still life.                      |
| `home-15`      | key art    | Film poster. Features a person, so it is not a drop-in for a route card.  |
| `home-16`      | magazine   | Mascot bursting through shattering glass, chrome wordmark.                |

The catalogue and magazine pairs are worth remixing for other surfaces rather
than for route cards: they read as beautiful without explaining what the
product does, which is why they lost.

`pnpm og:pick home <n>` promotes one of these to `../home.webp`; run `pnpm og`
afterwards to publish it. The homepage card is `fullFrame`, so it is scaled to
fit 1200x630 rather than centre-cropped. Any replacement needs to be composed
to survive that, or the flag needs revisiting.
