import { describe, expect, it } from "vitest";

import {
  cubicBezier,
  getActiveWorkflowIndex,
  getWorkflowEdgeReveal,
  getWorkflowFocusLine,
  getWorkflowPushCorrection,
  getWorkflowPushOffset,
  getWorkflowRailProgress,
  getWorkflowScrollTarget,
  getWorkflowSlotTop,
  getWorkflowStageIndex,
  getWorkflowStageProgress,
  getWorkflowStageScrollTarget,
  getWorkflowStickyTop,
  getWorkflowBelowReveal,
  getWorkflowFirstReveal,
  getWorkflowLastReveal,
  getWorkflowRailFollow,
  getWorkflowVisualBounds,
  smoothStep,
  WORKFLOW_EDGE_RANGE_PX,
  WORKFLOW_PUSH_EASE,
} from "./workflow-motion";

const cards = (count: number, height: number, start = 0) =>
  Array.from({ length: count }, (_, index) => ({
    top: start + index * height,
    bottom: start + (index + 1) * height,
  }));

describe("workflow motion", () => {
  it("puts the focus line above centre, below the site chrome", () => {
    const line = getWorkflowFocusLine(900, 56);
    expect(line).toBeGreaterThan(56);
    expect(line).toBeLessThan(900 / 2);
    expect(line).toBeCloseTo(56 + 844 * 0.42);
  });

  it("activates the card the focus line falls inside", () => {
    const bounds = cards(4, 500);
    expect(getActiveWorkflowIndex(bounds, 250)).toBe(0);
    expect(getActiveWorkflowIndex(bounds, 750)).toBe(1);
    expect(getActiveWorkflowIndex(bounds, 1999)).toBe(3);
  });

  it("holds the first and last card while the section enters and leaves", () => {
    const bounds = cards(4, 500, 900);
    // Section still below the line, and long past it.
    expect(getActiveWorkflowIndex(bounds, -400)).toBe(0);
    expect(getActiveWorkflowIndex(bounds, 9000)).toBe(3);
    expect(getActiveWorkflowIndex([], 100)).toBe(0);
  });

  it("holds a card in its slot below the chrome and above the focus line", () => {
    const slot = getWorkflowSlotTop(900, 56);
    expect(slot).toBe(56 + 126);
    expect(slot).toBeLessThan(getWorkflowFocusLine(900, 56));
  });

  it("parks a jumped-to card at the start of its hold", () => {
    // A runway 200px below the slot scrolls until it sits on the slot.
    expect(getWorkflowScrollTarget(1000, 600, 400)).toBe(1200);
    // Never scrolls above the top of the page.
    expect(getWorkflowScrollTarget(0, -900, 400)).toBe(0);
  });
});

// Below lg: one sticky stage, 3 demos, a 600px runway each on an 844px phone
// under 56px of chrome, so the container is 788 + 1800.
describe("sticky workflow stage", () => {
  const stage = 788;
  const container = stage + 1800;
  const progressAt = (top: number) =>
    getWorkflowStageProgress(top, container, stage, 56);

  it("runs progress from the moment the stage pins to the moment it lets go", () => {
    // Still arriving, and one pixel before the chrome.
    expect(progressAt(400)).toBe(0);
    expect(progressAt(57)).toBe(0);
    expect(progressAt(56)).toBe(0);
    expect(progressAt(56 - 900)).toBeCloseTo(0.5);
    expect(progressAt(56 - 1800)).toBe(1);
    // Long past the section, never over 1.
    expect(progressAt(-9000)).toBe(1);
  });

  it("survives a container no taller than the stage", () => {
    expect(getWorkflowStageProgress(0, stage, stage, 56)).toBe(1);
  });

  it("gives every demo an equal share of the runway, last one included", () => {
    expect(getWorkflowStageIndex(0, 3)).toBe(0);
    expect(getWorkflowStageIndex(0.33, 3)).toBe(0);
    expect(getWorkflowStageIndex(0.34, 3)).toBe(1);
    expect(getWorkflowStageIndex(0.67, 3)).toBe(2);
    // The last demo holds through the end rather than falling off it.
    expect(getWorkflowStageIndex(1, 3)).toBe(2);
    expect(getWorkflowStageIndex(0.5, 0)).toBe(0);
  });

  it("jumps to the middle of a demo's hold", () => {
    // Stage pins at scrollY 2000 - 56 + 400 = 2344 for a stage 400 below.
    const target = (index: number) =>
      getWorkflowStageScrollTarget(2000, 400, container, stage, 56, index, 3);
    expect(target(0)).toBe(2344 + 300);
    expect(target(1)).toBe(2344 + 900);
    expect(target(2)).toBe(2344 + 1500);
    // Each landing sits inside the band it belongs to.
    for (const index of [0, 1, 2]) {
      const scrolled = target(index) - 2344;
      expect(getWorkflowStageIndex(progressAt(56 - scrolled), 3)).toBe(index);
    }
    // Never scrolls above the top of the page.
    expect(
      getWorkflowStageScrollTarget(0, -9000, container, stage, 56, 0, 3),
    ).toBe(0);
  });
});

