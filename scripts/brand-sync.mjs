import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { Buffer } from "node:buffer";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";
import { createServer } from "vite";

import { buildBrandKit } from "./brand-kit.mjs";
import { buildBrandPdf } from "./brand-pdf.mjs";

/**
 * `pnpm brand <folder>`: the one step after changing a brand file (after
 * `pnpm brand:art <folder>` when a source mark or the channel art changed).
 *
 * `<folder>` is the local copy of `cdn.construct.computer/brand/`, the
 * full-size files by their published names plus `mascot/` (the agent-avatar
 * 1024 tier). This checks it against `app/content/brand.ts`, rebuilds
 * everything the repo keeps in `public/brand/` (a WebP thumbnail per raster
 * under the same stem, the SVGs as they are, each linked video's YouTube
 * thumbnail), prints the PDF from the same
 * content, and writes the kit zip into the folder. Upload the folder to the
 * CDN and commit `public/brand/`.
 */

const root = process.cwd();
const folder = process.argv[2] && path.resolve(process.argv[2]);
if (!folder) {
  console.error(
    "Usage: pnpm brand <folder mirrored to cdn.construct.computer/brand/>",
  );
  process.exit(1);
}
const output = path.join(root, "public/brand");
/** Thumbnails never need more: the widest card on the page is about 560px. */
const THUMB_PX = 720;

const vite = await createServer({
  root,
  logLevel: "error",
  server: { middlewareMode: true, watch: null },
  appType: "custom",
});
let brand;
let catalog;
let siteUrl;
try {
  brand = await vite.ssrLoadModule("/app/content/brand.ts");
  const generated = await vite.ssrLoadModule("/app/lib/generated-content.ts");
  catalog = `${JSON.stringify(generated.brandCatalog(), null, 2)}\n`;
  ({ siteUrl } = await vite.ssrLoadModule("/app/lib/route-manifest.ts"));
} finally {
  await vite.close();
}

async function size(file, format) {
  if (format !== "SVG") return sharp(file).metadata();
  const tag = (await readFile(file, "utf8")).match(/<svg[^>]*>/)?.[0] ?? "";
  const attr = (name) =>
    Math.round(Number(tag.match(new RegExp(`\\s${name}="([\\d.]+)"`))?.[1]));
  return { width: attr("width"), height: attr("height") };
}

// 1. Everything listed is present, at the size the page states.
const problems = [];
for (const group of brand.brandGroups) {
  for (const asset of group.assets) {
    for (const file of asset.files) {
      const source = path.join(folder, path.basename(file.href));
      const actual = await size(source, file.format).catch(() => null);
      if (!actual) problems.push(`missing ${path.basename(file.href)}`);
      else if (actual.width !== file.width || actual.height !== file.height) {
        problems.push(
          `${path.basename(file.href)} is ${actual.width}x${actual.height}, brand.ts says ${file.width}x${file.height}`,
        );
      }
    }
  }
}
for (const combo of brand.mascotCombos) {
  const name = path.join("mascot", `${combo.stem}.png`);
  const actual = await sharp(path.join(folder, name))
    .metadata()
    .catch(() => null);
  if (!actual) problems.push(`missing ${name}, run pnpm brand:art`);
  else if (actual.width !== brand.MASCOT_PX) {
    problems.push(`${name} is ${actual.width}px wide, not ${brand.MASCOT_PX}`);
  }
}
if (problems.length) {
  console.error(
    `${folder} does not match app/content/brand.ts:\n  ${problems.join("\n  ")}`,
  );
  process.exit(1);
}
// Anything else in the folder would go to the CDN unlisted; say so.
const listed = new Set([
  ...brand.brandFiles.map((file) => path.basename(file.href)),
  brand.brandDocument.filename,
  brand.brandKit.filename,
]);
const strays = (await readdir(folder)).filter(
  (name) => name !== "mascot" && !name.startsWith(".") && !listed.has(name),
);
if (strays.length) console.warn(`Not listed in brand.ts: ${strays.join(", ")}`);

// 2. The repo's copies, every one rewritten so nothing stale survives.
// Written in place, stale files removed afterwards: a dev server watching
// the folder would otherwise serve nothing for a moment and a page open in
// a browser would keep the empty result until a reload.
const kept = new Set();
const keep = (target) => {
  kept.add(path.relative(output, target));
  return target;
};
await mkdir(path.join(output, "mascot"), { recursive: true });
for (const group of brand.brandGroups) {
  for (const asset of group.assets) {
    const target = keep(path.join(root, "public", asset.preview));
    const source = path.join(folder, path.basename(asset.files[0].href));
    if (asset.preview.endsWith(".svg")) await copyFile(source, target);
    else {
      await sharp(source)
        .resize({ width: THUMB_PX, withoutEnlargement: true })
        .webp({ quality: 80, alphaQuality: 90, effort: 6 })
        .toFile(target);
    }
  }
}
// The maker's previews, one per assembled mascot, from the CDN's PNGs.
for (const combo of brand.mascotCombos) {
  await sharp(path.join(folder, "mascot", `${combo.stem}.png`))
    .resize(brand.MASCOT_PREVIEW_PX)
    .webp({ quality: 85, alphaQuality: 90, effort: 6 })
    .toFile(keep(path.join(root, "public", brand.mascotPreview(combo))));
}

// YouTube's own thumbnails, so the page shows what the video shows there.
for (const video of brand.brandVideos) {
  const response = await fetch(
    `https://i.ytimg.com/vi/${video.youtubeId}/maxresdefault.jpg`,
  );
  if (!response.ok) {
    console.error(
      `No thumbnail for ${video.youtubeId}: HTTP ${response.status}`,
    );
    process.exit(1);
  }
  await sharp(Buffer.from(await response.arrayBuffer()))
    .resize({ width: THUMB_PX, withoutEnlargement: true })
    .webp({ quality: 80, effort: 6 })
    .toFile(keep(path.join(root, "public", video.preview)));
}
for (const entry of await readdir(output, {
  recursive: true,
  withFileTypes: true,
})) {
  if (!entry.isFile() || entry.name === "brand.json") continue;
  const file = path.join(entry.parentPath, entry.name);
  if (!kept.has(path.relative(output, file))) await rm(file);
}

// 3. The PDF, from the same content and the thumbnails just written.
await buildBrandPdf(folder, brand, { root, publicDir: output, siteUrl });

// 4. The kit, beside the files it holds.
await writeFile(
  path.join(folder, brand.brandKit.filename),
  await buildBrandKit(folder, brand, catalog),
);

console.log(
  `Checked ${folder}, wrote the PDF and the kit there and the thumbnails to public/brand/.`,
);
