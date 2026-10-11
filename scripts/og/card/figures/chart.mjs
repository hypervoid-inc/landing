import { TOKENS as T, esc, marked } from "../kit.mjs";

/**
 * Data figures: a thin-line chart of the post's own numbers.
 */

const fmt = (value) => Math.round(value * 10) / 10;

/**
 * A curve sampled from the post's own formula, with labelled marks on it.
 *
 *   { kind: "curve", x: { label, max }, y: { label },
 *     points: [[x, y], ...],            y from 0 to 1
 *     marks: [{ x, y, text, dashed }],
 *     callout: { value: "86.1%", text: "..." } }
 */
export function curve({ x, y, points, marks = [], callout }) {
  const W = 520;
  const H = 330;
  const pad = { l: 46, r: 18, t: 18, b: 40 };
  const px = (v) => pad.l + (v / x.max) * (W - pad.l - pad.r);
  const py = (v) => pad.t + (1 - v) * (H - pad.t - pad.b);
  const line = points
    .map(([a, b], i) => `${i ? "L" : "M"}${fmt(px(a))} ${fmt(py(b))}`)
    .join(" ");
  const area = `${line} L${fmt(px(points.at(-1)[0]))} ${py(0)} L${px(points[0][0])} ${py(0)} Z`;
  const grid = [0, 0.25, 0.5, 0.75, 1]
    .map(
      (v) =>
        `<line x1="${pad.l}" x2="${W - pad.r}" y1="${py(v)}" y2="${py(v)}" stroke="${T.soft}" stroke-width="1"/><text x="${pad.l - 10}" y="${py(v) + 4}" text-anchor="end" font-size="12" fill="${T.subtle}">${v * 100}%</text>`,
    )
    .join("");
  const ticks = (x.ticks ?? [])
    .map(
      (v) =>
        `<text x="${px(v)}" y="${H - pad.b + 20}" text-anchor="middle" font-size="12" fill="${T.subtle}">${v}</text>`,
    )
    .join("");
  const markSvg = marks
    .map((m) => {
      const cx = px(m.x);
      const cy = py(m.y);
      const anchor = m.align ?? "start";
      const dx = anchor === "end" ? -12 : 12;
      return `${m.dashed ? `<line x1="${cx}" x2="${cx}" y1="${cy}" y2="${py(0)}" stroke="${T.brand}" stroke-dasharray="3 5" stroke-width="1.4"/><line x1="${pad.l}" x2="${cx}" y1="${cy}" y2="${cy}" stroke="${T.brand}" stroke-dasharray="3 5" stroke-width="1.4"/>` : ""}
        <circle cx="${cx}" cy="${cy}" r="6" fill="#fff" stroke="${T.strong}" stroke-width="2.4"/>
        <text x="${cx + dx}" y="${cy - 12}" text-anchor="${anchor}" font-size="15" font-weight="600" fill="${T.ink}">${esc(m.text)}</text>`;
    })
    .join("");
  const svg = `<svg width="${W}" height="${H}" font-family="Geist">
    <defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${T.brand}" stop-opacity=".18"/><stop offset="1" stop-color="${T.brand}" stop-opacity="0"/></linearGradient></defs>
    ${grid}${ticks}
    <text x="${W - pad.r}" y="${H - 4}" text-anchor="end" font-size="12" font-weight="600" letter-spacing="1.2" fill="${T.subtle}">${esc(x.label.toUpperCase())}</text>
    <path d="${area}" fill="url(#fill)"/>
    <path d="${line}" fill="none" stroke="${T.brand}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
    ${markSvg}
  </svg>`;
  const box = callout
    ? `<div class="panel" style="position:absolute;right:-6px;top:-18px;padding:16px 20px;width:220px">
        <div style="font:700 40px/1 Geist;color:${T.strong};letter-spacing:-.02em">${esc(callout.value)}</div>
        <div style="font:500 14px/1.35 Geist;color:${T.muted};margin-top:8px">${marked(callout.text)}</div>
      </div>`
    : "";
  return {
    html: `<div style="position:relative;padding-top:70px">
      <div class="panel" style="padding:18px 12px 10px 8px">
        <div class="label" style="margin:0 0 6px 14px">${esc(y.label)}</div>${svg}
      </div>${box}</div>`,
  };
}