describe("workflow rail progress", () => {
  const bounds = cards(4, 500);

  it("stays at 0 before the first card and 1 after the last", () => {
    expect(getWorkflowRailProgress(bounds, -100)).toBe(0);
    expect(getWorkflowRailProgress(bounds, bounds[0]!.top)).toBe(0);
    expect(getWorkflowRailProgress(bounds, 9000)).toBe(1);
    expect(getWorkflowRailProgress(bounds, bounds[3]!.bottom)).toBe(1);
    expect(getWorkflowRailProgress([], 100)).toBe(0);
    expect(getWorkflowRailProgress(cards(1, 400), 200)).toBe(0);
  });

  it("sits at i/(n-1) on card i's midpoint", () => {
    expect(getWorkflowRailProgress(bounds, 250)).toBe(0);
    expect(getWorkflowRailProgress(bounds, 750)).toBeCloseTo(1 / 3);
    expect(getWorkflowRailProgress(bounds, 1250)).toBeCloseTo(2 / 3);
    expect(getWorkflowRailProgress(bounds, 1750)).toBe(1);
  });

  it("interpolates between adjacent midpoints", () => {
    expect(getWorkflowRailProgress(bounds, 500)).toBeCloseTo(1 / 6);
  });
});

describe("workflow edge reveal", () => {
  const slot = 200;
  const range = WORKFLOW_EDGE_RANGE_PX;
  const chrome = 56;
  const videoBottom = 600;
  const cardBottom = slot + 280;

  it("is fully visible on the slot and gone at ±range", () => {
    expect(getWorkflowEdgeReveal(slot, slot, range)).toBe(1);
    expect(getWorkflowEdgeReveal(slot + range, slot, range)).toBe(0);
    expect(getWorkflowEdgeReveal(slot - range, slot, range)).toBe(0);
  });

  it("is reverse-symmetric about the slot", () => {
    expect(getWorkflowEdgeReveal(slot + 80, slot, range)).toBeCloseTo(
      getWorkflowEdgeReveal(slot - 80, slot, range),
    );
  });

  it("uses smoothStep so the approach is not linear", () => {
    const quarter = getWorkflowEdgeReveal(slot + range * 0.75, slot, range);
    expect(quarter).toBeCloseTo(smoothStep(0.25));
    expect(quarter).not.toBeCloseTo(0.25);
  });

  it("blurs the first card in while the viewer is still approaching the pin", () => {
    expect(
      getWorkflowFirstReveal(slot - range, slot, chrome + 400, chrome, range),
    ).toBe(0);
    expect(
      getWorkflowFirstReveal(
        slot - range / 2,
        slot,
        chrome + 400,
        chrome,
        range,
      ),
    ).toBeCloseTo(smoothStep(0.5));
  });

  it("does not blur the first card out once the next card starts pushing", () => {
    expect(
      getWorkflowFirstReveal(slot - range, slot, chrome, chrome, range),
    ).toBeNull();
    expect(
      getWorkflowFirstReveal(slot - 40, slot, chrome, chrome, range),
    ).toBeNull();
    expect(getWorkflowFirstReveal(slot, slot, chrome, chrome, range)).toBeNull();
  });

  it("holds at 1 while the card overlaps the video and falls below its bottom", () => {
    expect(getWorkflowBelowReveal(slot, videoBottom, range)).toBe(1);
    expect(getWorkflowBelowReveal(videoBottom, videoBottom, range)).toBe(1);
    expect(
      getWorkflowBelowReveal(videoBottom + range, videoBottom, range),
    ).toBe(0);
    expect(
      getWorkflowBelowReveal(videoBottom + range / 2, videoBottom, range),
    ).toBeCloseTo(smoothStep(0.5));
  });

  it("does not blur a last card that is still below the slot while pinned", () => {
    expect(
      getWorkflowLastReveal(
        slot + 80,
        slot + 80 + 280,
        slot,
        videoBottom,
        chrome,
        chrome,
        range,
      ),
    ).toBeNull();
    expect(
      getWorkflowLastReveal(
        slot + range,
        slot + range + 280,
        slot,
        videoBottom,
        chrome,
        chrome,
        range,
      ),
    ).toBeNull();
  });

  it("keeps a parked last card sharp while the viewer is still pinned", () => {
    expect(
      getWorkflowLastReveal(
        slot,
        cardBottom,
        slot,
        videoBottom,
        chrome,
        chrome,
        range,
      ),
    ).toBeNull();
  });

  it("fades a last card upward off the slot while pinned", () => {
    expect(
      getWorkflowLastReveal(
        slot - range,
        slot - range + 280,
        slot,
        videoBottom,
        chrome,
        chrome,
        range,
      ),
    ).toBe(0);
    expect(
      getWorkflowLastReveal(
        slot - range / 2,
        slot - range / 2 + 280,
        slot,
        videoBottom,
        chrome,
        chrome,
        range,
      ),
    ).toBeCloseTo(smoothStep(0.5));
  });

  it("does not blur an unpinned last card that still sits inside the video", () => {
    expect(
      getWorkflowLastReveal(slot, cardBottom, 40, 500, 0, chrome, range),
    ).toBeNull();
  });

  it("fades an unpinned last card once its bottom has passed the video bottom", () => {
    expect(
      getWorkflowLastReveal(
        slot,
        cardBottom,
        -360,
        cardBottom - range,
        0,
        chrome,
        range,
      ),
    ).toBe(0);
    expect(
      getWorkflowLastReveal(
        slot,
        cardBottom,
        -200,
        cardBottom - range / 2,
        0,
        chrome,
        range,
      ),
    ).toBeCloseTo(smoothStep(0.5));
  });

  it("keeps the rail locked to the video, and shares enter and leave fades", () => {
    expect(getWorkflowRailFollow(null, null)).toEqual({
      offsetY: 0,
      reveal: null,
    });
    expect(getWorkflowRailFollow(0.3, null)).toEqual({
      offsetY: 0,
      reveal: 0.3,
    });
    expect(getWorkflowRailFollow(0.3, 0.2)).toEqual({
      offsetY: 0,
      reveal: 0.2,
    });
  });
});

