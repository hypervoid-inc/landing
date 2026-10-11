import { TOKENS as T, esc, isConstruct, mark, marked, tile } from "../kit.mjs";

/**
 * Number figures: prices side by side, plans on a shelf, a spreadsheet.
 */

/**
 * Horizontal bars, one per tool, scaled to the largest value.
 *
 *   { kind: "bars", label: "Same 3 people, one month",
 *     rows: [{ name: "ChatGPT Dots", value: 375, text: "$375" }],
 *   `brand` and `icon` on a row work as they do in `plans`.
 *     note: "Construct Starter, no seat fee" }
 */
export function bars({ label, rows, note }) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  const list = rows
    .map((row) => {
      const us = isConstruct(row);
      const width = Math.max(1.5, (row.value / max) * 100);
      return `<div style="display:grid;grid-template-columns:168px minmax(0,1fr) max-content;align-items:center;gap:14px;padding:8px 0">
        <div style="display:flex;align-items:center;gap:10px;font:${us ? 700 : 500} 16px Geist;color:${us ? T.strong : T.ink};white-space:nowrap;overflow:hidden" data-line>${mark(row, 30)}${esc(row.name)}</div>
        <div><div style="height:22px;width:${width}%;border-radius:7px;background:${us ? T.brand : "#cfe6eb"}"></div></div>
        <span style="font:${us ? 700 : 600} 17px Geist;color:${us ? T.strong : T.ink};white-space:nowrap;overflow:hidden;text-align:right" data-line>${esc(row.text)}</span>
      </div>`;
    })
    .join("");
  return {
    html: `<div class="panel" style="width:530px;padding:20px 24px 16px">
      <div class="label" style="margin-bottom:10px">${esc(label)}</div>${list}
      ${note ? `<div style="margin-top:10px;padding-top:12px;border-top:1px solid ${T.soft};font:500 14px Geist;color:${T.muted}">${marked(note)}</div>` : ""}
    </div>`,
  };
}

/**
 * Plans or products side by side, the middle one raised, as on the pricing
 * page. A product name shows its logo; a plan of Construct's sets `brand`
 * to show the mascot, and something that is not a product sets an `icon`.
 *
 *   { kind: "plans", items: [{ name: "Lite", brand: "Construct",
 *     price: "$9", unit: "/mo", line: "2 agents, 3 schedules" }] }
 */
export function plans({ items }) {
  const cards = items
    .map((item, index) => {
      const raised = index === Math.floor(items.length / 2);
      return `<div class="panel" style="flex:1;padding:22px 18px 20px;display:flex;flex-direction:column;gap:12px;${raised ? `transform:translateY(-22px);border-color:#a7e3eb;box-shadow:0 30px 70px -30px rgba(1,143,160,.55)` : ""}">
        ${mark(item, 46, { radius: 13 })}
        <div style="font:650 18px Geist;color:${T.ink};white-space:nowrap;overflow:hidden" data-line>${esc(item.name)}</div>
        <div style="display:flex;align-items:baseline;gap:3px"><span style="font:700 36px/1 Geist;letter-spacing:-.03em;color:${raised ? T.strong : T.ink}">${esc(item.price)}</span><span style="font:500 14px Geist;color:${T.subtle}">${esc(item.unit ?? "")}</span></div>
        <div style="font:400 14.5px/1.4 Geist;color:${T.muted}">${marked(item.line)}</div>
      </div>`;
    })
    .join("");
  return {
    html: `<div style="display:flex;gap:14px;width:540px;align-items:flex-start;padding-top:24px">${cards}</div>`,
  };
}

/**
 * A spreadsheet the agent filled in, with column letters and row numbers.
 *
 *   { kind: "sheet", file: "companies.csv", columns: ["Company", ...],
 *     rows: [["Acme", ...]], highlight: 2 }
 */
export function sheet({ file, columns, rows, highlight }) {
  const grid = `grid-template-columns:34px repeat(${columns.length},minmax(0,1fr))`;
  const letters = `<div style="display:grid;${grid};background:${T.soft};border-bottom:1px solid ${T.line}">${["", ...columns.map((_, i) => String.fromCharCode(65 + i))].map((c) => `<div style="font:500 12px Geist;color:${T.subtle};text-align:center;padding:6px 0;border-right:1px solid ${T.line}">${c}</div>`).join("")}</div>`;
  const cell = (text, i, head) =>
    `<div style="padding:10px 12px;border-right:1px solid ${T.soft};font:${head ? 650 : 450} 15px Geist;color:${head ? T.ink : i === highlight ? T.strong : T.ink};white-space:nowrap;overflow:hidden;text-overflow:clip;${i === highlight && !head ? `background:${T.tint};font-weight:600` : ""}" data-line>${esc(text)}</div>`;
  const line = (cells, n, head) =>
    `<div style="display:grid;${grid};border-bottom:1px solid ${T.soft}"><div style="font:500 12px Geist;color:${T.subtle};text-align:center;padding:11px 0;background:${T.soft};border-right:1px solid ${T.line}">${n}</div>${cells.map((c, i) => cell(c, i, head)).join("")}</div>`;
  return {
    html: `<div class="panel" style="width:540px;overflow:hidden">
      <div style="display:flex;align-items:center;gap:10px;padding:13px 16px">${tile("Construct", 26, { radius: 7 })}<span style="font:600 15px Geist">${esc(file)}</span><span class="label" style="margin-left:auto;font-size:11px">Files</span></div>
      ${letters}${line(columns, 1, true)}${rows.map((r, i) => line(r, i + 2, false)).join("")}
    </div>`,
  };
}

/**
 * One big figure and what it means, for a post built on a single number or
 * a single claim.
 *
 *   { kind: "statement", big: "13.5", unit: "steps", text: "...",
 *     lines: [{ label: "At 99%", value: "69 steps" }] }
 */
export function statement({ big, unit, text, lines = [] }) {
  const rows = lines
    .map(
      (line) =>
        `<div style="display:flex;justify-content:space-between;gap:16px;padding:12px 0;border-top:1px solid ${T.soft};font:500 16px Geist"><span style="color:${T.muted}">${esc(line.label)}</span><span style="font-weight:650;color:${T.ink}">${esc(line.value)}</span></div>`,
    )
    .join("");
  return {
    html: `<div class="panel" style="width:500px;padding:30px 32px 20px">
      <div style="display:flex;align-items:baseline;gap:10px"><span class="fit-x" style="font:700 112px/1 Geist;letter-spacing:-.05em;color:${T.strong};white-space:nowrap;overflow:hidden;max-width:440px">${esc(big)}</span>${unit ? `<span style="font:600 24px Geist;color:${T.muted}">${esc(unit)}</span>` : ""}</div>
      <div style="font:500 19px/1.4 Geist;color:${T.ink};margin:16px 0 18px">${marked(text)}</div>${rows}
    </div>`,
  };
}
