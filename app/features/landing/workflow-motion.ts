export function clamp(value: number, min = 0, max = 1) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Screen line a copy card has to straddle to become the active one.
 *
 * It sits above centre so the active card reads as the caption for the video
 * pinned beside it, and so the next card is already on screen underneath it.
 */
export function getWorkflowFocusLine(
  viewportHeight: number,
  chromeHeight: number,
) {
  return chromeHeight + (viewportHeight - chromeHeight) * 0.42;
}

/**
 * Index of the card the focus line currently falls in.
 *
 * Cards are laid out contiguously in normal flow, so exactly one contains the
 * line at any time. Before the first card reaches it the first card leads, and
 * once the last card has passed it stays active until the section is gone.
 */
export function getActiveWorkflowIndex(
  bounds: readonly { top: number; bottom: number }[],
  focusLine: number,
) {
  if (!bounds.length) return 0;

  for (let index = 0; index < bounds.length; index += 1) {
    const box = bounds[index]!;
    if (focusLine >= box.bottom) continue;
    // Inside this card, or in a gap just above it (then the previous one leads).
    return focusLine >= box.top ? index : Math.max(index - 1, 0);
  }

  return bounds.length - 1;
}

/**
 * Below lg the screen cannot sit beside the copy, so the whole stage is sticky
 * and the cards cross-fade inside it. The scroll that would have moved them is
 * spent as a runway on the stage's container instead: this is how far through
 * that runway the reader is, 0 as the stage pins and 1 as it lets go.
 *
 * `stageTop` is the container's viewport-relative top, not the stage's - the
 * stage is pinned, so only its container still moves.
 */
export function getWorkflowStageProgress(
  stageTop: number,
  containerHeight: number,
  stageHeight: number,
  chromeHeight: number,
) {
  return clamp(
    (chromeHeight - stageTop) / Math.max(containerHeight - stageHeight, 1),
  );
}

/**
 * Demo showing at a given point in the runway. Every demo holds an equal share,
 * including the last one, which keeps its hold until the stage unpins.
 */
export function getWorkflowStageIndex(progress: number, demoCount: number) {
  if (demoCount <= 0) return 0;
  return Math.min(demoCount - 1, Math.floor(clamp(progress) * demoCount));
}

/**
 * Page offset that puts a demo in the middle of its hold, for the stepper's
 * jumps on the sticky stage.
 */
export function getWorkflowStageScrollTarget(
  scrollY: number,
  stageTop: number,
  containerHeight: number,
  stageHeight: number,
  chromeHeight: number,
  index: number,
  demoCount: number,
) {
  const runway = Math.max(containerHeight - stageHeight, 1);
  const pinned = scrollY + stageTop - chromeHeight;
  const share = demoCount > 0 ? (index + 0.5) / demoCount : 0;
  return Math.max(0, pinned + runway * share);
}

/**
 * Where a card parks while it holds the screen, as a share of the viewport
 * below the chrome. Mirrored by the `top` on `.workflow-card` in landing.css -
 * keep the two in step.
 */
export const WORKFLOW_SLOT_RATIO = 0.14;

export function getWorkflowSlotTop(
  viewportHeight: number,
  chromeHeight: number,
) {
  return chromeHeight + viewportHeight * WORKFLOW_SLOT_RATIO;
}

/**
 * Page offset that parks a card at the top of its hold, for the stepper's
 * jumps. `panelTop` is the card's runway, viewport-relative.
 */
export function getWorkflowScrollTarget(
  scrollY: number,
  panelTop: number,
  slotTop: number,
) {
  return Math.max(0, scrollY + panelTop - slotTop);
}

export function smoothStep(t: number) {
  const x = clamp(t);
  return x * x * (3 - 2 * x);
}

/**
 * How far through the walkthrough the traveling rail dot should sit, 0 on the
 * first demo and 1 on the last. Uses each card's midpoint as the stop for
 * i/(n-1) so the dot tracks the focus line instead of snapping per index.
 */