describe("workflow sticky top", () => {
  it("parks at the slot while the panel still covers the card", () => {
    expect(getWorkflowStickyTop(100, 900, 200, 180)).toBe(180);
  });

  it("follows the panel while approaching from below", () => {
    expect(getWorkflowStickyTop(400, 900, 200, 180)).toBe(400);
  });

  it("releases with the panel bottom once the runway runs out", () => {
    expect(getWorkflowStickyTop(40, 300, 200, 180)).toBe(100);
  });
});

describe("cubicBezier", () => {
  const { x1, y1, x2, y2 } = WORKFLOW_PUSH_EASE;

  it("is identity at the endpoints", () => {
    expect(cubicBezier(x1, y1, x2, y2, 0)).toBe(0);
    expect(cubicBezier(x1, y1, x2, y2, 1)).toBe(1);
  });

  it("clamps outside [0, 1]", () => {
    expect(cubicBezier(x1, y1, x2, y2, -1)).toBe(0);
    expect(cubicBezier(x1, y1, x2, y2, 2)).toBe(1);
  });

  it("is symmetric ease-in-out at the midpoint", () => {
    expect(cubicBezier(x1, y1, x2, y2, 0.5)).toBeCloseTo(0.5);
  });

  it("lags linear in the first half and leads in the second", () => {
    expect(cubicBezier(x1, y1, x2, y2, 0.25)).toBeLessThan(0.25);
    expect(cubicBezier(x1, y1, x2, y2, 0.75)).toBeGreaterThan(0.75);
  });

  it("still solves a curve whose x controls are reversed", () => {
    // --ease-move: x1 > x2. Newton-only solvers can miss this.
    expect(cubicBezier(0.77, 0, 0.175, 1, 0)).toBe(0);
    expect(cubicBezier(0.77, 0, 0.175, 1, 1)).toBe(1);
    expect(cubicBezier(0.77, 0, 0.175, 1, 0.5)).toBeGreaterThan(0);
    expect(cubicBezier(0.77, 0, 0.175, 1, 0.5)).toBeLessThan(1);
  });
});

