/**
 * Pure math behind the agent reliability calculator. Kept free of React and
 * of browser APIs so it prerenders and can be unit tested on its own.
 *
 * The model is deliberately the simple one from "Your agent has a half-life":
 * every step succeeds independently with the same probability `p`, a failed
 * step is noticed at once, and a retry is a fresh, independent attempt. Real
 * agents break those assumptions (see the post), so the outputs are a floor
 * for planning, not a prediction.
 */

/**
 * What a failed piece does to the rest of a run.
 * - `stop`: the run ends, and the next run resumes at the failed piece. Right
 *   for order-dependent pieces, where piece 4 needs piece 3's output.
 * - `skip`: the run carries on with the next piece, and the next run retries
 *   only the pieces that failed. Right for a loop over independent items, like
 *   one report per client.
 */
export type FailureMode = "stop" | "skip";

export type ReliabilityInput = {
  /** Chance a single step succeeds, from 0 to 1. */
  readonly stepSuccess: number;
  /** Total steps in the job. */
  readonly steps: number;
  /**
   * How many resumable pieces the job is cut into. 1 means no checkpoints: a
   * failure anywhere restarts the whole job.
   */
  readonly pieces: number;
  /** Run budget for the "done within N runs" figure. */
  readonly runs: number;
  readonly onFailure: FailureMode;
};

export type ReliabilityPlan = {
  /** Chance one run finishes the whole job. */
  readonly onePass: number;
  /** Mean share of the job's steps that are done after the first run. */
  readonly doneAfterFirstRun: number;
  /** Mean number of runs until the job is finished. */
  readonly expectedRuns: number;
  /** Mean steps executed in total, including steps that are redone. */
  readonly expectedSteps: number;
  /** Chance the job is finished within the run budget. */
  readonly doneWithinRuns: number;
};

export type ReliabilityResult = {
  readonly input: ReliabilityInput;
  /** Piece sizes, largest first. Sums to `steps`. */
  readonly pieceSizes: readonly number[];
  /** Chance the largest piece finishes on its first try. */
  readonly largestPieceFirstTry: number;
  /** Steps at which one-pass success falls to 50%. */
  readonly halfLifeSteps: number;
  readonly withoutCheckpoints: ReliabilityPlan;
  readonly withCheckpoints: ReliabilityPlan;
};

/** Chance that `steps` independent steps all succeed. */
export function onePassSuccess(stepSuccess: number, steps: number): number {
  return stepSuccess ** steps;
}

/**
 * Splits `steps` into `pieces` resumable pieces as evenly as possible, largest
 * first. Pieces never outnumber steps, and every piece has at least one step.
 */
export function splitSteps(steps: number, pieces: number): number[] {
  const count = Math.max(1, Math.min(Math.floor(pieces), steps));
  const base = Math.floor(steps / count);
  const extra = steps % count;
  return Array.from({ length: count }, (_, index) =>
    index < extra ? base + 1 : base,
  );
}

/**
 * Mean attempts until a piece of `size` steps succeeds when every failure
 * restarts that piece. Geometric: 1 / p^size. Infinite when it never can.
 */
export function expectedRunsForPiece(stepSuccess: number, size: number) {
  const q = onePassSuccess(stepSuccess, size);
  return q === 0 ? Infinity : 1 / q;
}

/**
 * Mean steps executed until a piece of `size` steps succeeds, counting the
 * step that failed as executed work. One attempt runs
 * (1 - p^size) / (1 - p) steps on average, and there are 1 / p^size attempts.
 */
export function expectedStepsForPiece(stepSuccess: number, size: number) {
  if (stepSuccess >= 1) return size;
  const q = onePassSuccess(stepSuccess, size);
  if (q === 0) return Infinity;
  return (1 - q) / ((1 - stepSuccess) * q);
}

/**
 * Stop mode: chance the job finishes within `runs` runs. The job needs one
 * run plus one more per failure, and failures per piece are geometric, so
 * this convolves those distributions up to `runs - 1` failures in total.
 */
export function chanceDoneWithinRuns(
  stepSuccess: number,
  pieceSizes: readonly number[],
  runs: number,
): number {
  const budget = Math.floor(runs) - 1;
  if (budget < 0) return 0;
  // distribution[f] = chance of exactly f failures so far.
  let distribution = [1, ...Array<number>(budget).fill(0)];
  for (const size of pieceSizes) {
    const success = onePassSuccess(stepSuccess, size);
    const next = Array<number>(budget + 1).fill(0);
    for (let soFar = 0; soFar <= budget; soFar += 1) {
      const weight = distribution[soFar] ?? 0;
      if (weight === 0) continue;
      let failureChance = 1;
      for (let more = 0; soFar + more <= budget; more += 1) {
        next[soFar + more]! += weight * failureChance * success;
        failureChance *= 1 - success;
      }
    }
    distribution = next;
  }
  return Math.min(
    1,
    distribution.reduce((sum, value) => sum + value, 0),
  );
}

/**
 * Skip mode: every unfinished piece gets one attempt per run, so the job is
 * done within `runs` runs when each piece succeeds at least once in `runs`
 * independent tries.
 */
