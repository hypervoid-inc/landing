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
  return clamp((chromeHeight - stageTop) / Math.max(containerHeight - stageHeight, 1));
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
