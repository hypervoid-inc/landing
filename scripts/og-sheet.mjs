import { Buffer } from "node:buffer";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";
import { createServer } from "vite";

import { closeRenderer, renderOgCard } from "./og/card/index.mjs";
import { esc } from "./og/card/kit.mjs";

/**
 * The publishing calendar as a contact sheet, the way the blog index and a
 * feed will actually show it: every post in date order, drafts included, each
 * card at thumbnail size beside its neighbours.
 *
 *   pnpm og:sheet                    from a week ago onward
 *   pnpm og:sheet --from 2026-06-01  from a date
 *   pnpm og:sheet --only <name>      one card, full size
 *   pnpm og:sheet --file <cards.json> render cards not yet in
 *                                    og-card-content.ts, keyed by OG name
 *
 * A card is judged here rather than on its own. Alone, almost anything looks
 * fine; next to the cards either side of it, a repeat or a weak hook is
 * obvious. Cards are rendered fresh, so a draft's card can be reviewed before
 * the post is scheduled. Nothing is written to `public/`.
 */

const root = process.cwd();
const out = path.join(root, "assets/og/check");
const args = process.argv.slice(2);
function flag(name) {
  const index = args.indexOf(name);
  return index === -1 ? null : (args[index + 1] ?? "");
}

const vite = await createServer({
  root,
  logLevel: "error",
  server: { middlewareMode: true, watch: null },
  appType: "custom",
});
let modules;
try {
  modules = {
    ...(await vite.ssrLoadModule("/app/content/og-cards.ts")),
    ...(await vite.ssrLoadModule("/app/lib/route-manifest.ts")),
    ...(await vite.ssrLoadModule("/app/content/blog/metadata.generated.ts")),
  };
} finally {
  await vite.close();
}
const {
  ogCards,
  cardContext,
  ogName,
  canonicalRoutes,
  upcomingRoutes,
  blogMetadata,
} = modules;

const routes = [...canonicalRoutes, ...upcomingRoutes];
const byName = new Map(routes.map((route) => [ogName(route.path), route]));

/**
 * Drafts are not routes yet, but their cards are reviewed now, so each gets
 * a stand-in with the kind and date it will publish with.
 */
const drafts = blogMetadata
  .filter((post) => !byName.has(ogName(`/blog/${post.slug}`)))
  .map((post) => ({
    path: `/blog/${post.slug}`,
    kind: post.kind === "article" ? "blog-post" : post.kind,
    published: post.published,
    tags: post.tags,
    image: `https://construct.computer/og/${ogName(`/blog/${post.slug}`)}.jpg`,
    draft: true,
  }));
for (const draft of drafts) byName.set(ogName(draft.path), draft);

/** Renders one card the way `pnpm og` would, from what is in `public/og`. */
async function render(name, card) {
  const route = byName.get(name);
  if (!route) throw new Error(`${name} is not a route`);
  const context = cardContext(route, routes, card);
  const images = await Promise.all(
    (context.members ?? [])
      .map((member) => path.join(root, "public/og", `${member.stem}.jpg`))
      .filter((file) => existsSync(file))
      .map((file) => readFile(file)),
  );
  return renderOgCard(card, context, images);
}

await mkdir(out, { recursive: true });

async function renderTo(name, card) {
  const target = path.join(out, `${name}.png`);
  await writeFile(target, await render(name, card));
  return path.relative(root, target);
}

const file = flag("--file");
if (file !== null) {
  const cards = JSON.parse(await readFile(file, "utf8"));
  let failed = 0;
  for (const [name, card] of Object.entries(cards)) {
    try {
      console.log(`${name}: ${await renderTo(name, card)}`);
    } catch (error) {
      failed += 1;
      console.log(`${name}: ${error.message}`);
    }
  }
  await closeRenderer();
  process.exit(failed ? 1 : 0);
}

const only = flag("--only");
if (only !== null) {
  const card = ogCards[only];
  if (!card) throw new Error(`${only} has no card in app/content/og-cards.ts`);
  console.log(await renderTo(only, card));
  await closeRenderer();
  process.exit(0);
}

const week = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
const from = flag("--from") ?? week;
const shown = [...routes, ...drafts]
  .filter((route) => route.published && route.published >= from)
  .filter((route) => ["blog-post", "guide", "comparison"].includes(route.kind))
  .sort((left, right) => left.published.localeCompare(right.published));

const TILE = 400;
const TILE_HEIGHT = Math.round((TILE * 630) / 1200);
const CAPTION = 26;
const COLUMNS = 3;

const tiles = [];
for (const route of shown) {
  const name = ogName(route.path);
  const card = ogCards[name];
  let image = null;
  if (card) image = await render(name, card);
  else {
    const published = path.join(root, "public/og", `${name}.jpg`);
    if (existsSync(published)) image = await readFile(published);
  }
  const label = `${route.published}  ${card?.figure.kind ?? "hand-made"}${route.draft ? "  draft" : ""}  ${name.replace(/^blog-/, "")}`;
  tiles.push({ image, label });
  process.stdout.write(".");
}
await closeRenderer();
console.log();

const rows = Math.ceil(tiles.length / COLUMNS);
const composites = [];
for (const [index, tile] of tiles.entries()) {
  const left = (index % COLUMNS) * TILE;
  const top = Math.floor(index / COLUMNS) * (TILE_HEIGHT + CAPTION);
  const picture = tile.image
    ? await sharp(tile.image).resize(TILE, TILE_HEIGHT).toBuffer()
    : await sharp({
        create: {
          width: TILE,
          height: TILE_HEIGHT,
          channels: 3,
          background: "#e7eef1",
        },
      })
        .png()
        .toBuffer();
  composites.push({ input: picture, left, top });
  composites.push({
    input: Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="${CAPTION}"><rect width="100%" height="100%" fill="#17191c"/><text x="8" y="17" font-family="Menlo" font-size="11" fill="#e8eef0">${esc(tile.label.slice(0, 62))}</text></svg>`,
    ),
    left,
    top: top + TILE_HEIGHT,
  });
}

const sheet = path.join(out, "sheet.jpg");
await sharp({
  create: {
    width: TILE * COLUMNS,
    height: Math.max(1, rows) * (TILE_HEIGHT + CAPTION),
    channels: 3,
    background: "#17191c",
  },
})
  .composite(composites)
  .jpeg({ quality: 82 })
  .toFile(sheet);
console.log(
  `${tiles.length} cards from ${from}: ${path.relative(root, sheet)}`,
);
