import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import {
  manifestPath,
  outputDirectory,
  promptsPath,
  readManifest,
  readSources,
  signature,
} from "./og/manifest.mjs";
import {
  buildPosterPrompt,
  posterReferences,
  promptHeader,
} from "./og/poster.mjs";
import { publish } from "./og/publish.mjs";
import { loadCards } from "./og/routes.mjs";

/**
 * Builds `public/og/` from the committed cards in `assets/og/`.
 *
 * Deliberately not part of `pnpm build`: the images are committed artifacts,
 * generated once and reviewed, not rebuilt on every CI runner.
 * `tests/og-images.test.ts` compares the committed manifest against live route
 * data and fails when the two drift, which is what stops an edited headline
 * from silently shipping a stale card.
 *
 *   pnpm og                 publish every card
 *   pnpm og --only <name>   publish one
 *   pnpm og:prompts         write assets/og/PROMPTS.md
 *   pnpm og --print <name>  print one prompt to stdout
 */

const root = process.cwd();

/**
 * Writes one image and returns its manifest signature. A hand-made card in
 * `assets/og/` wins outright; otherwise the generated card is cropped and
 * published. There is no fallback plate: a route with no card is reported and
 * left alone, because shipping a placeholder that looks finished is how one
 * quietly stays in the set.
 */
async function publishOne(card) {
  const { custom, poster } = await readSources(card.name, card.stem);
  const source = custom ?? poster;
  if (!source) return null;

  await writeFile(
    path.join(outputDirectory, `${card.stem}.jpg`),
    await publish(source, { fullFrame: card.fullFrame }),
  );
  return signature({
    stem: card.stem,
    eyebrow: card.eyebrow,
    headline: card.headline,
    fullFrame: card.fullFrame,
    custom,
    poster,
  });
}

async function render(cards, all) {
  await mkdir(outputDirectory, { recursive: true });
  const manifest = all ? {} : await readManifest();
  const missing = [];

  for (const card of cards) {
    const result = await publishOne(card);
    if (result) manifest[card.name] = result;
    else missing.push(card.name);
  }

  const sorted = Object.fromEntries(Object.entries(manifest).sort());
  await writeFile(manifestPath, `${JSON.stringify(sorted, null, 2)}\n`);

  console.log(
    `Published ${cards.length - missing.length} image(s) into public/og/`,
  );
  if (missing.length) {
    console.log(
      `\nNo card yet (${missing.length}):\n  ${missing.join("\n  ")}\n\n` +
        `Run \`pnpm og:generate\` to make them, then rerun \`pnpm og\`.`,
    );
    process.exitCode = 1;
  }
}

async function writePrompts(cards) {
  const sections = cards.map(
    (card) =>
      `## \`${card.name}\`\n\n${card.title} — ${card.kind}\n\n\`\`\`text\n${buildPosterPrompt(card)}\n\`\`\`\n`,
  );
  await writeFile(promptsPath, `${promptHeader()}\n${sections.join("\n")}`);
  console.log(
    `Wrote ${cards.length} prompts to ${path.relative(root, promptsPath)}`,
  );
}

const args = process.argv.slice(2);
function flag(name) {
  const index = args.indexOf(name);
  return index === -1 ? null : (args[index + 1] ?? "");
}

function select(cards, name) {
  const card = cards.find((entry) => entry.name === name);
  if (!card) {
    throw new Error(
      `Unknown OG name "${name}". Known names:\n  ${cards.map((entry) => entry.name).join("\n  ")}`,
    );
  }
  return card;
}

const cards = await loadCards();
const printTarget = flag("--print");
const onlyTarget = flag("--only");

if (printTarget !== null) {
  console.log("Attach these references, in order:");
  for (const { file, note } of posterReferences()) {
    console.log(`  ${file}\n    ${note}`);
  }
  console.log();
  console.log(buildPosterPrompt(select(cards, printTarget)));
} else if (args.includes("--prompts")) {
  await writePrompts(cards);
} else if (onlyTarget !== null) {
  await render([select(cards, onlyTarget)], false);
} else {
  await render(cards, true);
}
