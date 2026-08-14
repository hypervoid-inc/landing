import { describe, expect, it } from "vitest";

import {
  getActiveWorkflowIndex,
  getWorkflowFocusLine,
  getWorkflowScrollTarget,
  getWorkflowSlotTop,
  getWorkflowStageIndex,
  getWorkflowStageProgress,
  getWorkflowStageScrollTarget,
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
      expect(
        getWorkflowStageIndex(progressAt(56 - scrolled), 3),
      ).toBe(index);
    }
    // Never scrolls above the top of the page.
    expect(
      getWorkflowStageScrollTarget(0, -9000, container, stage, 56, 0, 3),
    ).toBe(0);
  });
});
