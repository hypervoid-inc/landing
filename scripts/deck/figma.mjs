/**
 * Reading the investor deck out of Figma over the REST API, for
 * `pnpm deck:sync`. The parsing is pure and tested (tests/deck-sync.test.ts);
 * only `figmaGet` and `download` touch the network.
 */
import { Buffer } from "node:buffer";
import { URLSearchParams } from "node:url";

export const FIGMA_API = "https://api.figma.com";

/** One request to the Figma API, failing with Figma's own explanation. A rate limit is waited out once. */
async function figmaGet(api, path, token, retried = false) {
  const response = await fetch(`${api}${path}`, { headers: { "X-Figma-Token": token } });
  if (response.status === 429 && !retried) {
    const wait = Math.min(60, Number(response.headers.get("retry-after")) || 10);
    console.log(`Figma asked to slow down; trying again in ${wait}s...`);
    await new Promise((resolve) => setTimeout(resolve, wait * 1000));
    return figmaGet(api, path, token, true);
  }
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.err || body?.error === true) {
    const reason = body?.err ?? body?.message ?? response.statusText;
    if (response.status === 403) {
      throw new Error(`Figma refused the token (${reason}). It needs the file_content:read scope and access to this file.`);
    }
    if (response.status === 404) throw new Error(`Figma has no file at ${path} (${reason}).`);
    throw new Error(`Figma ${response.status} for ${path}: ${reason}`);
  }
  return body;
}

export function fetchDeckFile({ api = FIGMA_API, fileKey, token }) {
  return figmaGet(api, `/v1/files/${encodeURIComponent(fileKey)}`, token);
}

/** Temporary URLs for each slide rendered as PNG at 2x. */
export async function exportUrls({ api = FIGMA_API, fileKey, token, ids }) {
  const query = new URLSearchParams({ ids: ids.join(","), format: "png", scale: "2" });
  const body = await figmaGet(api, `/v1/images/${encodeURIComponent(fileKey)}?${query}`, token);
  const missing = ids.filter((id) => !body.images?.[id]);
  if (missing.length) throw new Error(`Figma rendered no image for slide ${missing.join(", ")}.`);
  return body.images;
}

