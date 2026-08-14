import { describe, expect, it } from "vitest";

import {
  CLIPPY_DELAY_MS,
  CLIPPY_MIN_DWELL_MS,
  beatsFor,
  clippyCopy,
  ctaSource,
  getClippyPageKind,
  initialClippyTimer,
  resetClippyDelayOverride,
  resolveClippyDelay,
  shouldRevealClippy,
  tickClippyTimer,
  type ClippyPageKind,
} from "./clippy-state";

const pageKinds: ClippyPageKind[] = [
  "blog-post",
  "blog-browse",
  "home",
  "page",
];

describe("clippy page kinds", () => {
  it("classifies canonical routes from the route manifest", () => {
    expect(getClippyPageKind("/")).toBe("home");
    expect(getClippyPageKind("/blog/")).toBe("blog-browse");
    expect(getClippyPageKind("/authors/")).toBe("blog-browse");
    expect(getClippyPageKind("/authors/ankush/")).toBe("blog-browse");
    expect(getClippyPageKind("/blog/ai-agent-memory/")).toBe("blog-post");
    expect(getClippyPageKind("/blog/construct-vs-zapier/")).toBe("blog-post");
    expect(getClippyPageKind("/about/")).toBe("page");
    expect(getClippyPageKind("/careers/")).toBe("page");
    expect(getClippyPageKind("/pricing/")).toBe("page");
    expect(getClippyPageKind("/use-cases/")).toBe("page");
    expect(getClippyPageKind("/use-cases/memory/")).toBe("page");
  });

  it("treats both trailing slash forms the same", () => {
    expect(getClippyPageKind("/blog")).toBe(getClippyPageKind("/blog/"));
    expect(getClippyPageKind("/about")).toBe(getClippyPageKind("/about/"));
  });

  it("stays silent on legal, support, error, and unknown pages", () => {
    for (const path of [
      "/privacy/",
      "/sub-processors/",
      "/terms/",
      "/editorial-policy/",
      "/support/",
      "/404",
      "/nope/",
      "/blog/not-a-real-post/",
    ]) {
      expect(getClippyPageKind(path), path).toBeNull();
    }
  });
});

describe("clippy script", () => {
  it("runs one line for every page kind, with no advance chip", () => {
    for (const kind of pageKinds) {
      const beats = beatsFor(kind);
      expect(beats, kind).toHaveLength(1);
      expect(beats[0]?.line, kind).toBeTruthy();
    }
  });

  it("opens differently per page kind", () => {
    const openers = pageKinds.map((kind) => beatsFor(kind)[0]?.line);
    expect(new Set(openers).size).toBe(pageKinds.length);
  });

  /**
   * The desktop bubble sizes to its content but caps at ~288px, leaving roughly
   * 248px of inner width and two clamped lines. Mobile uses the same clamp.
   * Longer copy is silently truncated with an ellipsis rather than wrapping,
   * so the ceiling is real.
   */
  it("keeps every line inside the two line clamp budget", () => {
    for (const kind of pageKinds) {
      for (const beat of beatsFor(kind)) {
        expect(beat.line.length, beat.line).toBeLessThanOrEqual(70);
      }
    }
  });

  it("keeps reader facing copy free of em and en dashes", () => {
    expect(clippyCopy.join(" ")).not.toMatch(/[–—]/);
  });

  it("names the analytics source by page kind", () => {
    expect(ctaSource("blog-post")).toBe("clippy_blog_post_1");
    expect(ctaSource("home")).toBe("clippy_home_1");
  });
});

describe("clippy dwell timer", () => {
  it("counts foreground time only", () => {
    let timer = initialClippyTimer;
    timer = tickClippyTimer(timer, 1_000, true); // first visible tick just anchors
    expect(timer.elapsedMs).toBe(0);
    timer = tickClippyTimer(timer, 2_000, true);
    expect(timer.elapsedMs).toBe(1_000);
  });

  it("banks nothing while the tab is in the background", () => {
    let timer = initialClippyTimer;
    timer = tickClippyTimer(timer, 1_000, true);
    timer = tickClippyTimer(timer, 2_000, true);
    timer = tickClippyTimer(timer, 3_000, false);
    expect(timer.elapsedMs).toBe(1_000);

    // Returning does not credit the gap: the first visible tick re-anchors.
    timer = tickClippyTimer(timer, 90_000, true);
    expect(timer.elapsedMs).toBe(1_000);
    timer = tickClippyTimer(timer, 91_000, true);
    expect(timer.elapsedMs).toBe(2_000);
  });

  it("caps a single tick so a sleeping machine cannot bank an hour", () => {
    let timer = tickClippyTimer(initialClippyTimer, 0, true);
    timer = tickClippyTimer(timer, 3_600_000, true);
    expect(timer.elapsedMs).toBe(2_000);
  });
});

describe("clippy reveal gate", () => {
  const ready = {
    elapsedMs: CLIPPY_DELAY_MS,
    delayMs: CLIPPY_DELAY_MS,
    dwellMs: CLIPPY_MIN_DWELL_MS,
    minDwellMs: CLIPPY_MIN_DWELL_MS,
  };

  it("stays closed until the reader has interacted", () => {
    expect(shouldRevealClippy({ ...ready, hasInteracted: false })).toBe(false);
  });

  it("opens once dwell, delay, and a first interaction are all met", () => {
    expect(shouldRevealClippy({ ...ready, hasInteracted: true })).toBe(true);
  });

  it("still waits for the delay after an interaction", () => {
    expect(
      shouldRevealClippy({
        ...ready,
        hasInteracted: true,
        elapsedMs: CLIPPY_DELAY_MS - 1,
      }),
    ).toBe(false);
  });
});

describe("clippy delay override", () => {
  it("defaults to the real delay", () => {
    resetClippyDelayOverride();
    expect(resolveClippyDelay("")).toBe(CLIPPY_DELAY_MS);
    expect(resolveClippyDelay("?utm_source=x")).toBe(CLIPPY_DELAY_MS);
  });

  it("arms immediately for tests and design review", () => {
    resetClippyDelayOverride();
    expect(resolveClippyDelay("?clippy=now")).toBe(0);
  });

  it("can be switched off entirely", () => {
    resetClippyDelayOverride();
    expect(resolveClippyDelay("?clippy=off")).toBeNull();
    resetClippyDelayOverride();
    expect(resolveClippyDelay("?clippy=0")).toBeNull();
  });

  it("keeps off latched across later URLs until reset", () => {
    resetClippyDelayOverride();
    expect(resolveClippyDelay("?clippy=off")).toBeNull();
    expect(resolveClippyDelay("")).toBeNull();
    expect(resolveClippyDelay("?clippy=now")).toBeNull();
    resetClippyDelayOverride();
    expect(resolveClippyDelay("?clippy=now")).toBe(0);
  });
});
