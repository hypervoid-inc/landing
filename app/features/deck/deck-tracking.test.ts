import { describe, expect, it } from "vitest";

import {
  createSlideClock,
  passedVideoMarks,
  readingIndex,
  recipientFromSearch,
} from "./deck-tracking";

describe("recipientFromSearch", () => {
  it("reads an id from ?r=", () => {
    expect(recipientFromSearch("?r=acme-ventures")).toBe("acme-ventures");
    expect(recipientFromSearch("?r=inv_042.A")).toBe("inv_042.A");
  });

  it("refuses anything that isn't an id", () => {
    expect(recipientFromSearch("")).toBeNull();
    expect(recipientFromSearch("?r=")).toBeNull();
    expect(recipientFromSearch("?r=jane@acme.vc")).toBeNull();
    expect(recipientFromSearch("?r=acme%20ventures")).toBeNull();
    expect(recipientFromSearch(`?r=${"a".repeat(65)}`)).toBeNull();
  });
});

describe("createSlideClock", () => {
  function clock() {
    let t = 0;
    const c = createSlideClock(() => t);
    return { c, advance: (ms: number) => (t += ms) };
  }

  it("closes each stretch on a slide when the next one starts", () => {
    const { c, advance } = clock();
    expect(c.enter(1)).toEqual({ left: null, firstView: true });
    advance(4_000);
    expect(c.enter(2)).toEqual({ left: { slide: 1, seconds: 4 }, firstView: true });
    advance(2_500);
    expect(c.enter(1)).toEqual({ left: { slide: 2, seconds: 2.5 }, firstView: false });
    expect(c.seenCount).toBe(2);
  });

  it("ignores re-entering the slide it is on", () => {
    const { c, advance } = clock();
    c.enter(3);
    advance(1_000);
    expect(c.enter(3)).toEqual({ left: null, firstView: false });
    advance(1_000);
    expect(c.pause()).toEqual({ slide: 3, seconds: 2 });
  });

  it("does not count time while the tab is hidden", () => {
    const { c, advance } = clock();
    c.enter(1);
    advance(3_000);
    expect(c.pause()).toEqual({ slide: 1, seconds: 3 });
    advance(60_000);
    expect(c.pause()).toBeNull();
    expect(c.resume()).toBe(1);
    advance(2_000);
    expect(c.enter(2).left).toEqual({ slide: 1, seconds: 2 });
    advance(1_000);
    expect(c.totalSeconds()).toBe(6);
  });

  it("does not resume a clock that never started", () => {
    const { c } = clock();
    expect(c.pause()).toBeNull();
    expect(c.resume()).toBeNull();
  });

  it("totals each slide across visits, the open stretch included", () => {
    const { c, advance } = clock();
    c.enter(1);
    advance(3_000);
    c.enter(3);
    advance(2_000);
    c.enter(1);
    advance(1_500);
    expect(c.secondsBySlide(4)).toEqual([4.5, 0, 2, 0]);
    expect(c.current).toBe(1);
  });
});

describe("passedVideoMarks", () => {
  it("reports each mark once", () => {
    expect(passedVideoMarks(30, 100, new Set())).toEqual([25]);
    expect(passedVideoMarks(80, 100, new Set([25]))).toEqual([50, 75]);
    expect(passedVideoMarks(99.5, 100, new Set([25, 50, 75]))).toEqual([100]);
  });

  it("waits for a duration", () => {
    expect(passedVideoMarks(10, 0, new Set())).toEqual([]);
    expect(passedVideoMarks(10, Number.NaN, new Set())).toEqual([]);
  });
});

describe("readingIndex", () => {
  // A phone feed: 220px slides 8px apart, an 800px screen, three and a half visible.
  const feed = (scrollY: number) =>
    Array.from({ length: 12 }, (_, i) => ({ top: 8 + i * 228 - scrollY, bottom: 228 + i * 228 - scrollY }));
  const max = 12 * 228 + 96 - 800;

  it("reads the first slide at the top and the last at the bottom", () => {
    expect(readingIndex(feed(0), 0, 800)).toBe(0);
    expect(readingIndex(feed(max), 1, 800)).toBe(11);
  });

  it("follows the slides in between", () => {
    const seen = [0, 0.25, 0.5, 0.75, 1].map((p) => readingIndex(feed(p * max), p, 800));
    expect(seen).toEqual([...seen].sort((a, b) => a - b));
    expect(new Set(seen).size).toBe(5);
  });

  it("lands on each page of a one-slide-per-screen deck", () => {
    const pages = (k: number) => Array.from({ length: 12 }, (_, i) => ({ top: (i - k) * 900, bottom: (i - k + 1) * 900 }));
    for (let k = 0; k < 12; k++) expect(readingIndex(pages(k), k / 11, 900)).toBe(k);
  });

  it("keeps a jump's target while it's on screen", () => {
    expect(readingIndex(feed(0), 0, 800, 2)).toBe(2);
    expect(readingIndex(feed(0), 0, 800, 9)).toBe(0);
  });
});
