import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as Hugeicons from "@hugeicons/core-free-icons";

import { logoFile, logoFor } from "./logos.mjs";

/**
 * The parts every card figure is built from: the site's tokens, its icons,
 * the brand logos, and the mascot. Figures are HTML in the site's own UI
 * language, so a card looks like a piece of the product, not a picture of one.
 */

const root = fileURLToPath(new URL("../../../", import.meta.url));
const require = createRequire(import.meta.url);

/** `app/app.css` tokens, by the same names. */
export const TOKENS = {
  ink: "#4e4646",
  muted: "#627c86",
  subtle: "#8a9aa2",
  line: "#dcecef",
  soft: "#eff3f5",
  canvas: "#f7fbfc",
  surface: "#ffffff",
  brand: "#01b4c8",
  strong: "#018fa0",
  tint: "#effbfc",
  danger: "#b42318",
  positive: "#067647",
};

export function esc(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** `*words*` in a field are set in the brand colour, as on the homepage. */
export function marked(text) {
  return esc(text).replace(/\*([^*]+)\*/g, '<em class="hl">$1</em>');
}

const cache = new Map();
function dataUri(file, type) {
  if (!cache.has(file)) {
    cache.set(
      file,
      `data:${type};base64,${readFileSync(file).toString("base64")}`,
    );
  }
  return cache.get(file);
}

export const mascotUri = () =>
  dataUri(path.join(root, "public/icon-512.png"), "image/png");

export function fontUri(name) {
  const file = require.resolve(`@fontsource-variable/geist/files/${name}`);
  return dataUri(file, "font/woff2");
}

/** A brand's logo by product name, or null when the library has none. */
export function logoUri(name) {
  if (name === "Construct") return mascotUri();
  const key = logoFor(name);
  return key ? dataUri(logoFile(key), "image/png") : null;
}

/**
 * A square app tile: the brand's logo on white, or its initial when the
 * library has no mark, so a tool is never shown with someone else's logo.
 */
export function tile(name, size = 56, { radius = size * 0.26 } = {}) {
  const uri = logoUri(name);
  const inner = uri
    ? `<img src="${uri}" style="width:${Math.round(size * (name === "Construct" ? 0.86 : 0.62))}px;height:auto">`
    : `<span style="font:600 ${Math.round(size * 0.42)}px Geist;color:${TOKENS.muted}">${esc(name[0])}</span>`;
  return `<span class="tile" style="width:${size}px;height:${size}px;border-radius:${radius}px">${inner}</span>`;
}

/** A Hugeicons stroke icon by name, e.g. `icon("ComputerTerminal01", 20)`. */
export function icon(name, size = 20, color = "currentColor", stroke = 1.6) {
  const data = Hugeicons[`${name}Icon`];
  if (!data) throw new Error(`No Hugeicons icon called ${name}`);
  const parts = data
    .map(([tag, attrs]) => {
      const out = Object.entries(attrs)
        .filter(([key]) => key !== "key")
        .map(([key, value]) => {
          const name = key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
          let v = value === "currentColor" ? color : value;
          if (key === "strokeWidth") v = stroke;
          return `${name}="${esc(v)}"`;
        })
        .join(" ");
      return `<${tag} ${out}/>`;
    })
    .join("");
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" style="flex:none">${parts}</svg>`;
}

/**
 * A row's mark: a Hugeicons `icon` for something that is not a product (a
 * virtual assistant, a person), otherwise the logo of its `brand`, or of the
 * row's own name.
 */
export function mark(row, size, options) {
  if (row.icon) {
    return `<span class="tile" style="width:${size}px;height:${size}px;border-radius:${Math.round(size * 0.26)}px">${icon(row.icon, Math.round(size * 0.55), TOKENS.strong)}</span>`;
  }
  return tile(row.brand ?? row.name, size, options);
}

/** Whether a row is one of Construct's own, so it is set in the brand colour. */
export const isConstruct = (row) => (row.brand ?? row.name) === "Construct";
