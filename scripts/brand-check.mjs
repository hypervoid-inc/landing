import { stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createServer } from "vite";

/**
 * `pnpm brand:check [folder]`: asks the CDN for every file the brand page
 * links to, every assembled mascot included, and reports what is missing, a
 * different size from the local mirror (when a folder is given), or served
 * without the CORS header the page's downloads need. Run it after an upload,
 * and any time the page's downloads look wrong.
 */

const root = process.cwd();
const folder = process.argv[2] && path.resolve(process.argv[2]);

const vite = await createServer({
  root,
  logLevel: "error",
  server: { middlewareMode: true, watch: null },
  appType: "custom",
});
let brand;
try {
  brand = await vite.ssrLoadModule("/app/content/brand.ts");
} finally {
  await vite.close();
}

const urls = [
  ...brand.brandFiles.map((file) => file.href),
  brand.brandKit.href,
  brand.brandDocument.href,
  ...brand.mascotCombos.map((combo) => brand.mascotHref(combo)),
];

const problems = [];
let checked = 0;
async function check(url) {
  const name = url.slice(brand.BRAND_CDN.length + 1);
  let response;
  try {
    response = await fetch(url, {
      method: "HEAD",
      headers: { Origin: "https://construct.computer" },
    });
  } catch (error) {
    problems.push(`${name}: ${error.message}`);
    return;
  }
  checked += 1;
  if (!response.ok) {
    problems.push(`${name}: HTTP ${response.status}`);
    return;
  }
  if (response.headers.get("access-control-allow-origin") === null) {
    // A cache HIT without the header is a copy stored before CORS was set
    // or from a request without an Origin; a MISS means the origin itself.
    problems.push(
      `${name}: no Access-Control-Allow-Origin header (cache ${response.headers.get("cf-cache-status") ?? "unknown"})`,
    );
  }
  if (folder) {
    const size = Number(response.headers.get("content-length"));
    const local = await stat(path.join(folder, name)).catch(() => null);
    if (local && size && local.size !== size) {
      problems.push(
        `${name}: CDN has ${size} bytes, the mirror has ${local.size}`,
      );
    }
  }
}

// A few hundred requests, forty at a time.
for (let index = 0; index < urls.length; index += 40) {
  await Promise.all(urls.slice(index, index + 40).map(check));
}

if (problems.length) {
  const shown = problems.sort().slice(0, 40);
  console.error(
    `${problems.length} of ${urls.length} files need attention on ${brand.BRAND_CDN}:\n  ${shown.join("\n  ")}${problems.length > shown.length ? `\n  and ${problems.length - shown.length} more` : ""}`,
  );
  process.exit(1);
}
console.log(
  `All ${checked} files are on ${brand.BRAND_CDN} with CORS${folder ? " and match the mirror" : ""}.`,
);
