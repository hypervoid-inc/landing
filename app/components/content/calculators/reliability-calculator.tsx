import { useState } from "react";

import {
  CalculatorFrame,
  ChoiceField,
  NumberField,
  PresetRow,
  ResultSummary,
  Stat,
  parseField,
} from "./calculator-ui";
import {
  analyseReliability,
  formatChance,
  formatCount,
  type FailureMode,
} from "./reliability-math";

const LIMITS = {
  success: { min: 50, max: 100, step: 0.1 },
  steps: { min: 1, max: 1000, step: 1 },
  pieces: { min: 1, max: 1000, step: 1 },
  runs: { min: 1, max: 100, step: 1 },
} as const;

type Fields = {
  success: string;
  steps: string;
  pieces: string;
  runs: string;
  onFailure: FailureMode;
};

/** The worked example from "Your agent has a half-life". */
const HALF_LIFE_EXAMPLE: Fields = {
  success: "95",
  steps: "48",
  pieces: "1",
  runs: "3",
  onFailure: "skip",
};

const FAILURE_MODES = [
  {
    value: "skip",
    label: "Skip it and carry on",
    hint: "Independent pieces, like one report per client. The next run retries only what failed.",
  },
  {
    value: "stop",
    label: "Stop the run",
    hint: "Each piece needs the one before it. The next run resumes at the failed piece.",
  },
] as const satisfies readonly {
  value: FailureMode;
  label: string;
  hint: string;
}[];

/**
 * Agent reliability calculator, authorable in MDX as
 * `<ReliabilityCalculator />`. Turns a per-step success rate and a step count
 * into one-pass odds, expected runs, and what resumable checkpoints change.
 */
export function ReliabilityCalculator() {
  const [fields, setFields] = useState<Fields>(HALF_LIFE_EXAMPLE);
  const set = (key: Exclude<keyof Fields, "onFailure">) => (value: string) =>
    setFields((current) => ({ ...current, [key]: value }));

  const success = parseField(
    fields.success,
    LIMITS.success.min,
    LIMITS.success.max,
  );
  const steps = parseField(fields.steps, LIMITS.steps.min, LIMITS.steps.max);
  const pieces = parseField(
    fields.pieces,
    LIMITS.pieces.min,
    LIMITS.pieces.max,
  );
  const runs = parseField(fields.runs, LIMITS.runs.min, LIMITS.runs.max);

  const result =
    success !== null && steps !== null && pieces !== null && runs !== null
      ? analyseReliability({
          stepSuccess: success / 100,
          steps: Math.round(steps),
          pieces: Math.round(pieces),
          runs: Math.round(runs),
          onFailure: fields.onFailure,
        })
      : null;

  const examples: readonly { label: string; fields: Fields }[] = [
    { label: "95%, 48 steps, one run", fields: HALF_LIFE_EXAMPLE },
    {
      label: "Same job, 8 clients that skip failures",
      fields: { ...HALF_LIFE_EXAMPLE, pieces: "8" },
    },
    {
      label: "Same job, 8 pieces that stop on failure",
      fields: { ...HALF_LIFE_EXAMPLE, pieces: "8", onFailure: "stop" },
    },
    {
      label: "99%, 48 steps",
      fields: { ...HALF_LIFE_EXAMPLE, success: "99" },
    },
  ];
  const presets = examples.map((preset) => ({
    label: preset.label,
    active:
      (Object.keys(preset.fields) as (keyof Fields)[]).every(
        (key) => key === "onFailure" || preset.fields[key] === fields[key],
      ) &&
      // The failure mode only matters once there is more than one piece.
      (preset.fields.pieces === "1" ||
        preset.fields.onFailure === fields.onFailure),
    apply: () => setFields(preset.fields),
  }));

  return (
    <CalculatorFrame
      title="Agent reliability calculator"
      intro="Enter how often each step succeeds and how long the job is. The math assumes every step succeeds or fails independently, which real agents do not quite do, so read the results as a planning floor."
    >
      <PresetRow label="Start from an example" presets={presets} />

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <NumberField
          label="Per-step success rate"
          hint="How often one step goes right, from 50 to 100."
          suffix="%"
          value={fields.success}
          onChange={set("success")}
          invalid={success === null}
          {...LIMITS.success}
        />
        <NumberField
          label="Steps in the job"
          hint="Count every tool call or action the job needs."
          suffix="steps"
          value={fields.steps}
          onChange={set("steps")}
          invalid={steps === null}
          {...LIMITS.steps}
        />
        <NumberField
          label="Resumable pieces"
          hint="1 means no checkpoints: any failure starts the job over. Finished pieces are saved and never redone."
          suffix="pieces"
          value={fields.pieces}
          onChange={set("pieces")}
          invalid={pieces === null}
          {...LIMITS.pieces}
        />
        <NumberField
          label="Runs you can afford"
          hint="For example, three nightly runs before a deadline."
          suffix="runs"
          value={fields.runs}
          onChange={set("runs")}
          invalid={runs === null}
          {...LIMITS.runs}
        />
      </div>

      <ChoiceField
        legend="When a piece fails, the run should"
        value={fields.onFailure}
        onChange={(onFailure) =>
          setFields((current) => ({ ...current, onFailure }))
        }
        options={FAILURE_MODES}
      />

      {result ? (
        <ReliabilityResults result={result} />
      ) : (
        <ResultSummary>
          Fix the highlighted field to see the result.
        </ResultSummary>
      )}
    </CalculatorFrame>
  );
}

