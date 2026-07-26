export function clamp(value: number, min = 0, max = 1) {
  return Math.min(Math.max(value, min), max);
}

export function smoothStep(value: number) {
  const x = clamp(value);
  return x * x * (3 - 2 * x);
}

export function lerp(start: number, end: number, amount: number) {
  return start + (end - start) * amount;
}

const WORKFLOW_HOLD = 1;
const WORKFLOW_TRANSITION = 0.48;

export function getHeldWorkflowPosition(progress: number, demoCount: number) {
  const transitionCount = demoCount - 1;
  if (transitionCount <= 0) return 0;
  if (progress >= 1) return transitionCount;

  const total =
    demoCount * WORKFLOW_HOLD + transitionCount * WORKFLOW_TRANSITION;
  let cursor = clamp(progress) * total;

  for (let index = 0; index < transitionCount; index += 1) {
    if (cursor <= WORKFLOW_HOLD) return index;
    cursor -= WORKFLOW_HOLD;
    if (cursor < WORKFLOW_TRANSITION) {
      return index + smoothStep(cursor / WORKFLOW_TRANSITION);
    }
    cursor -= WORKFLOW_TRANSITION;
  }

  return transitionCount;
}

export function getWorkflowScrollScreens(demoCount: number, desktop: boolean) {
  const transitionCount = Math.max(0, demoCount - 1);
  const timeline =
    Math.max(1, demoCount) * WORKFLOW_HOLD +
    transitionCount * WORKFLOW_TRANSITION;
  return timeline * (desktop ? 0.75 : 0.72);
}

export function getSoftPinOffset(
  progress: number,
  scrollDistance: number,
  pinOffset: number,
  edgeDistance = pinOffset * 2,
) {
  if (progress <= 0 || scrollDistance <= 0) return 0;

  const edge = Math.min(edgeDistance, scrollDistance / 2);
  const scrolled = clamp(progress) * scrollDistance;
  const entering = clamp(scrolled / edge);
  const leaving = clamp((scrolled - (scrollDistance - edge)) / edge);
  return -pinOffset * (1 - (1 - entering) ** 2 + leaving ** 2);
}
export type MobileWorkflowViewportMode = "normal" | "compact" | "short";

export function getMobileWorkflowViewportMode(
  height: number,
): MobileWorkflowViewportMode {
  if (height <= 640) return "short";
  if (height <= 740) return "compact";
  return "normal";
}