export function getWorkflowRailProgress(
  bounds: readonly { top: number; bottom: number }[],
  focusLine: number,
) {
  if (bounds.length <= 1) return 0;

  const first = bounds[0]!;
  const last = bounds[bounds.length - 1]!;
  if (focusLine <= first.top) return 0;
  if (focusLine >= last.bottom) return 1;

  const mids = bounds.map((box) => (box.top + box.bottom) / 2);
  const lastMid = mids[mids.length - 1]!;
  if (focusLine <= mids[0]!) return 0;
  if (focusLine >= lastMid) return 1;

  for (let index = 0; index < mids.length - 1; index += 1) {
    const start = mids[index]!;
    const end = mids[index + 1]!;
    if (focusLine > end) continue;
    const t = (focusLine - start) / Math.max(end - start, 1);
    return (index + t) / (mids.length - 1);
  }

  return 1;
}

export const WORKFLOW_EDGE_RANGE_PX = 160;
export const WORKFLOW_EDGE_BLUR_PX = 12;
export const WORKFLOW_EDGE_POINTER_CUTOFF = 0.4;

/**
 * 1 when a card's top sits on the video slot, 0 once it is `range` px away
 * above or below. Scrubs in both directions so enter and exit reverse.
 */
export function getWorkflowEdgeReveal(
  cardTop: number,
  slotTop: number,
  range = WORKFLOW_EDGE_RANGE_PX,
) {
  return smoothStep(1 - Math.abs(cardTop - slotTop) / Math.max(range, 1));
}

/**
 * First-card enter only. The copy sits above the centered video until the
 * viewer pins; that distance is the blur-in. Once the viewer is on the
 * chrome, the next card may push this one off — that stays sharp.
 */
export function getWorkflowFirstReveal(
  cardTop: number,
  slotTop: number,
  viewerTop: number,
  chrome: number,
  range = WORKFLOW_EDGE_RANGE_PX,
) {
  if (viewerTop <= chrome + 1) return null;
  const edge = getWorkflowEdgeReveal(cardTop, slotTop, range);
  return edge < 0.995 ? edge : null;
}

/**
 * Last-card leave upward: 1 while the card is at or below the slot, 0 once it
 * is `range` px above. Approaching from below must not fade — that was
 * blurring Research/Channels in the middle of the list.
 */
export function getWorkflowExitReveal(
  cardTop: number,
  slotTop: number,
  range = WORKFLOW_EDGE_RANGE_PX,
) {
  return smoothStep(1 - (slotTop - cardTop) / Math.max(range, 1));
}

/**
 * Last-card leave past the video's bottom edge: 1 while `edge` is still
 * inside the frame, 0 once it is `range` px below.
 */
export function getWorkflowBelowReveal(
  edge: number,
  videoBottom: number,
  range = WORKFLOW_EDGE_RANGE_PX,
) {
  if (edge <= videoBottom) return 1;
  return smoothStep(1 - (edge - videoBottom) / Math.max(range, 1));
}

/**
 * Combined last-card treatment. `null` means CSS stacking should win: the
 * card is still coming up, or it is parked and still fully inside the video.
 *
 * Leave-down uses the card's bottom against the video's bottom so blur starts
 * as soon as the copy begins to stick out of the frame. The last panel is not
 * tall enough for the card top to clear the video before sticky releases.
 */
export function getWorkflowLastReveal(
  cardTop: number,
  cardBottom: number,
  slotTop: number,
  videoBottom: number,
  viewerTop: number,
  chrome: number,
  range = WORKFLOW_EDGE_RANGE_PX,
) {
  const pinned = viewerTop >= chrome;
  if (pinned) {
    if (cardTop > slotTop + 1) return null;
    const up = getWorkflowExitReveal(cardTop, slotTop, range);
    return up < 0.995 ? up : null;
  }

  const down = getWorkflowBelowReveal(cardBottom, videoBottom, range);
  return down < 0.995 ? down : null;
}

/**
 * Rail stays glued to the video. It shares the first-card enter fade and the
 * last-card leave fade, but never translates onto the copy.
 */
export function getWorkflowRailFollow(
  firstReveal: number | null,
  lastReveal: number | null,
) {
  return { offsetY: 0, reveal: lastReveal ?? firstReveal };
}

