import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { URL } from "node:url";
import { createServer } from "vite";

import {
  encodeImage,
  renderFrame,
  renderFullBleed,
  renderPortrait,
} from "./og/frame.mjs";
import {
  manifestPath,
  outputDirectory,
  promptsPath,
  readManifest,
  readSources,
  signature,
  sourceDirectory,
} from "./og/manifest.mjs";
import { buildPrompt, promptHeader, referenceImages } from "./og/prompt.mjs";

/**
 * Builds `public/og/` from committed source artwork.
 *
 * Deliberately not part of `pnpm build`: the images are committed artifacts, so
 * they render once on a machine that has the display font rather than slightly
 * differently on every CI runner. `tests/og-images.test.ts` compares the
 * committed manifest against live route data and fails when the two drift,
 * which is what stops an edited title from silently shipping a stale image.
 *
 *   pnpm og                 render every OG image
 *   pnpm og --only <name>   render one
 *   pnpm og:prompts         write assets/og/PROMPTS.md
 *   pnpm og --print <name>  print one prompt to stdout
 */

const root = process.cwd();

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
    const { ogArtSubjects } = await vite.ssrLoadModule(
      "/app/content/og-art.ts",
    );
    return canonicalRoutes.map((route) => {
      const name = ogName(route.path);
      return {
        name,
        kind: route.kind,
        title: routeDisplayTitle(route),
        subject: ogArtSubjects[name],
        // `/og/<stem>.jpg` — the route's own name unless MDX frontmatter named
        // a different image, in which case that name is published instead.
        stem: path.basename(new URL(route.image).pathname, ".jpg"),
        // Author cards use the real headshot rather than generated art.
        photo:
          route.kind === "author" && route.author?.image
            ? path.join(root, "public", route.author.image.replace(/^\//, ""))
            : null,
      };
    });
  } finally {
    await vite.close();
  }
}

/**
 * Writes one image and returns its manifest signature. Resolution order: a
 * finished image in `assets/og/`, then wide artwork with the type set over it,
 * then the branded frame over the fallback Construct plate.
 *
 * The square-tile layout that used to sit between the last two is retired.
 * `renderFrame` survives as the no-artwork fallback and still accepts an
 * `artwork` tile, but nothing feeds it one — see `docs/og-images.md`.
 */
async function renderOne(route) {
  const { custom, full } = await readSources(route.name, route.stem);
  const output = path.join(outputDirectory, `${route.stem}.jpg`);

  // Hand-made cards are re-encoded rather than copied, so every published
  // image shares one format, one colour space, and no alpha channel.
  if (custom) await writeFile(output, await encodeImage(custom));
  else if (route.photo) {
    await writeFile(
      output,
      await renderPortrait({
        title: route.title,
        kind: route.kind,
        photo: route.photo,
      }),
    );
  } else if (full) {
    await writeFile(
      output,
      await renderFullBleed({
        title: route.title,
        kind: route.kind,
        artwork: full,
      }),
    );
  } else if (route.stem !== route.name) {
    // Frontmatter named an image the pipeline cannot produce. Rendering the
    // generated frame here would write to the wrong filename and leave the
    // route pointing at a 404, so fail loudly instead.
    throw new Error(
      `${route.name}: frontmatter image "${route.stem}" not found in ${path.relative(root, sourceDirectory)}/`,
    );
  } else {
    await writeFile(
      output,
      await renderFrame({
        title: route.title,
        kind: route.kind,
        artwork: null,
      }),
    );
  }

  return {
    signature: signature({
      ...route,
      custom,
      full,
      photo: route.photo ? await readFile(route.photo) : null,
    }),
    placeholder: !custom && !full && !route.photo,
  };
}

async function render(routes, all) {
  await mkdir(outputDirectory, { recursive: true });
  const manifest = all ? {} : await readManifest();
  const placeholders = [];

  for (const route of routes) {
    const result = await renderOne(route);
    manifest[route.name] = result.signature;
    if (result.placeholder) placeholders.push(route.name);
  }

  const sorted = Object.fromEntries(Object.entries(manifest).sort());
  await writeFile(manifestPath, `${JSON.stringify(sorted, null, 2)}\n`);

  console.log(`Rendered ${routes.length} image(s) into public/og/`);
  if (placeholders.length) {
    console.log(
      `\nStill on the placeholder plate (${placeholders.length}):\n  ${placeholders.join("\n  ")}\n\n` +
        `Run \`pnpm og:generate\` to make their artwork, then rerun \`pnpm og\`.`,
    );
  }
}

async function writePrompts(routes) {
  const sections = routes.map((route) => {
    if (!route.subject) {
      throw new Error(
        `${route.name}: no art subject. Add one to app/content/og-art.ts.`,
      );
    }
    return `## \`${route.name}\`\n\n${route.title} — ${route.kind}\n\n\`\`\`text\n${buildPrompt(route)}\n\`\`\`\n`;
  });
  await writeFile(promptsPath, `${promptHeader()}\n${sections.join("\n")}`);
  console.log(
    `Wrote ${routes.length} prompts to ${path.relative(root, promptsPath)}`,
  );
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
const printTarget = flag("--print");
const onlyTarget = flag("--only");

if (printTarget !== null) {
  const route = select(routes, printTarget);
  if (!route.subject) throw new Error(`${route.name}: no art subject.`);
  console.log("Attach these references, in order:");
  for (const { file, note } of referenceImages) {
    console.log(`  ${file}\n    ${note}`);
  }
  console.log();
  console.log(buildPrompt(route));
} else if (args.includes("--prompts")) {
  await writePrompts(routes);
} else if (onlyTarget !== null) {
  await render([select(routes, onlyTarget)], false);
} else {
  await render(routes, true);
}
