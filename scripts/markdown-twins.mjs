/**
 * Writes the Markdown twin of every page in the sitemap (see
 * `shared/markdown-twin.ts`), converted from the prerendered page so it can
 * never drift from what the page says. What is kept is what a screen reader
 * announces on the desktop layout: `<main>` only, without hidden or decorative
 * elements and without the mobile copies of things the desktop layout shows
 * elsewhere. A page with a Markdown version written by hand keeps it.
 */
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import rehypeParse from "rehype-parse";
import rehypeRemark from "rehype-remark";
import remarkGfm from "remark-gfm";
import remarkStringify from "remark-stringify";
import { unified } from "unified";

import { twinPath } from "../shared/markdown-twin.ts";

const dropped = new Set([
  "script",
  "style",
  "svg",
  "template",
  "noscript",
  "iframe",
  "video",
  "audio",
  "canvas",
  "form",
  "input",
  "select",
  "textarea",
  "dialog",
  // In-page navigation (breadcrumbs, a table of contents) repeats the page.
  "nav",
]);

const breakpoint = /^(sm|md|lg|xl|2xl):/;
const display =
  /^(block|flex|grid|inline|inline-block|inline-flex|table|contents)$/;

function classes(node) {
  const value = node.properties?.className;
  return Array.isArray(value) ? value.map(String) : [];
}

/**
 * Tailwind's `hidden` with a breakpoint display shows from that breakpoint
 * up, so the desktop layout has it; `md:hidden` and its kin are mobile only.
 */
function hiddenOnDesktop(node) {
  const list = classes(node);
  if (list.some((name) => /^(md|lg|xl):hidden$/.test(name))) return true;
  if (!list.includes("hidden")) return false;
  return !list.some(
    (name) =>
      breakpoint.test(name) && display.test(name.replace(breakpoint, "")),
  );
}

function isSilent(node) {
  const { properties = {} } = node;
  return (
    dropped.has(node.tagName) ||
    // A collapsed disclosure, such as an FAQ answer, is still the page's text.
    (properties.hidden !== undefined && properties.dataState !== "closed") ||
    // Tabs name the panels that follow, which carry their own headings.
    properties.role === "tablist" ||
    properties.inert !== undefined ||
    String(properties.ariaHidden) === "true" ||
    (node.tagName === "img" && !properties.alt) ||
    hiddenOnDesktop(node)
  );
}

function absolute(value, base) {
  try {
    return new URL(value, base).href;
  } catch {
    return value;
  }
}

const wordEnd = /[\p{L}\p{N}\p{Extended_Pictographic}.!?)]$/u;
const wordStart = /^[\p{L}\p{N}@#(]/u;

/**
 * Flex and grid children sit apart on screen with no space between them in
 * the markup, so "Monthly" and "Annual" would read as "MonthlyAnnual".
 */
function spaceApart(children) {
  return children.flatMap((child, index) => {
    const previous = children[index - 1];
    const joined =
      previous &&
      (previous.type === "element" || child.type === "element") &&
      wordEnd.test(text(previous)) &&
      wordStart.test(text(child));
    return joined ? [{ type: "text", value: " " }, child] : [child];
  });
}

function prune(node, base) {
  if (!node.children) return;
  node.children = node.children.filter(
    (child) =>
      child.type === "text" || (child.type === "element" && !isSilent(child)),
  );
  for (const child of node.children) {
    if (child.type !== "element") continue;
    const { properties } = child;
    // An icon link or button is named by its label, not by what it draws.
    if (
      (child.tagName === "a" || child.tagName === "button") &&
      typeof properties.ariaLabel === "string"
    ) {
      child.children = [{ type: "text", value: properties.ariaLabel }];
    }
    for (const key of ["href", "src"]) {
      if (typeof properties[key] === "string")
        properties[key] = absolute(properties[key], base);
    }
    prune(child, base);
  }
  node.children = spaceApart(node.children);
}

function find(node, test) {
  if (node.type === "element" && test(node)) return node;
  for (const child of node.children ?? []) {
    const found = find(child, test);
    if (found) return found;
  }
  return undefined;
}

function text(node) {
  if (!node) return "";
  if (node.type === "text") return node.value;
  return (node.children ?? []).map(text).join("");
}

function meta(head, name) {
  return find(
    head,
    (node) => node.tagName === "meta" && node.properties.name === name,
  )?.properties.content;
}

function yamlString(value) {
  return JSON.stringify(value.replaceAll(/\s+/g, " ").trim());
}

/** The page's `<main>` as Markdown, under its title, description and URL. */
export function pageToMarkdown(html, url) {
  const tree = unified().use(rehypeParse).parse(html);
  const head = find(tree, (node) => node.tagName === "head") ?? tree;
  const main = find(tree, (node) => node.tagName === "main");
  if (!main) throw new Error(`${url}: no <main> to convert`);
  prune(main, url);

  const processor = unified()
    .use(rehypeRemark)
    .use(remarkGfm)
    .use(remarkStringify, { bullet: "-", emphasis: "*", rule: "-" });
  const body = processor
    .stringify(processor.runSync({ type: "root", children: [main] }))
    .replaceAll(/\n{3,}/g, "\n\n")
    .trim();

  const title = text(find(head, (node) => node.tagName === "title"));
  const description = meta(head, "description");
  return [
    "---",
    `title: ${yamlString(title)}`,
    ...(description ? [`description: ${yamlString(description)}`] : []),
    `url: ${url}`,
    "---",
    "",
    body,
    "",
  ].join("\n");
}

async function exists(file) {
  return access(file).then(
    () => true,
    () => false,
  );
}

/** Writes a twin beside every page in the built sitemap. */
export async function writeTwins(output) {
  const sitemap = await readFile(path.join(output, "sitemap.xml"), "utf8");
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    ([, loc]) => loc,
  );
  let written = 0;
  for (const url of urls) {
    const { pathname } = new URL(url);
    const twin = path.join(output, twinPath(pathname));
    if (await exists(twin)) continue;
    const html = await readFile(
      path.join(output, pathname, "index.html"),
      "utf8",
    );
    await writeFile(twin, pageToMarkdown(html, url));
    written += 1;
  }
  return written;
}
