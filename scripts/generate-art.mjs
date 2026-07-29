import { existsSync } from "node:fs";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";
import { createServer } from "vite";

import { generateImage } from "./og/gemini.mjs";
import {
  artDirectory,
  fullDirectory,
  readSources,
  sourceDirectory,
} from "./og/manifest.mjs";
import {
  defaultModel,
  formatTokens,
  formatUsd,
  ratesFor,
} from "./og/pricing.mjs";
import { buildPrompt, layouts, referenceImages } from "./og/prompt.mjs";

/**
 * Generates the OG artwork through Gemini.
 *
 * Only ever writes artwork — compositing stays in `pnpm og`, so a bad
 * generation can be deleted and retried without touching `public/og/`.
 * Existing artwork is never overwritten without `--force`, because the whole
 * point of committing sources is that a good image stays good.
 *
 *   pnpm og:generate                    fill in every missing image
 *   pnpm og:generate --only <name>      just one
 *   pnpm og:generate --force <name>     replace one that already exists
 *   pnpm og:generate --candidates 3     write 3 options to choose between
 *   pnpm og:generate --dry-run          show what would be spent, call nothing
 *   pnpm og:pick <name> <n>             promote a candidate to the real file
 */

const root = process.cwd();
const candidateDirectory = path.join(sourceDirectory, "candidates");
const ledgerPath = path.join(sourceDirectory, "generation-log.jsonl");

// .env is gitignored; this is the only place the key is read from.
try {
  process.loadEnvFile(path.join(root, ".env"));
} catch {
  // No .env — the key may come from the environment instead.
}

const model = process.env.GEMINI_IMAGE_MODEL ?? defaultModel;
const imageSize = process.env.GEMINI_IMAGE_SIZE ?? "2K";

async function loadRoutes() {
  const vite = await createServer({
    root,
    logLevel: "error",
    server: { middlewareMode: true, watch: null },
    appType: "custom",
  });
  try {
    const { canonicalRoutes, ogName, routeDisplayTitle } =
      await vite.ssrLoadModule("/app/lib/route-manifest.ts");
    const { ogArtSubjects, ogLayout } = await vite.ssrLoadModule(
      "/app/content/og-art.ts",
    );
    return canonicalRoutes.map((route) => {
      const name = ogName(route.path);
      return {
        name,
        kind: route.kind,
        title: routeDisplayTitle(route),
        subject: ogArtSubjects[name],
        layout: ogLayout(name),
        stem: path.basename(new URL(route.image).pathname, ".jpg"),
      };
    });
  } finally {
    await vite.close();
  }
}

/**
 * Where a route's generated artwork lands. In practice always `full/` — the
 * `art/` branch is only reachable through `--layout tile`, which is kept so the
 * retired tile layout can be revived without rebuilding it. Nothing in
 * `pnpm og` reads `art/` any more, so art written there is inert until
 * `renderOne` is re-wired.
 */
function destinationFor(route) {
  return route.layout === "full"
    ? path.join(fullDirectory, `${route.name}.webp`)
    : path.join(artDirectory, `${route.name}.png`);
}

/**
 * True when there is already art that would make this generation pointless.
 *
 * A hand-made card in `assets/og/` wins outright at composite time, so nothing
 * is generated under it whatever the layout says. Otherwise only this route's
 * *configured* layout counts: a route switched from tile to full-bleed still
 * has its old square art on disk, but that art can no longer be used, so it
 * must not be mistaken for work already done.
 */
async function alreadyHasArt(route) {
  const { custom } = await readSources(route.name, route.stem);
  return Boolean(custom) || exists(destinationFor(route));
}

function exists(file) {
  return existsSync(file);
}

/** One line per generation, so lifetime spend survives across runs. */
async function recordSpend(entry) {
  await appendFile(ledgerPath, `${JSON.stringify(entry)}\n`);
}

async function lifetimeSpend() {
  try {
    const lines = (await readFile(ledgerPath, "utf8")).trim().split("\n");
    return lines
      .filter(Boolean)
      .reduce((total, line) => total + (JSON.parse(line).usd ?? 0), 0);
  } catch {
    return 0;
  }
}

async function generateFor(route, { index, total, candidate }) {
  const label = candidate ? `${route.name} #${candidate}` : route.name;
  process.stdout.write(`[${index}/${total}] ${label} … `);

  const started = Date.now();
  const result = await generateImage({
    model,
    prompt: buildPrompt(route),
    references: referenceImages,
    aspectRatio: layouts[route.layout].aspectRatio,
    imageSize,
  });

  const destination = candidate
    ? path.join(candidateDirectory, `${route.name}-${candidate}.webp`)
    : destinationFor(route);
  await mkdir(path.dirname(destination), { recursive: true });
  // The model returns PNG; WebP q95 stores it eight times smaller and the
  // published JPEG comes out within a few KB of identical.
  await writeFile(
    destination,
    destination.endsWith(".webp")
      ? await sharp(result.data).webp({ quality: 95, effort: 6 }).toBuffer()
      : result.data,
  );

  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(
    `${formatUsd(result.cost.usd)}  ` +
      `(${formatTokens(result.cost.input)} in / ${formatTokens(result.cost.output)} out, ${seconds}s)`,
  );

  await recordSpend({
    at: new Date().toISOString(),
    name: route.name,
    layout: route.layout,
    model,
    imageSize,
    input: result.cost.input,
    output: result.cost.output,
    usd: result.cost.usd,
    file: path.relative(root, destination),
  });
  return result.cost;
}

