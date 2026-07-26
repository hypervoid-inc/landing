import { describe, expect, it } from "vitest";

import {
  getHeldWorkflowPosition,
  getMobileWorkflowViewportMode,
  getSoftPinOffset,
  getWorkflowScrollScreens,
} from "./workflow-motion";

describe("workflow motion", () => {
  it("holds each demo before crossing through the midpoint", () => {
    expect(getHeldWorkflowPosition(0.3, 2)).toBe(0);
    expect(getHeldWorkflowPosition(0.5, 2)).toBeCloseTo(0.5);
    expect(getHeldWorkflowPosition(0.7, 2)).toBe(1);
  });

  it("gives every capability an equal reading hold", () => {
    expect(getHeldWorkflowPosition(0.08, 8)).toBe(0);
    expect(getHeldWorkflowPosition(0.17, 8)).toBe(1);
    expect(getHeldWorkflowPosition(0.95, 8)).toBe(7);
  });

  it("gives additional stories enough pinned scroll room", () => {
    expect(getWorkflowScrollScreens(2, true)).toBeCloseTo(1.86);
    expect(getWorkflowScrollScreens(8, true)).toBeCloseTo(8.52);
    expect(getWorkflowScrollScreens(8, false)).toBeCloseTo(8.1792);
  });

  it("softens both edges of a pinned section", () => {
    expect(getSoftPinOffset(0, 1000, 60, 120)).toBe(0);
    expect(getSoftPinOffset(0.5, 1000, 60, 120)).toBe(-60);
    expect(getSoftPinOffset(1, 1000, 60, 120)).toBe(-120);
  });

  it("preserves normal, compact, and short mobile viewport modes", () => {
    expect(getMobileWorkflowViewportMode(800)).toBe("normal");
    expect(getMobileWorkflowViewportMode(740)).toBe("compact");
    expect(getMobileWorkflowViewportMode(640)).toBe("short");
  });
});