/**
 * CSS `ease-in-out`. Gentler than `--ease-move` so a 300–500px sticky push
 * does not read as stuck, then thrown.
 */
export const WORKFLOW_PUSH_EASE = {
  x1: 0.42,
  y1: 0,
  x2: 0.58,
  y2: 1,
} as const;

export type WorkflowPushOffset = {
  index: number;
  t: number;
  distance: number;
  offsetY: number;
};

function bezierCoefficients(p1: number, p2: number) {
  const c = 3 * p1;
  const b = 3 * (p2 - p1) - c;
  const a = 1 - c - b;
  return { a, b, c };
}

function sampleBezier(
  coefficients: { a: number; b: number; c: number },
  t: number,
) {
  return ((coefficients.a * t + coefficients.b) * t + coefficients.c) * t;
}

function sampleBezierDerivative(
  coefficients: { a: number; b: number; c: number },
  t: number,
) {
  return (3 * coefficients.a * t + 2 * coefficients.b) * t + coefficients.c;
}

/**
 * Unit cubic-bezier (P0 = 0,0, P3 = 1,1). Newton, then binary search if the
 * x-curve is awkward (x1 > x2).
 */
export function cubicBezier(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x: number,
) {
  const target = clamp(x);
  if (target === 0 || target === 1) return target;

  const xCurve = bezierCoefficients(x1, x2);
  const yCurve = bezierCoefficients(y1, y2);

  let t = target;
  for (let i = 0; i < 8; i += 1) {
    const current = sampleBezier(xCurve, t) - target;
    if (Math.abs(current) < 1e-6) {
      return sampleBezier(yCurve, t);
    }
    const derivative = sampleBezierDerivative(xCurve, t);
    if (Math.abs(derivative) < 1e-6) break;
    t -= current / derivative;
    if (t < 0 || t > 1) break;
  }

  let low = 0;
  let high = 1;
  t = clamp(t);
  for (let i = 0; i < 20; i += 1) {
    const current = sampleBezier(xCurve, t);
    if (Math.abs(current - target) < 1e-6) break;
    if (current < target) low = t;
    else high = t;
    t = (low + high) / 2;
  }

  return sampleBezier(yCurve, t);
}

/**
 * Where sticky would put a card: clamped between the slot and the panel's
 * remaining runway. Panel rects only — transformed card boxes feed back.
 */
export function getWorkflowStickyTop(
  panelTop: number,
  panelBottom: number,
  cardHeight: number,
  slotTop: number,
) {
  return Math.min(Math.max(panelTop, slotTop), panelBottom - cardHeight);
}

export function getWorkflowPushCorrection(t: number, distance: number) {
  const progress = clamp(t);
  const eased = cubicBezier(
    WORKFLOW_PUSH_EASE.x1,
    WORKFLOW_PUSH_EASE.y1,
    WORKFLOW_PUSH_EASE.x2,
    WORKFLOW_PUSH_EASE.y2,
    progress,
  );
  return (progress - eased) * distance;
}

/**
 * Shared visual correction for the unique pair straddling the slot.
 * Null during hold and after the next card has parked.
 */
export function getWorkflowPushOffset(
  layoutTops: readonly number[],
  slotTop: number,
): WorkflowPushOffset | null {
  for (let index = 0; index < layoutTops.length - 1; index += 1) {
    const leaving = layoutTops[index]!;
    const arriving = layoutTops[index + 1]!;
    if (!(leaving < slotTop && arriving > slotTop)) continue;

    const distance = Math.max(arriving - leaving, 1);
    const t = (slotTop - leaving) / distance;
    return {
      index,
      t,
      distance,
      offsetY: getWorkflowPushCorrection(t, distance),
    };
  }

  return null;
}

export function getWorkflowVisualBounds(
  layoutTops: readonly number[],
  heights: readonly number[],
  push: WorkflowPushOffset | null,
) {
  return layoutTops.map((top, index) => {
    const offset =
      push != null && (index === push.index || index === push.index + 1)
        ? push.offsetY
        : 0;
    const visualTop = top + offset;
    return { top: visualTop, bottom: visualTop + (heights[index] ?? 0) };
  });
}