const args = process.argv.slice(2);
function flag(name) {
  const index = args.indexOf(name);
  return index === -1 ? null : (args[index + 1] ?? "");
}

function select(routes, name) {
  const route = routes.find((entry) => entry.name === name);
  if (!route) {
    throw new Error(
      `Unknown OG name "${name}". Known names:\n  ${routes.map((entry) => entry.name).join("\n  ")}`,
    );
  }
  return route;
}

const routes = await loadRoutes();

// `pnpm og:pick <name> <n>` — promote a candidate and drop the rest.
if (args[0] === "--pick") {
  const route = select(routes, args[1]);
  const chosen = path.join(candidateDirectory, `${route.name}-${args[2]}.webp`);
  const destination = destinationFor(route);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, await readFile(chosen));
  console.log(
    `${path.relative(root, chosen)} → ${path.relative(root, destination)}\nRun \`pnpm og\` to composite it.`,
  );
  process.exit(0);
}

const forced = flag("--force");
const only = flag("--only");
const candidates = Number(flag("--candidates") ?? 1);
const dryRun = args.includes("--dry-run");

/**
 * Overrides the layout a route is configured for, so a full-bleed variant can
 * be generated alongside an existing tile and the two compared. Because
 * `assets/og/full/` outranks `assets/og/art/` when compositing, the variant
 * takes effect on the next `pnpm og` and reverts by deleting it.
 */
const layoutOverride = flag("--layout");
if (layoutOverride !== null && !layouts[layoutOverride]) {
  throw new Error(
    `Unknown layout "${layoutOverride}". Expected one of: ${Object.keys(layouts).join(", ")}`,
  );
}

let queue = routes;
if (forced !== null) queue = [select(routes, forced)];
else if (only !== null) queue = [select(routes, only)];
if (layoutOverride !== null) {
  queue = queue.map((route) => ({ ...route, layout: layoutOverride }));
}

const missing = [];
for (const route of queue) {
  // Author cards composite a real headshot, so there is no prompt to run.
  if (route.kind === "author" && layoutOverride === null) continue;
  if (!route.subject) {
    throw new Error(
      `${route.name}: no art subject. Add one to app/content/og-art.ts.`,
    );
  }
  // `--force` is the only way past artwork that already exists.
  if (forced === null && (await alreadyHasArt(route))) continue;
  missing.push(route);
}

const skipped = queue.length - missing.length;
const calls = missing.length * candidates;
const rates = ratesFor(model);

console.log(
  `Model ${model} at ${imageSize} (in ${formatUsd(rates.input)}/1M, out ${formatUsd(rates.output)}/1M)`,
);
console.log(
  `${missing.length} to generate, ${skipped} already done, ${calls} call(s) at ${candidates} candidate(s) each.\n`,
);

if (!missing.length) {
  console.log("Nothing to do. Use `--force <name>` to replace existing art.");
  process.exit(0);
}
if (dryRun) {
  for (const route of missing) {
    console.log(`  would generate ${route.name} (${route.layout})`);
  }
  console.log(
    `\nDry run — nothing called. Roughly ${formatUsd(calls * 0.134)} at current Pro rates.`,
  );
  process.exit(0);
}

let spent = 0;
let generated = 0;
const failures = [];
let index = 0;

for (const route of missing) {
  for (let candidate = 1; candidate <= candidates; candidate += 1) {
    index += 1;
    try {
      const cost = await generateFor(route, {
        index,
        total: calls,
        candidate: candidates > 1 ? candidate : null,
      });
      spent += cost.usd;
      generated += 1;
      console.log(`        running total ${formatUsd(spent)}`);
    } catch (error) {
      failures.push({ name: route.name, message: error.message });
      console.log(`FAILED — ${error.message}`);
    }
  }
}

const lifetime = await lifetimeSpend();
console.log(`\n${"─".repeat(52)}`);
console.log(`Generated   ${generated}/${calls}`);
console.log(`This run    ${formatUsd(spent)}`);
console.log(
  `Lifetime    ${formatUsd(lifetime)}  (${path.relative(root, ledgerPath)})`,
);

if (failures.length) {
  console.log(`\nFailed (${failures.length}):`);
  for (const failure of failures) {
    console.log(`  ${failure.name}: ${failure.message}`);
  }
}
if (candidates > 1) {
  console.log(
    `\nCandidates are in ${path.relative(root, candidateDirectory)}/.\n` +
      `Promote one with \`pnpm og:pick <name> <n>\`.`,
  );
} else if (generated) {
  console.log(
    `\nRun \`pnpm og\` to composite the new artwork into public/og/.`,
  );
}
process.exitCode = failures.length ? 1 : 0;