export async function download(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Downloading a slide image failed: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

/**
 * The slides in deck order, each with its text in reading order, its links
 * and its embedded videos, positioned relative to the slide.
 */
export function slidesFromFile(file) {
  const slides = [];
  const visit = (node) => {
    if (!node || node.visible === false) return;
    if (node.type === "SLIDE") {
      slides.push(readSlide(node));
      return;
    }
    for (const child of node.children ?? []) visit(child);
  };
  visit(file?.document);
  if (slides.length === 0) {
    throw new Error(
      `No slides in this file${file?.editorType ? ` (a ${file.editorType} file)` : ""}. ` +
        "deck:sync reads a Figma Slides file.",
    );
  }
  return slides;
}

function readSlide(slide) {
  const origin = slide.absoluteBoundingBox ?? { x: 0, y: 0, width: 1920, height: 1080 };
  const at = (node) => {
    const box = node.absoluteBoundingBox ?? { x: origin.x, y: origin.y, width: 0, height: 0 };
    return {
      x: Math.round(box.x - origin.x),
      y: Math.round(box.y - origin.y),
      w: Math.round(box.width),
      h: Math.round(box.height),
    };
  };
  const texts = [];
  const embeds = [];
  const visit = (node) => {
    if (!node || node.visible === false) return;
    if (node.type === "TEXT" && typeof node.characters === "string") {
      const url = node.style?.hyperlink?.type === "URL" ? node.style.hyperlink.url : undefined;
      texts.push({ text: node.characters, box: at(node), ...(url ? { url } : {}) });
    } else if (node.type === "INTERACTIVE_SLIDE_ELEMENT") {
      embeds.push({ box: at(node) });
    }
    for (const child of node.children ?? []) visit(child);
  };
  for (const child of slide.children ?? []) visit(child);
  // Reading order: top to bottom, left to right within a line.
  texts.sort((a, b) => (Math.abs(a.box.y - b.box.y) < 20 ? a.box.x - b.box.x : a.box.y - b.box.y));
  embeds.sort((a, b) => a.box.x - b.box.x || a.box.y - b.box.y);
  return { id: slide.id, name: slide.name, width: Math.round(origin.width), height: Math.round(origin.height), texts, embeds };
}

const tidy = (text) => text.replace(/\s+/g, " ").trim();

/** Slide furniture that reads as noise aloud: the page number and the logo's wordmark. */
const isFurniture = (text) => /^\d{1,2}$/.test(text) || text === "Construct";

/** The slide's words for screen readers and anyone without the images. */
export function altText(texts) {
  return texts
    .map((entry) => tidy(entry.text))
    .filter((text) => text && !isFurniture(text))
    .map((text) => (/[.!?:]$/.test(text) ? text : `${text}.`))
    .join(" ");
}

/**
 * A short name for a slide nobody has titled yet: its section label, the
 * small capitals above the headline ("WHY NOW" becomes "Why now").
 */
export function labelOf(texts) {
  const label = texts.map((entry) => tidy(entry.text)).find((text) => /^[A-Z][A-Z &]{2,23}$/.test(text));
  if (!label) return null;
  return label.charAt(0) + label.slice(1).toLowerCase();
}

/** "$450K" as a number, for comparing amounts. */
function amount(text) {
  const match = /^\$(\d+(?:\.\d+)?)([KM])$/.exec(text);
  if (!match) return null;
  return Number(match[1]) * (match[2] === "M" ? 1_000_000 : 1_000);
}

/** The round size, the largest amount on the slide that says "raising"; null if there's no such slide. */
export function raiseOf(slides) {
  for (const slide of slides) {
    const texts = slide.texts.map((entry) => tidy(entry.text));
    if (!texts.some((text) => /\braising\b/i.test(text))) continue;
    const amounts = texts.filter((text) => amount(text) !== null);
    if (amounts.length) return amounts.reduce((best, text) => (amount(text) > amount(best) ? text : best));
  }
  return null;
}

/** YouTube video ids a slide links to. */
export function youtubeIdsOf(texts) {
  return texts
    .map((entry) => (entry.url ? /(?:youtu\.be\/|[?&]v=)([A-Za-z0-9_-]{11})/.exec(entry.url)?.[1] : undefined))
    .filter(Boolean);
}

/**
 * The words that changed from `before` to `after`, as [-old-] {+new+} with a
 * few words either side, the unchanged stretches between cut to "...".
 */
export function wordDiff(before, after) {
  const a = before.split(/\s+/).filter(Boolean);
  const b = after.split(/\s+/).filter(Boolean);
  const common = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      common[i][j] = a[i] === b[j] ? common[i + 1][j + 1] + 1 : Math.max(common[i + 1][j], common[i][j + 1]);
    }
  }
  const runs = [];
  const push = (kind, word) => {
    const last = runs.at(-1);
    if (last?.kind === kind) last.words.push(word);
    else runs.push({ kind, words: [word] });
  };
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      push("=", a[i++]);
      j++;
    } else if (j < b.length && (i >= a.length || common[i][j + 1] > common[i + 1][j])) {
      push("+", b[j++]);
    } else {
      push("-", a[i++]);
    }
  }
  const context = 3;
  return runs
    .map((run, index) => {
      if (run.kind === "-") return `[-${run.words.join(" ")}-]`;
      if (run.kind === "+") return `{+${run.words.join(" ")}+}`;
      // Unchanged words: only the few beside a change are worth showing.
      const { words } = run;
      const first = index === 0;
      const last = index === runs.length - 1;
      if (first && words.length > context) return ["...", ...words.slice(-context)].join(" ");
      if (last && words.length > context) return [...words.slice(0, context), "..."].join(" ");
      if (!first && !last && words.length > context * 2) {
        return [...words.slice(0, context), "...", ...words.slice(-context)].join(" ");
      }
      return words.join(" ");
    })
    .join(" ");
}

/** What changed between the deck the site shows and the one in Figma. */
export function compareDecks(previous, next) {
  const before = new Map(previous.map((slide, index) => [slide.id, { ...slide, index }]));
  const after = new Map(next.map((slide, index) => [slide.id, { ...slide, index }]));
  const added = next.filter((slide) => !before.has(slide.id)).map((slide) => slide.id);
  const removed = previous.filter((slide) => !after.has(slide.id)).map((slide) => slide.id);
  const kept = next.filter((slide) => before.has(slide.id));
  const reordered = kept.some((slide, index) => {
    const order = previous.filter((old) => after.has(old.id));
    return order[index]?.id !== slide.id;
  });
  const textChanged = kept.filter((slide) => before.get(slide.id).text !== slide.text).map((slide) => slide.id);
  return { added, removed, reordered, textChanged };
}
