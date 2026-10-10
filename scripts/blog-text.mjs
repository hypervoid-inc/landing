/**
 * Writes a blog post as plain Markdown, ready to paste into another platform.
 *
 *   pnpm blog:text [slug] [--source medium]
 *
 * Without a slug it shows the live posts, newest first, as a menu: arrow keys
 * to move, Enter to pick.
 * The site's own components are removed or rewritten, links back to the site
 * are made absolute, and `--source` names the platform in their UTM tags. The
 * file lands in `syndication/<slug>.md`, which is not committed. Set the
 * platform's canonical link to the post's URL where it offers one.
 */
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  clearScreenDown,
  cursorTo,
  emitKeypressEvents,
  moveCursor,
} from "node:readline";
import { parseArgs } from "node:util";

import { canonicalUrl, parsePost, toMarkdown } from "./syndicate/transform.mjs";

const root = process.cwd();
const blogDirectory = path.join(root, "app/content/blog");
const today = new Date().toISOString().slice(0, 10);

const { values: options, positionals } = parseArgs({
  allowPositionals: true,
  options: { source: { type: "string", default: "syndication" } },
});

const posts = await Promise.all(
  (await readdir(blogDirectory))
    .filter((name) => name.endsWith(".mdx"))
    .map(async (filename) => ({
      slug: filename.slice(0, -4),
      ...parsePost(await readFile(path.join(blogDirectory, filename), "utf8")),
    })),
);

const live = posts
  .filter(
    ({ frontmatter }) => !frontmatter.draft && frontmatter.published <= today,
  )
  .sort((left, right) =>
    right.frontmatter.published.localeCompare(left.frontmatter.published),
  );

function fail(message) {
  console.error(message);
  process.exit(1);
}

/** An arrow-key menu over the live posts; resolves to the chosen slug. */
function choose() {
  const { stdin, stdout } = process;
  if (!stdin.isTTY) fail("Usage: pnpm blog:text <slug> [--source medium]");
  // One row per post and never wider than the terminal: a wrapped row would
  // throw off the count of lines to move back up on each redraw.
  const rows = live.map(({ slug, frontmatter }) =>
    `${frontmatter.published}  ${frontmatter.kind.padEnd(10)}  ${slug}`.slice(
      0,
      (stdout.columns || 80) - 3,
    ),
  );
  const height = Math.min(rows.length, Math.max(3, (stdout.rows || 24) - 2));
  let selected = 0;
  let top = 0;

  const draw = () => {
    top = Math.min(Math.max(top, selected - height + 1), selected);
    stdout.write(
      rows
        .slice(top, top + height)
        .map((row, index) =>
          top + index === selected ? `\x1b[7m> ${row}\x1b[0m` : `  ${row}`,
        )
        .join("\n") + "\n",
    );
  };
  const erase = () => {
    moveCursor(stdout, 0, -height);
    cursorTo(stdout, 0);
    clearScreenDown(stdout);
  };

  return new Promise((resolve) => {
    const finish = (slug) => {
      erase();
      stdout.write("\x1b[?25h");
      stdin.setRawMode(false);
      stdin.pause();
      stdin.off("keypress", onKey);
      if (slug === undefined) process.exit(1);
      resolve(slug);
    };
    const onKey = (_, key) => {
      if (key.name === "return") return finish(live[selected].slug);
      if (key.name === "escape" || key.name === "q") return finish();
      if (key.ctrl && (key.name === "c" || key.name === "d")) return finish();
      if (key.name === "up" || key.name === "k") selected -= 1;
      else if (key.name === "down" || key.name === "j") selected += 1;
      else return;
      selected = Math.min(Math.max(selected, 0), rows.length - 1);
      erase();
      draw();
    };

    console.log(
      "Pick a post: up and down to move, Enter to choose, q to quit.",
    );
    stdout.write("\x1b[?25l");
    emitKeypressEvents(stdin);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on("keypress", onKey);
    draw();
  });
}

const slug = positionals[0] ?? (await choose());
const post = posts.find((candidate) => candidate.slug === slug);
if (!post) fail(`No post named "${slug}" in app/content/blog/.`);

const titles = Object.fromEntries(
  live.map((candidate) => [candidate.slug, candidate.frontmatter.title]),
);
const markdown = toMarkdown(post.body, {
  slug,
  utmSource: options.source,
  titles,
});

const file = path.join(root, "syndication", `${slug}.md`);
await mkdir(path.dirname(file), { recursive: true });
await writeFile(file, `# ${post.frontmatter.title}\n\n${markdown}\n`);
console.log(`Wrote ${path.relative(root, file)}`);
console.log(`Canonical link: ${canonicalUrl(slug)}`);
