import { EASE_OUT, el, tween } from "./kit";

/**
 * A comic speech bubble that points at whoever is talking. It is placed on
 * the side of `anchor` given by `side`, and its tail is one SVG path drawn
 * from the bubble's edge to the anchor, so it always lands on the speaker.
 * Bubble and tail share one drop-shadow, so the outline reads as one shape.
 */
export type BubbleOptions = {
  /** The point the tail touches, in board pixels. */
  anchor: { x: number; y: number };
  /** Where the bubble sits relative to the anchor. */
  side: "left" | "right" | "above";
  /** Gap between the anchor and the bubble's nearest edge. */
  gap?: number;
  maxWidth?: number;
  /** Keep the bubble inside these board bounds. */
  bounds?: { left: number; top: number; right: number; bottom: number };
};

const INK = "#0d1630";

export class Bubble {
  readonly root: HTMLDivElement;
  private body: HTMLDivElement;
  private tail: SVGSVGElement;

  constructor(parent: HTMLElement) {
    this.root = el("div", "bub");
    this.body = el("div", "bub-body");
    this.tail = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.tail.setAttribute("class", "bub-tail");
    this.root.append(this.body, this.tail);
    this.root.hidden = true;
    parent.appendChild(this.root);
  }

  /**
   * Two choices always share one line (show.css), so a bubble holding them is
   * at least as wide as that row: both chips, the gap, the shadow room, the
   * body's padding and border, and a little air so neither meets the edge.
   */
  private chipRowWidth(): number {
    const row = this.body.querySelector<HTMLElement>(".chips");
    if (!row || getComputedStyle(row).flexWrap !== "nowrap") return 0;
    const chips = [...row.children] as HTMLElement[];
    const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
    const content = chips.reduce((sum, chip) => sum + chip.offsetWidth, 0) + gap * (chips.length - 1);
    return Math.ceil(content + 8 + 2 * (24 + 4) + 16);
  }

  /** Shows `html` (already escaped by the caller) and returns the content node. */
  async say(html: string, options: BubbleOptions, signal?: AbortSignal): Promise<HTMLDivElement> {
    const wasOpen = !this.root.hidden;
    this.body.innerHTML = html;
    this.root.hidden = false;
    this.root.style.maxWidth = `${Math.max(options.maxWidth ?? 400, this.chipRowWidth())}px`;
    this.place(options);
    if (!wasOpen) {
      await tween(
        this.root,
        [
          { opacity: 0, transform: "scale(.7)" },
          { opacity: 1, transform: "scale(1)" },
        ],
        { duration: 420, easing: "cubic-bezier(.34,1.56,.64,1)" },
        signal,
      );
    } else {
      this.body.animate(
        [
          { opacity: 0, transform: "translateY(6px)" },
          { opacity: 1, transform: "none" },
        ],
        { duration: 260, easing: EASE_OUT },
      );
    }
    return this.body;
  }

  async hide(signal?: AbortSignal): Promise<void> {
    if (this.root.hidden) return;
    await tween(this.root, [{ opacity: 1 }, { opacity: 0, transform: "scale(.92)" }], { duration: 200, easing: "ease-in" }, signal);
    this.root.hidden = true;
    this.root.style.opacity = "";
    this.root.style.transform = "";
  }

  private place({ anchor, side, gap = 22, bounds = { left: 40, top: 40, right: 920, bottom: 680 } }: BubbleOptions) {
    const r = this.root;
    r.style.left = "0px";
    r.style.top = "0px";
    const w = r.offsetWidth;
    const h = r.offsetHeight;
    let left: number;
    let top: number;
    if (side === "left") {
      left = anchor.x - gap - w;
      top = anchor.y - h * 0.62;
    } else if (side === "right") {
      left = anchor.x + gap;
      top = anchor.y - h * 0.62;
    } else {
      left = anchor.x - w * 0.5;
      top = anchor.y - gap - h;
    }
    left = Math.max(bounds.left, Math.min(bounds.right - w, left));
    top = Math.max(bounds.top, Math.min(bounds.bottom - h, top));
    r.style.left = `${Math.round(left)}px`;
    r.style.top = `${Math.round(top)}px`;
    r.style.transformOrigin = `${anchor.x - left}px ${anchor.y - top}px`;

    // Tail: a curved wedge from the bubble's edge nearest the anchor to the anchor.
    const ax = anchor.x - left;
    const ay = anchor.y - top;
    const radius = 22;
    const baseW = 34;
    let bx = Math.max(radius + baseW / 2, Math.min(w - radius - baseW / 2, ax - (side === "left" ? 40 : side === "right" ? -40 : 0)));
    let by = h;
    let horizontal = false;
    if (ay < h - 10 && (ax > w || ax < 0)) {
      // The anchor is beside the bubble rather than below it: leave from the side.
      horizontal = true;
      bx = ax > w ? w : 0;
      by = Math.max(radius + baseW / 2, Math.min(h - radius - baseW / 2, ay));
    }
    const minX = Math.min(bx - baseW, ax) - 8;
    const minY = Math.min(by - baseW, ay) - 8;
    const maxX = Math.max(bx + baseW, ax) + 8;
    const maxY = Math.max(by + baseW, ay) + 8;
    const t = this.tail;
    t.setAttribute("width", String(maxX - minX));
    t.setAttribute("height", String(maxY - minY));
    t.style.left = `${minX}px`;
    t.style.top = `${minY}px`;
    const p = (x: number, y: number) => `${(x - minX).toFixed(1)} ${(y - minY).toFixed(1)}`;
    const half = baseW / 2;
    // The base sits 5px inside the bubble so the fill covers the border joint.
    const inset = 5;
    const [b1, b2] = horizontal
      ? [
          [bx + (bx === 0 ? inset : -inset), by - half],
          [bx + (bx === 0 ? inset : -inset), by + half],
        ]
      : [
          [bx - half, by - inset],
          [bx + half, by - inset],
        ];
    const cx = (b1![0]! + b2![0]!) / 2 + (ax - bx) * 0.2;
    const cy = (b1![1]! + b2![1]!) / 2 + (ay - by) * 0.55;
    const fill = `M ${p(b1![0]!, b1![1]!)} Q ${p(cx - 6, cy)} ${p(ax, ay)} Q ${p(cx + 6, cy)} ${p(b2![0]!, b2![1]!)} Z`;
    const edge = `M ${p(b1![0]!, b1![1]! + (horizontal ? 0 : 1))} Q ${p(cx - 6, cy)} ${p(ax, ay)} Q ${p(cx + 6, cy)} ${p(b2![0]!, b2![1]! + (horizontal ? 0 : 1))}`;
    t.innerHTML = `<path d="${fill}" fill="#fff"/><path d="${edge}" fill="none" stroke="${INK}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>`;
  }
}
