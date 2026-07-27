import { Buffer } from "node:buffer";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { URL } from "node:url";
import { format } from "prettier";
import sharp from "sharp";
import { createServer } from "vite";
import { z } from "zod";

const root = process.cwd();
const blogDirectory = path.join(root, "app/content/blog");

const date = z.string().refine((value) => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(parsed.valueOf()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}, "Expected a real YYYY-MM-DD date");

const frontmatterSchema = z
  .object({
    title: z.string().min(1),
    description: z.string().min(1),
    date,
    updated: date.optional(),
    seoTitle: z.string().min(1).optional(),
    author: z.string().min(1),
    tags: z.array(z.string().min(1)).min(1),
    draft: z.boolean(),
  })
  .strict()
  .refine(
    ({ date, updated }) => !updated || updated >= date,
    "Updated date cannot precede publication date",
  );

function parseFrontmatter(source, filename) {
  const match = source.match(/^---\n([\s\S]*?)\n---/);
  if (!match) throw new Error(`${filename}: missing frontmatter`);
  const values = {};
  for (const line of match[1].split("\n")) {
    const separator = line.indexOf(":");
    if (separator < 1)
      throw new Error(`${filename}: malformed frontmatter line`);
    const key = line.slice(0, separator);
    if (Object.hasOwn(values, key))
      throw new Error(`${filename}: duplicate ${key}`);
    values[key] = JSON.parse(line.slice(separator + 1).trim());
  }
  return frontmatterSchema.parse(values);
}

const files = (await readdir(blogDirectory))
  .filter((name) => name.endsWith(".mdx"))
  .sort();
const posts = await Promise.all(
  files.map(async (filename) => ({
    slug: filename.slice(0, -4),
    ...parseFrontmatter(
      await readFile(path.join(blogDirectory, filename), "utf8"),
      filename,
    ),
  })),
);

const metadataSource = await format(
  `// Generated from the MDX frontmatter by scripts/generate-content.mjs.\nimport type { BlogFrontmatter } from "../schema";\n\nexport const blogMetadata: readonly ({ slug: string } & BlogFrontmatter)[] = ${JSON.stringify(posts, null, 2)};\n`,
  { parser: "typescript" },
);
await writeFile(
  path.join(blogDirectory, "metadata.generated.ts"),
  metadataSource,
);

const vite = await createServer({
  root,
  server: { middlewareMode: true },
  appType: "custom",
});
try {
  const { crawlerFiles } = await vite.ssrLoadModule(
    "/app/lib/generated-content.ts",
  );
  const { canonicalRoutes } = await vite.ssrLoadModule(
    "/app/lib/route-manifest.ts",
  );

  for (const [relativePath, content] of Object.entries(crawlerFiles)) {
    const destination = path.join(root, "public", relativePath);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, content);
  }

  const ogDirectory = path.join(root, "public/og");
  await rm(ogDirectory, { force: true, recursive: true });
  await mkdir(ogDirectory, { recursive: true });
  for (const route of canonicalRoutes) {
    const filename = new URL(route.image).pathname.split("/").at(-1);
    const title = wrapTitle(route.title.replace(" - Construct Computer", ""));
    const lines = title
      .map(
        (line, index) =>
          `<tspan x="80" dy="${index === 0 ? 0 : 72}">${escapeHtml(line)}</tspan>`,
      )
      .join("");
    const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg"><rect width="1200" height="630" fill="#f8fbfb"/><circle cx="1060" cy="90" r="230" fill="#d9f6f5"/><text x="80" y="120" font-family="Arial, sans-serif" font-size="34" font-style="italic" fill="#4e4646">Construct<tspan fill="#01b4c8">Computer</tspan></text><text x="80" y="270" font-family="Arial, sans-serif" font-size="62" font-style="italic" fill="#4e4646">${lines}</text><text x="80" y="555" font-family="Arial, sans-serif" font-size="24" fill="#627c86">construct.computer</text></svg>`;
    await sharp(Buffer.from(svg))
      .png()
      .toFile(path.join(ogDirectory, filename));
  }
} finally {
  await vite.close();
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function wrapTitle(value) {
  const lines = [];
  for (const word of value.split(" ")) {
    const last = lines.at(-1);
    if (!last || `${last} ${word}`.length > 31) lines.push(word);
    else lines[lines.length - 1] = `${last} ${word}`;
  }
  return lines.slice(0, 3);
}