function ReliabilityResults({
  result,
}: {
  result: ReturnType<typeof analyseReliability>;
}) {
  const { input, withoutCheckpoints: whole, withCheckpoints: cut } = result;
  const pieceCount = result.pieceSizes.length;
  const checkpointed = pieceCount > 1;
  const percent = `${Number((input.stepSuccess * 100).toFixed(1))}%`;
  const pieceLabel = `${pieceCount} pieces`;
  const pieceSize =
    result.pieceSizes[0] === result.pieceSizes[pieceCount - 1]
      ? `${result.pieceSizes[0]} steps each`
      : `${result.pieceSizes[pieceCount - 1]} to ${result.pieceSizes[0]} steps each`;
  const runWord = (count: number) => (count === 1 ? "run" : "runs");
  const modePhrase =
    input.onFailure === "skip"
      ? "where a failed piece is skipped and retried next run"
      : "where a run stops at a failed piece and the next run resumes there";

  return (
    <>
      <ResultSummary>
        At {percent} per step, a {input.steps}-step job finishes in one
        uninterrupted run {formatChance(whole.onePass)} of the time and needs
        about {formatCount(whole.expectedRuns)} runs on average if every failure
        starts over.{" "}
        {checkpointed
          ? `Cut into ${pieceLabel} (${pieceSize}) ${modePhrase}, the first run finishes ${formatChance(cut.doneAfterFirstRun)} of the work on average, the job needs about ${formatCount(cut.expectedRuns)} runs, and it is done within ${input.runs} ${runWord(input.runs)} ${formatChance(cut.doneWithinRuns)} of the time instead of ${formatChance(whole.doneWithinRuns)}.`
          : `It is done within ${input.runs} ${runWord(input.runs)} ${formatChance(whole.doneWithinRuns)} of the time. Add resumable pieces to see what checkpoints change.`}
      </ResultSummary>

      <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Finishes in one run" value={formatChance(whole.onePass)} />
        <Stat
          label={checkpointed ? "Runs needed, resumable" : "Runs needed"}
          value={formatCount(
            checkpointed ? cut.expectedRuns : whole.expectedRuns,
          )}
        />
        <Stat
          label="Half-life of this agent"
          value={
            Number.isFinite(result.halfLifeSteps)
              ? `${formatCount(result.halfLifeSteps)} steps`
              : "never"
          }
        />
      </dl>

      <div className="mt-4 overflow-x-auto" tabIndex={0}>
        <table className="w-full min-w-[440px] border-collapse bg-white text-[14px]">
          <caption className="sr-only">
            Agent reliability with and without resumable checkpoints
          </caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="border border-[#e5e7eb] bg-[#fafafa] px-3 py-2 text-left font-medium"
              >
                Measure
              </th>
              <th
                scope="col"
                className="border border-[#e5e7eb] bg-[#fafafa] px-3 py-2 text-left font-medium"
              >
                Start over on failure
              </th>
              <th
                scope="col"
                className="border border-[#e5e7eb] bg-[#fafafa] px-3 py-2 text-left font-medium"
              >
                {checkpointed
                  ? `Resumable, ${pieceLabel}`
                  : "Resumable (add pieces)"}
              </th>
            </tr>
          </thead>
          <tbody>
            <Row
              label="Finishes in one run"
              left={formatChance(whole.onePass)}
              right={formatChance(cut.onePass)}
            />
            <Row
              label="Work done after the first run, on average"
              left={formatChance(whole.doneAfterFirstRun)}
              right={formatChance(cut.doneAfterFirstRun)}
            />
            <Row
              label="Average runs to finish"
              left={formatCount(whole.expectedRuns)}
              right={formatCount(cut.expectedRuns)}
            />
            <Row
              label="Average steps executed, redone work included"
              left={formatCount(whole.expectedSteps)}
              right={formatCount(cut.expectedSteps)}
            />
            <Row
              label={`Done within ${input.runs} ${runWord(input.runs)}`}
              left={formatChance(whole.doneWithinRuns)}
              right={formatChance(cut.doneWithinRuns)}
            />
            {checkpointed && (
              <Row
                label="Largest piece finishes first try"
                left={formatChance(whole.onePass)}
                right={formatChance(result.largestPieceFirstTry)}
              />
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Row({
  label,
  left,
  right,
}: {
  label: string;
  left: string;
  right: string;
}) {
  return (
    <tr>
      <th
        scope="row"
        className="border border-[#e5e7eb] px-3 py-2 text-left font-normal"
      >
        {label}
      </th>
      <td className="border border-[#e5e7eb] px-3 py-2">{left}</td>
      <td className="border border-[#e5e7eb] px-3 py-2">{right}</td>
    </tr>
  );
}