describe("workflow push offset", () => {
  const slot = 200;
  const distance = 360;

  it("returns null while the lead card is still parked", () => {
    expect(getWorkflowPushOffset([slot, slot + 800], slot)).toBeNull();
  });

  it("returns null once the next card has parked", () => {
    expect(getWorkflowPushOffset([slot - distance, slot], slot)).toBeNull();
  });

  it("eases a mid-push pair away from linear sticky", () => {
    const layoutTops = [slot - 40, slot - 40 + distance];
    const push = getWorkflowPushOffset(layoutTops, slot);
    expect(push).not.toBeNull();
    expect(push!.index).toBe(0);
    expect(push!.t).toBeCloseTo(40 / distance);
    expect(push!.distance).toBe(distance);
    expect(push!.offsetY).not.toBe(0);
    expect(push!.offsetY).toBeCloseTo(
      getWorkflowPushCorrection(push!.t, distance),
    );
  });

  it("is zero at the synthetic endpoints", () => {
    expect(getWorkflowPushCorrection(0, distance)).toBe(0);
    expect(getWorkflowPushCorrection(1, distance)).toBe(0);
  });

  it("does not divide by zero when two tops coincide", () => {
    expect(getWorkflowPushOffset([slot - 1, slot - 1], slot)).toBeNull();
    expect(getWorkflowPushCorrection(0.4, 0)).toBe(0);
  });

  it("keeps the layout gap after the shared visual correction", () => {
    const height = 220;
    const layoutTops = [slot - 80, slot - 80 + distance];
    const push = getWorkflowPushOffset(layoutTops, slot);
    const visuals = getWorkflowVisualBounds(layoutTops, [height, height], push);
    expect(visuals[1]!.top - visuals[0]!.bottom).toBeCloseTo(distance - height);
  });

  it("is a pure function of layout tops, so reverse scroll is just a smaller t", () => {
    const later = getWorkflowPushOffset([slot - 90, slot - 90 + distance], slot);
    const earlier = getWorkflowPushOffset(
      [slot - 30, slot - 30 + distance],
      slot,
    );
    expect(later!.t).toBeGreaterThan(earlier!.t);
    expect(
      getWorkflowPushOffset([slot - 90, slot - 90 + distance], slot),
    ).toEqual(later);
  });

  it("picks the pair that currently straddles the slot", () => {
    const push = getWorkflowPushOffset(
      [slot - distance - 40, slot - 40, slot - 40 + distance],
      slot,
    );
    expect(push!.index).toBe(1);
    expect(push!.t).toBeCloseTo(40 / distance);
  });
});
