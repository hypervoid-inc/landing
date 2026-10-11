import { FIGURES } from "./figures/index.mjs";
import { TOKENS as T, esc, fontUri, marked } from "./kit.mjs";

/**
 * The frame every card shares: the wordmark, an eyebrow, a short headline in
 * the homepage's italic serif, and one figure made from the post itself.
 *
 * The frame is the constant and the figure is the variable, the way Vercel,
 * Linear and Stripe set their blog cards: a reader learns the frame once, and
 * after that every card is recognisably Construct's and recognisably about
 * something different. Two layouts, `split` (headline left, figure right) and
 * `stack` (headline above a wide figure), keep runs of cards from lining up.
 */

const CSS = `
@font-face{font-family:Geist;font-weight:100 900;font-style:normal;src:url(${fontUri("geist-latin-wght-normal.woff2")}) format("woff2")}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1200px;height:630px;overflow:hidden}
body{font-family:Geist,sans-serif;color:${T.ink};background:${T.canvas};-webkit-font-smoothing:antialiased;font-feature-settings:"tnum" 1}
.card{position:relative;width:1200px;height:630px;overflow:hidden;
  background:radial-gradient(ellipse 60% 75% at var(--gx,78%) 52%,rgba(1,180,200,.13),rgba(1,180,200,0) 70%),linear-gradient(180deg,#fff 0%,${T.canvas} 100%)}
.rings{position:absolute;inset:0;pointer-events:none}
.wordmark{font:italic 400 30px/1 Georgia,serif;letter-spacing:-.01em;color:${T.ink}}
.wordmark span{color:${T.brand}}
.eyebrow{font:600 14px/1 Geist;letter-spacing:.16em;text-transform:uppercase;color:${T.strong};display:flex;gap:10px;align-items:center}
.eyebrow i{width:5px;height:5px;border-radius:50%;background:${T.line};display:inline-block}
.title{font:640 58px/1.08 Geist,sans-serif;letter-spacing:-.034em;color:${T.ink};text-wrap:balance}
.title .hl,.hl{font-style:inherit;color:${T.brand}}
.deck{font:400 22px/1.42 Geist;color:${T.muted};text-wrap:pretty}
.split .copy{position:absolute;left:64px;top:56px;bottom:52px;width:500px;display:flex;flex-direction:column}
.split .copy .eyebrow{margin-top:auto}
.split .copy .title{margin-top:18px}
.split .copy .deck{margin-top:18px}
.split .figure{position:absolute;left:600px;right:48px;top:40px;bottom:40px;display:flex;align-items:center;justify-content:center}
.stack .copy{position:absolute;left:64px;right:64px;top:52px;display:flex;flex-direction:column}
.stack .copy .top{display:flex;justify-content:space-between;align-items:center}
.stack .copy .title{margin-top:30px;font-size:50px}
.stack .figure{position:absolute;left:64px;right:64px;bottom:44px;height:var(--fh,300px);display:flex;align-items:flex-end;justify-content:center}
.tile{display:inline-flex;align-items:center;justify-content:center;background:#fff;border:1px solid ${T.line};box-shadow:0 6px 16px -10px rgba(1,80,95,.35);flex:none;overflow:hidden}
.panel{background:#fff;border:1px solid ${T.line};border-radius:20px;box-shadow:0 24px 60px -28px rgba(1,95,110,.38),0 2px 6px -2px rgba(1,95,110,.08)}
.pill{display:inline-flex;align-items:center;gap:8px;padding:7px 13px;border-radius:999px;background:${T.tint};border:1px solid ${T.line};font:600 14px/1 Geist;color:${T.strong}}
.label{font:600 13px/1 Geist;letter-spacing:.14em;text-transform:uppercase;color:${T.subtle}}
`;

/** Dashed orbit rings centred on the figure, from the homepage hero. */
function rings(cx, cy) {
  const circles = [150, 230, 320]
    .map(
      (r, i) =>
        `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${T.brand}" stroke-opacity="${0.22 - i * 0.05}" stroke-dasharray="${i === 1 ? "2 7" : "4 9"}" stroke-width="1.2"/>`,
    )
    .join("");
  return `<svg class="rings" width="1200" height="630">${circles}</svg>`;
}

/**
 * Shrinks the headline until it fits its box, so a long title is set smaller
 * rather than overflowing; `render.mjs` reads `data-fit` back and refuses a
 * card that still overflows at the smallest size.
 */
const FIT = `
<script>
document.fonts.ready.then(() => {
for (const el of document.querySelectorAll('[data-fit]')) {
  const max = Number(el.dataset.fit);
  let size = parseFloat(getComputedStyle(el).fontSize);
  while (el.scrollHeight > max && size > 34) { size -= 1; el.style.fontSize = size + 'px'; }
  if (el.scrollHeight > max) document.body.dataset.overflow = el.className;
}
for (const el of document.querySelectorAll('.fit-x')) {
  let size = parseFloat(getComputedStyle(el).fontSize);
  while (el.scrollWidth > el.clientWidth && size > 10) { size -= 1; el.style.fontSize = size + 'px'; }
}
const problems = [];
for (const el of document.querySelectorAll('[data-line]')) {
  if (el.scrollWidth > el.clientWidth + 1) problems.push('clipped "' + el.textContent.trim() + '"');
}
const figure = document.querySelector('.figure > *');
const copy = document.querySelector('.copy .title');
if (figure) {
  const box = figure.getBoundingClientRect();
  const split = document.querySelector('.card.split');
  const limit = { left: split ? 584 : 16, right: 1192, top: 8, bottom: 622 };
  if (!split && copy) limit.top = copy.getBoundingClientRect().bottom + 12;
  for (const side of ['left', 'top']) if (box[side] < limit[side] - 0.5) problems.push('figure past the ' + side + ' edge by ' + Math.round(limit[side] - box[side]) + 'px');
  for (const side of ['right', 'bottom']) if (box[side] > limit[side] + 0.5) problems.push('figure past the ' + side + ' edge by ' + Math.round(box[side] - limit[side]) + 'px');
}
if (problems.length) document.body.dataset.problems = problems.join('; ');
document.body.dataset.ready = '1';
});
</script>`;

export function cardHtml(card) {
  const figure = FIGURES[card.figure.kind];
  if (!figure) throw new Error(`Unknown figure kind "${card.figure.kind}"`);
  const { html, layout = "split", gx, height } = figure(card.figure);
  const wordmark = `<div class="wordmark">Construct<span>Computer</span></div>`;
  const eyebrow = `<div class="eyebrow">${card.eyebrow
    .map(esc)
    .join("<i></i>")}</div>`;
  const deck = card.deck ? `<p class="deck">${marked(card.deck)}</p>` : "";
  const copy =
    layout === "split"
      ? `<div class="copy">${wordmark}${eyebrow}<h1 class="title" data-fit="270">${marked(card.title)}</h1>${deck}</div>`
      : `<div class="copy"><div class="top">${wordmark}${eyebrow}</div><h1 class="title" data-fit="124">${marked(card.title)}</h1></div>`;
  const ringsAt = layout === "split" ? rings(890, 315) : "";
  return `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body><div class="card ${layout}" style="${gx ? `--gx:${gx};` : ""}${height ? `--fh:${height}px;` : ""}">${ringsAt}${copy}<div class="figure">${html}</div></div>${FIT}</body></html>`;
}
