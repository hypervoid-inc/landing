import { TOKENS as T, esc, icon, marked, tile } from "../kit.mjs";

/**
 * System figures: how the parts connect, what runs, what is allowed.
 */

/**
 * A diagram on a grid of up to 4 columns and 3 rows. A node shows a brand's
 * logo when `name` is a product, otherwise a Hugeicons `icon`.
 *
 *   { kind: "flow",
 *     nodes: [{ id: "a", name: "Gmail", label: "Inbox", col: 0, row: 1 },
 *             { id: "b", icon: "File02", label: "Files", col: 2, row: 0 }],
 *     links: [{ from: "a", to: "b", dashed: true }],
 *     boundary: { ids: ["b"], label: "Sandbox" } }
 */
export function flow({ nodes, links, boundary, cols = 4, rows = 3 }) {
  const W = 540;
  const H = 440;
  const cw = W / cols;
  const rh = H / rows;
  const at = (node) => ({
    x: cw * node.col + cw / 2,
    y: rh * node.row + rh / 2 - 12,
  });
  const byId = Object.fromEntries(nodes.map((node) => [node.id, node]));
  const lines = links
    .map((link) => {
      const a = at(byId[link.from]);
      const b = at(byId[link.to]);
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const length = Math.hypot(dx, dy);
      const pad = 44;
      const x1 = a.x + (dx / length) * pad;
      const y1 = a.y + (dy / length) * pad;
      const x2 = b.x - (dx / length) * (pad + 6);
      const y2 = b.y - (dy / length) * (pad + 6);
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${T.brand}" stroke-width="2" ${link.dashed ? 'stroke-dasharray="5 6"' : ""} marker-end="url(#arrow)"/>`;
    })
    .join("");
  let box = "";
  if (boundary) {
    const inside = boundary.ids.map((id) => at(byId[id]));
    const x0 = Math.min(...inside.map((p) => p.x)) - Math.max(cw / 2 - 8, 74);
    const x1 = Math.max(...inside.map((p) => p.x)) + Math.max(cw / 2 - 8, 74);
    const y0 = Math.min(...inside.map((p) => p.y)) - 62;
    const y1 = Math.max(...inside.map((p) => p.y)) + 74;
    box = `<div style="position:absolute;left:${x0}px;top:${y0}px;width:${x1 - x0}px;height:${y1 - y0}px;border:1.6px dashed ${T.brand};border-radius:22px;background:rgba(239,251,252,.55)"></div>
      <span class="pill" style="position:absolute;left:${x0 + 16}px;top:${y0 - 15}px;background:#fff;font-size:12.5px;padding:6px 11px;white-space:nowrap">${icon("SquareLock02", 14, T.strong)}${esc(boundary.label)}</span>`;
  }
  const items = nodes
    .map((node) => {
      const p = at(node);
      const mark = node.name
        ? tile(node.name, 64, { radius: 18 })
        : `<span class="tile" style="width:64px;height:64px;border-radius:18px">${icon(node.icon, 30, T.strong)}</span>`;
      return `<div style="position:absolute;left:${p.x - cw / 2}px;top:${p.y - 32}px;width:${cw}px;display:flex;flex-direction:column;align-items:center;gap:9px">${mark}<div style="font:600 14px/1.25 Geist;color:${T.ink};text-align:center;max-width:${cw - 6}px">${esc(node.label)}</div></div>`;
    })
    .join("");
  return {
    html: `<div style="position:relative;width:${W}px;height:${H}px">${box}
      <svg width="${W}" height="${H}" style="position:absolute;inset:0"><defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${T.brand}"/></marker></defs>${lines}</svg>
      ${items}</div>`,
  };
}

/**
 * A terminal in the agent's sandbox. Lines starting with "$ " are commands.
 *
 *   { kind: "terminal", title: "sandbox", lines: ["$ python3 compare.py", "3 rates changed"] }
 */
export function terminal({ title, lines }) {
  const body = lines
    .map((line) =>
      line.startsWith("$ ")
        ? `<div style="white-space:pre;overflow:hidden" data-line><span style="color:#5fe0ee">$</span> <span style="color:#f2f7f8">${esc(line.slice(2))}</span></div>`
        : `<div style="white-space:pre;overflow:hidden;color:#9fb6bd" data-line>${esc(line)}</div>`,
    )
    .join("");
  return {
    html: `<div style="width:540px;border-radius:18px;overflow:hidden;background:#17252a;box-shadow:0 30px 70px -30px rgba(1,60,70,.6);border:1px solid #2a3d43">
      <div style="display:flex;align-items:center;gap:8px;padding:13px 16px;background:#1d2f35;border-bottom:1px solid #2a3d43">
        ${["#ff6b6b", "#ffc145", "#4ad08a"].map((c) => `<span style="width:11px;height:11px;border-radius:50%;background:${c};opacity:.85"></span>`).join("")}
        <span style="margin-left:10px;font:500 13.5px Geist;color:#9fb6bd">${esc(title)}</span>
      </div>
      <div style="padding:18px 20px 22px;font:500 16px/1.75 'SF Mono',Menlo,monospace">${body}</div>
    </div>`,
  };
}

const MARKS = {
  yes: ["CheckmarkCircle02", T.positive, "#ecfdf3"],
  no: ["CancelCircle", T.danger, "#fef3f2"],
  todo: ["Circle", T.subtle, T.soft],
};

/**
 * Rules or steps, each allowed, refused, or still to do.
 *
 *   { kind: "checklist", title: "Gmail access", items: [{ text, mark: "yes" }] }
 */
export function checklist({ title, items }) {
  const list = items
    .map((item) => {
      const [name, color, bg] = MARKS[item.mark];
      return `<div style="display:flex;align-items:center;gap:13px;padding:10px 20px;border-top:1px solid ${T.soft}">
        <span style="width:30px;height:30px;border-radius:9px;background:${bg};display:inline-flex;align-items:center;justify-content:center;flex:none">${icon(name, 18, color, 1.8)}</span>
        <span style="font:500 16.5px/1.3 Geist;color:${item.mark === "no" ? T.muted : T.ink}">${marked(item.text)}</span>
      </div>`;
    })
    .join("");
  return {
    html: `<div class="panel" style="width:520px;overflow:hidden">
      <div style="display:flex;align-items:center;gap:12px;padding:16px 20px">${tile("Construct", 32, { radius: 9 })}<span style="font:650 17px Geist">${esc(title)}</span></div>${list}
    </div>`,
  };
}

/**
 * Two columns side by side: what one thing does against another.
 *
 *   { kind: "contrast", left: { title, name?, items }, right: { title, name?, items } }
 */
export function contrast({ left, right }) {
  const column = (
    side,
    us,
  ) => `<div class="panel" style="flex:1;padding:20px 20px 16px;${us ? `border-color:#a7e3eb;background:linear-gradient(180deg,#fff,${T.tint})` : ""}">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">${side.name ? tile(side.name, 34, { radius: 10 }) : ""}<span style="font:650 17px Geist;color:${us ? T.strong : T.ink}">${esc(side.title)}</span></div>
      ${side.items.map((item) => `<div style="display:flex;gap:9px;padding:8px 0;border-top:1px solid ${T.soft};font:450 15px/1.35 Geist;color:${us ? T.ink : T.muted}">${icon(us ? "CheckmarkCircle02" : "MinusSignCircle", 17, us ? T.strong : T.subtle)}<span>${marked(item)}</span></div>`).join("")}
    </div>`;
  return {
    html: `<div style="display:flex;gap:14px;width:540px;align-items:stretch">${column(left, false)}${column(right, true)}</div>`,
  };
}
