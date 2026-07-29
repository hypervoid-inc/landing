import { describe, expect, it } from "vitest";

import {
  clampClippyPosition,
  getClippyAnchor,
  type ClippyViewport,
} from "./clippy-position";

const viewport: ClippyViewport = {
  width: 1440,
  height: 900,
  headerHeight: 56,
  margin: 28,
  widgetWidth: 420,
  widgetHeight: 200,
};

describe("clippy position", () => {
  it("rests somewhere it is allowed to be", () => {
    // The anchor must be a fixed point of the clamp, or the widget would start
    // outside its own drag bounds and jump on the first press.
    for (const v of [
      viewport,
      { ...viewport, width: 1024, height: 700 },
      { ...viewport, width: 380, height: 640 },
    ]) {
      const anchor = getClippyAnchor(v);
      expect(clampClippyPosition(anchor, v), JSON.stringify(v)).toEqual(anchor);
    }
  });

  it("rests in the bottom right corner before the visitor moves it", () => {
    expect(getClippyAnchor(viewport)).toEqual({ x: 992, y: 672 });
  });

  it("keeps the widget clear of the sticky header", () => {
    expect(clampClippyPosition({ x: 400, y: -500 }, viewport).y).toBe(84);
  });

  it("clamps to the margin on every edge", () => {
    expect(clampClippyPosition({ x: -999, y: 9_999 }, viewport)).toEqual({
      x: 28,
      y: 672,
    });
    expect(clampClippyPosition({ x: 9_999, y: -999 }, viewport)).toEqual({
      x: 992,
      y: 84,
    });
  });

  it("leaves a position that already fits untouched", () => {
    expect(clampClippyPosition({ x: 500, y: 400 }, viewport)).toEqual({
      x: 500,
      y: 400,
    });
  });

  it("never inverts bounds on a viewport smaller than the widget", () => {
    const tiny = { ...viewport, width: 200, height: 120 };
    const clamped = clampClippyPosition({ x: 999, y: 999 }, tiny);
    expect(clamped).toEqual({ x: 28, y: 84 });
  });
});