export function chanceAllDoneWithinRuns(
  stepSuccess: number,
  pieceSizes: readonly number[],
  runs: number,
): number {
  const tries = Math.floor(runs);
  if (tries < 1) return 0;
  return pieceSizes.reduce(
    (product, size) =>
      product * (1 - (1 - onePassSuccess(stepSuccess, size)) ** tries),
    1,
  );
}

/** Beyond this many runs the figure is shown as "over 100,000". */
export const RUNS_CEILING = 100_000;

/**
 * Skip mode: mean runs until every piece has succeeded, the expected maximum
 * of independent geometric variables: the sum over r of P(not done after r).
 * An even split has at most two piece sizes, so each term is cheap. Returns
 * Infinity once the answer is known to pass `RUNS_CEILING`.
 */
export function expectedRunsUntilAllDone(
  stepSuccess: number,
  pieceSizes: readonly number[],
): number {
  const counts = new Map<number, number>();
  for (const size of pieceSizes) {
    counts.set(size, (counts.get(size) ?? 0) + 1);
  }
  const groups = [...counts].map(([size, count]) => ({
    miss: 1 - onePassSuccess(stepSuccess, size),
    count,
  }));
  // The slowest piece alone needs 1 / q runs on average.
  if (groups.some(({ miss }) => 1 - miss < 1 / RUNS_CEILING)) return Infinity;

  let total = 0;
  for (let run = 0; run < RUNS_CEILING * 40; run += 1) {
    const allDone = groups.reduce(
      (product, { miss, count }) => product * (1 - miss ** run) ** count,
      1,
    );
    const notDone = 1 - allDone;
    total += notDone;
    if (notDone < 1e-12) return total;
  }
  return Infinity;
}

/** Steps at which one-pass success halves: ln 2 / -ln p. */
export function halfLifeSteps(stepSuccess: number): number {
  if (stepSuccess >= 1) return Infinity;
  if (stepSuccess <= 0) return 0;
  return Math.LN2 / -Math.log(stepSuccess);
}

/**
 * Mean share of steps finished by the first run. In stop mode a piece only
 * counts if every piece before it also finished; in skip mode each piece
 * counts on its own.
 */
function firstRunShare(
  stepSuccess: number,
  pieceSizes: readonly number[],
  onFailure: FailureMode,
): number {
  const steps = pieceSizes.reduce((sum, size) => sum + size, 0);
  let reachChance = 1;
  let doneSteps = 0;
  for (const size of pieceSizes) {
    const q = onePassSuccess(stepSuccess, size);
    if (onFailure === "stop") {
      reachChance *= q;
      doneSteps += reachChance * size;
    } else {
      doneSteps += q * size;
    }
  }
  return steps === 0 ? 1 : doneSteps / steps;
}

function planFor(
  input: ReliabilityInput,
  pieceSizes: readonly number[],
): ReliabilityPlan {
  const { stepSuccess, steps, runs, onFailure } = input;
  const expectedRuns =
    onFailure === "stop"
      ? 1 +
        pieceSizes.reduce(
          (sum, size) => sum + (expectedRunsForPiece(stepSuccess, size) - 1),
          0,
        )
      : expectedRunsUntilAllDone(stepSuccess, pieceSizes);
  return {
    onePass: onePassSuccess(stepSuccess, steps),
    doneAfterFirstRun: firstRunShare(stepSuccess, pieceSizes, onFailure),
    expectedRuns,
    // Every piece is retried until it succeeds in both modes, so the work
    // executed is the same. Only how it is spread across runs differs.
    expectedSteps: pieceSizes.reduce(
      (sum, size) => sum + expectedStepsForPiece(stepSuccess, size),
      0,
    ),
    doneWithinRuns:
      onFailure === "stop"
        ? chanceDoneWithinRuns(stepSuccess, pieceSizes, runs)
        : chanceAllDoneWithinRuns(stepSuccess, pieceSizes, runs),
  };
}

export function analyseReliability(input: ReliabilityInput): ReliabilityResult {
  const pieceSizes = splitSteps(input.steps, input.pieces);
  return {
    input,
    pieceSizes,
    largestPieceFirstTry: onePassSuccess(input.stepSuccess, pieceSizes[0]!),
    halfLifeSteps: halfLifeSteps(input.stepSuccess),
    withoutCheckpoints: planFor(input, [input.steps]),
    withCheckpoints: planFor(input, pieceSizes),
  };
}

/**
 * Formats a probability for reading aloud as well as on screen. Never rounds a
 * near-certain outcome up to 100% or a tiny one down to 0%, because both would
 * misstate the point of the calculator.
 */
export function formatChance(value: number): string {
  if (value >= 1) return "100%";
  if (value <= 0) return "0%";
  const percent = value * 100;
  if (percent < 0.1) return "under 0.1%";
  if (percent > 99.9) return "over 99.9%";
  return `${Number(percent.toFixed(1))}%`;
}

/** Formats a mean count of runs or steps, capping absurd values in words. */
export function formatCount(value: number): string {
  if (!Number.isFinite(value) || value >= RUNS_CEILING) return "over 100,000";
  if (value >= 100) return Math.round(value).toLocaleString("en-US");
  return `${Number(value.toFixed(1))}`;
}
