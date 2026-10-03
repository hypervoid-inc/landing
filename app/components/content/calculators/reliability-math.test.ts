import { describe, expect, it } from "vitest";

import {
  analyseReliability,
  chanceAllDoneWithinRuns,
  chanceDoneWithinRuns,
  expectedRunsUntilAllDone,
  expectedRunsForPiece,
  expectedStepsForPiece,
  formatChance,
  formatCount,
  halfLifeSteps,
  onePassSuccess,
  splitSteps,
} from "./reliability-math";

describe("reliability math", () => {
  it("reproduces the figures in the half-life post", () => {
    expect(onePassSuccess(0.95, 10)).toBeCloseTo(0.5987, 4);
    expect(onePassSuccess(0.99, 48)).toBeCloseTo(0.6173, 4);
    expect(onePassSuccess(0.95, 48)).toBeCloseTo(0.0853, 4);
    expect(onePassSuccess(0.9, 48)).toBeCloseTo(0.0064, 4);
    expect(onePassSuccess(0.95, 6)).toBeCloseTo(0.7351, 4);
  });

  it("splits steps evenly, largest pieces first", () => {
    expect(splitSteps(48, 8)).toEqual([6, 6, 6, 6, 6, 6, 6, 6]);
    expect(splitSteps(10, 3)).toEqual([4, 3, 3]);
    expect(splitSteps(5, 1)).toEqual([5]);
    // More pieces than steps collapses to one step per piece.
    expect(splitSteps(3, 10)).toEqual([1, 1, 1]);
    expect(splitSteps(7, 0)).toEqual([7]);
  });

  it("uses the geometric mean for runs and steps", () => {
    expect(expectedRunsForPiece(0.95, 48)).toBeCloseTo(11.729, 3);
    expect(expectedRunsForPiece(1, 48)).toBe(1);
    expect(expectedRunsForPiece(0, 3)).toBe(Infinity);

    // One step at p = 0.5: two attempts on average, one step each.
    expect(expectedStepsForPiece(0.5, 1)).toBeCloseTo(2, 10);
    // Two steps at p = 0.5: (1 - 0.25) / (0.5 * 0.25) = 6.
    expect(expectedStepsForPiece(0.5, 2)).toBeCloseTo(6, 10);
    expect(expectedStepsForPiece(1, 12)).toBe(12);
  });

  it("matches a closed form when there are no checkpoints", () => {
    const q = onePassSuccess(0.95, 48);
    expect(chanceDoneWithinRuns(0.95, [48], 1)).toBeCloseTo(q, 10);
    expect(chanceDoneWithinRuns(0.95, [48], 3)).toBeCloseTo(
      1 - (1 - q) ** 3,
      10,
    );
    expect(chanceDoneWithinRuns(0.95, [48], 0)).toBe(0);
  });

  it("matches a hand count for two pieces", () => {
    // Two one-step pieces at p = 0.5. Done within two runs means at most one
    // failure in total. P(0 failures) = 0.5 * 0.5 = 0.25, and P(1 failure) =
    // 2 * (0.5 * 0.5) * 0.5 = 0.25, one failure in either piece.
    expect(chanceDoneWithinRuns(0.5, [1, 1], 2)).toBeCloseTo(0.5, 10);
    expect(chanceDoneWithinRuns(0.5, [1, 1], 1)).toBeCloseTo(0.25, 10);
  });

  it("shows checkpoints cutting redone work without changing one-pass odds", () => {
    const result = analyseReliability({
      stepSuccess: 0.95,
      steps: 48,
      pieces: 8,
      runs: 3,
      onFailure: "stop",
    });
    const { withoutCheckpoints: whole, withCheckpoints: cut } = result;

    expect(cut.onePass).toBe(whole.onePass);
    expect(whole.expectedRuns).toBeCloseTo(11.729, 3);
    // 1 + 8 * (1 / 0.95^6 - 1).
    expect(cut.expectedRuns).toBeCloseTo(1 + 8 * (1 / 0.95 ** 6 - 1), 10);
    expect(cut.expectedSteps).toBeLessThan(whole.expectedSteps);
    expect(cut.expectedSteps).toBeGreaterThan(48);
    expect(cut.doneWithinRuns).toBeGreaterThan(whole.doneWithinRuns);
    expect(result.largestPieceFirstTry).toBeCloseTo(0.7351, 4);
  });

  it("reproduces the per-client retry figures in the half-life post", () => {
    // Eight independent six-step clients: a pass lands about six of eight,
    // and after one retry about 93% of the work is done.
    const result = analyseReliability({
      stepSuccess: 0.95,
      steps: 48,
      pieces: 8,
      runs: 2,
      onFailure: "skip",
    });
    expect(result.withCheckpoints.doneAfterFirstRun * 8).toBeCloseTo(5.88, 2);
    expect(1 - (1 - 0.95 ** 6) ** 2).toBeCloseTo(0.93, 2);
    expect(result.withCheckpoints.doneWithinRuns).toBeCloseTo(
      (1 - (1 - 0.95 ** 6) ** 2) ** 8,
      10,
    );
  });

  it("takes the expected maximum of geometric runs in skip mode", () => {
    expect(expectedRunsUntilAllDone(0.5, [1])).toBeCloseTo(2, 8);
    // E[max of two Geometric(0.5)] = 2 + 2 - E[min] = 4 - 4 / 3.
    expect(expectedRunsUntilAllDone(0.5, [1, 1])).toBeCloseTo(8 / 3, 8);
    expect(chanceAllDoneWithinRuns(0.5, [1, 1], 2)).toBeCloseTo(0.5625, 10);
    expect(chanceAllDoneWithinRuns(0.5, [1], 0)).toBe(0);
    // One piece behaves the same in both modes.
    expect(expectedRunsUntilAllDone(0.95, [48])).toBeCloseTo(1 / 0.95 ** 48, 6);
    expect(expectedRunsUntilAllDone(0.5, [40])).toBe(Infinity);
  });

  it("keeps skip mode at or below stop mode for runs needed", () => {
    const shared = { stepSuccess: 0.95, steps: 48, pieces: 8, runs: 3 };
    const stop = analyseReliability({ ...shared, onFailure: "stop" });
    const skip = analyseReliability({ ...shared, onFailure: "skip" });
    expect(skip.withCheckpoints.expectedRuns).toBeLessThan(
      stop.withCheckpoints.expectedRuns,
    );
    expect(skip.withCheckpoints.expectedSteps).toBeCloseTo(
      stop.withCheckpoints.expectedSteps,
      10,
    );
    expect(skip.withoutCheckpoints.expectedRuns).toBeCloseTo(
      stop.withoutCheckpoints.expectedRuns,
      6,
    );
  });

  it("treats a perfect agent as finishing in one run", () => {
    const result = analyseReliability({
      stepSuccess: 1,
      steps: 200,
      pieces: 4,
      runs: 1,
      onFailure: "skip",
    });
    expect(result.withoutCheckpoints.expectedRuns).toBe(1);
    expect(result.withCheckpoints.expectedSteps).toBe(200);
    expect(result.withCheckpoints.doneWithinRuns).toBe(1);
    expect(result.halfLifeSteps).toBe(Infinity);
  });

  it("computes the half-life in steps", () => {
    expect(halfLifeSteps(0.95)).toBeCloseTo(13.51, 2);
    expect(onePassSuccess(0.95, halfLifeSteps(0.95))).toBeCloseTo(0.5, 10);
  });

  it("never rounds a tail outcome to certainty", () => {
    expect(formatChance(0.0853)).toBe("8.5%");
    expect(formatChance(0.62)).toBe("62%");
    expect(formatChance(0.00001)).toBe("under 0.1%");
    expect(formatChance(0.99999)).toBe("over 99.9%");
    expect(formatChance(1)).toBe("100%");
    expect(formatChance(0)).toBe("0%");
    expect(formatCount(11.729)).toBe("11.7");
    expect(formatCount(1234.4)).toBe("1,234");
    expect(formatCount(Infinity)).toBe("over 100,000");
  });
});
