import { TOKENS as T, esc, marked, tile } from "../kit.mjs";

/**
 * Comparison figures: one rival head to head, or a field of them scored.
 * Every tool appears as its own logo, found by name.
 */

/**
 * Construct and one rival as app tiles, with the facts that decide it.
 *
 *   { kind: "versus", rival: "Lindy",
 *     rows: [{ label: "Price", us: "$9 a month", them: "$29.99 per user" }] }
 */
export function versus({ rival, rows }) {
  const head = (name) =>
    `<div style="display:flex;flex-direction:column;align-items:center;gap:12px">${tile(name, 112)}<div style="font:600 19px Geist">${esc(name)}</div></div>`;
  const body = rows
    .map(
      (row, i) => `
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;align-items:center;padding:15px 22px;${i ? `border-top:1px solid ${T.soft}` : ""}">
        <div class="label" style="letter-spacing:.1em">${esc(row.label)}</div>
        <div style="font:700 20px Geist;color:${T.strong};text-align:center">${marked(row.us)}</div>
        <div style="font:500 20px Geist;color:${T.ink};text-align:center">${marked(row.them)}</div>
      </div>`,
    )
    .join("");
  return {
    html: `<div style="display:flex;flex-direction:column;gap:26px;width:500px">
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;align-items:center">
        <div></div>${head("Construct")}${head(rival)}
      </div>
      <div style="position:absolute;left:50%;top:0"></div>
      <div class="panel" style="overflow:hidden">${body}</div>
    </div>`,
  };
}

/** A score from 0 to 4 as a filled, half, or empty dot. */
function dot(score) {
  if (score >= 3)
    return `<span style="width:18px;height:18px;border-radius:50%;background:${T.brand};display:inline-block"></span>`;
  if (score >= 1)
    return `<span style="width:18px;height:18px;border-radius:50%;border:2px solid ${T.brand};background:linear-gradient(90deg,${T.brand} 50%,transparent 50%);display:inline-block"></span>`;
  return `<span style="width:18px;height:18px;border-radius:50%;border:2px solid ${T.line};display:inline-block"></span>`;
}

/**
 * A field of tools scored on a few criteria, each with its logo and price.
 *
 *   { kind: "matrix", columns: ["No seats", ...],
 *     rows: [{ name: "Lindy", scores: [0, 2, 3], price: "$29.99" }] }
 */
export function matrix({ columns, rows }) {
  const grid = `grid-template-columns:1.5fr repeat(${columns.length},.9fr) .9fr`;
  const header = `<div style="display:grid;${grid};align-items:end;padding:16px 20px 12px">
    <div></div>${columns.map((c) => `<div class="label" style="text-align:center;font-size:12px;letter-spacing:.08em;line-height:1.25">${esc(c)}</div>`).join("")}
    <div class="label" style="text-align:right;font-size:12px;letter-spacing:.08em">Price</div></div>`;
  const body = rows
    .map((row) => {
      const us = row.name === "Construct";
      return `<div style="display:grid;${grid};align-items:center;padding:9px 20px;border-top:1px solid ${T.soft};${us ? `background:${T.tint}` : ""}">
        <div style="display:flex;align-items:center;gap:11px;font:${us ? 700 : 500} 17px Geist;color:${us ? T.strong : T.ink}">${tile(row.name, 32)}${esc(row.name)}</div>
        ${row.scores.map((s) => `<div style="text-align:center;line-height:0">${dot(s)}</div>`).join("")}
        <div style="text-align:right;font:${us ? 700 : 500} 16px Geist;color:${us ? T.strong : T.muted}">${esc(row.price)}</div>
      </div>`;
    })
    .join("");
  return {
    html: `<div class="panel" style="width:530px;overflow:hidden">${header}${body}</div>`,
  };
}
