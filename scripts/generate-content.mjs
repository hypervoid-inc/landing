import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { format } from "prettier";
import { createServer } from "vite";
import { z } from "zod";

const root = process.cwd();
const blogDirectory = path.join(root, "app/content/blog");
const authorIds = ["construct-team", "ankush", "nischal"];

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
    published: date,
    updated: date.optional(),
    seoTitle: z.string().min(1).optional(),
    author: z.enum(authorIds),
    tags: z.array(z.string().min(1)).min(1),
    kind: z.enum(["article", "guide", "comparison"]),
    draft: z.boolean(),
    // Mirrors `ogImageOverride` in app/content/schema.ts.
    image: z
      .string()
      .regex(/^[\w-]+\.(png|jpg|jpeg|webp)$/)
      .optional(),
  })
  .strict()
  .refine(
    ({ published, updated }) => !updated || updated > published,
    "Updated date must be later than publication date",
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
  logLevel: "error",
  server: { middlewareMode: true, watch: null },
  appType: "custom",
});
let crawlerFiles;
try {
  ({ crawlerFiles } = await vite.ssrLoadModule(
    "/app/lib/generated-content.ts",
  ));
} finally {
  await vite.close();
}

for (const [relativePath, content] of Object.entries(crawlerFiles)) {
  const destination = path.join(root, "public", relativePath);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, content);
}

// OG images are committed artifacts built by `pnpm og`, not build output. They
// depend on a display font and on hand-placed artwork, so rendering them per
// build would make the deployed images differ from the reviewed ones.
// `tests/og-images.test.ts` fails the build when they fall out of date.
