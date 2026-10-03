import { useState } from "react";

import {
  CalculatorFrame,
  NumberField,
  PresetRow,
  ResultSummary,
  Stat,
  parseField,
} from "./calculator-ui";
import {
  analyseCost,
  formatDollars,
  formatHours,
  formatRate,
  type CostResult,
} from "./cost-math";

const LIMITS = {
  hours: { min: 1, max: 80, step: 1 },
  rate: { min: 1, max: 200, step: 0.5 },
  share: { min: 0, max: 100, step: 5 },
  taskMinutes: { min: 1, max: 480, step: 1 },
  reviewMinutes: { min: 0, max: 240, step: 1 },
  reviewerRate: { min: 0, max: 1000, step: 1 },
} as const;

type Fields = {
  hours: string;
  rate: string;
  share: string;
  taskMinutes: string;
  reviewMinutes: string;
  reviewerRate: string;
};

/**
 * 20 hours a week at $15 is Cherry Assistant's part-time definition at the
 * top of its offshore agency hourly range, which lands on $1,300 a month, the
 * top of its published part-time offshore range. The 30% share, 20-minute
 * task, and 3-minute review are illustrative and labelled as such in the post.
 */
const DEFAULTS: Fields = {
  hours: "20",
  rate: "15",
  share: "30",
  taskMinutes: "20",
  reviewMinutes: "3",
  reviewerRate: "0",
};

/** Hourly rates published by Cherry Assistant (July 2026), cited in the post. */
const RATE_PRESETS = [
  { label: "Offshore agency, low ($4)", rate: "4" },
  { label: "Offshore agency, high ($15)", rate: "15" },
  { label: "US or UK freelance, low ($18)", rate: "18" },
  { label: "US or UK freelance, high ($40)", rate: "40" },
] as const;

/**
 * AI employee vs virtual assistant cost calculator, authorable in MDX as
 * `<CostCalculator />`. Compares a VA's monthly bill with keeping the VA for
 * the remaining work plus a Construct plan and human review time.
 */
export function CostCalculator() {
  const [fields, setFields] = useState<Fields>(DEFAULTS);
  const set = (key: keyof Fields) => (value: string) =>
    setFields((current) => ({ ...current, [key]: value }));

  const hours = parseField(fields.hours, LIMITS.hours.min, LIMITS.hours.max);
  const rate = parseField(fields.rate, LIMITS.rate.min, LIMITS.rate.max);
  const share = parseField(fields.share, LIMITS.share.min, LIMITS.share.max);
  const taskMinutes = parseField(
    fields.taskMinutes,
    LIMITS.taskMinutes.min,
    LIMITS.taskMinutes.max,
  );
  const reviewMinutes = parseField(
    fields.reviewMinutes,
    LIMITS.reviewMinutes.min,
    LIMITS.reviewMinutes.max,
  );
  // Optional: an empty field means "count review in hours only".
  const reviewerRate =
    fields.reviewerRate.trim() === ""
      ? 0
      : parseField(
          fields.reviewerRate,
          LIMITS.reviewerRate.min,
          LIMITS.reviewerRate.max,
        );

  const result =
    hours !== null &&
    rate !== null &&
    share !== null &&
    taskMinutes !== null &&
    reviewMinutes !== null &&
    reviewerRate !== null
      ? analyseCost({
          vaHoursPerWeek: hours,
          vaHourlyRate: rate,
          agentShare: share / 100,
          minutesPerTask: taskMinutes,
          reviewMinutesPerTask: reviewMinutes,
          reviewerHourlyRate: reviewerRate,
        })
      : null;

  return (
    <CalculatorFrame
      title="AI employee vs virtual assistant cost calculator"
      intro="Enter what you pay a virtual assistant today and how much of the work an agent could take on. The calculator keeps the VA for everything else and adds a Construct plan and your review time."
    >
      <PresetRow
        label="VA hourly rate, published ranges"
        presets={RATE_PRESETS.map((preset) => ({
          label: preset.label,
          active: fields.rate === preset.rate,
          apply: () =>
            setFields((current) => ({ ...current, rate: preset.rate })),
        }))}
      />

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <NumberField
          label="VA hours per week"
          hint="Cherry Assistant prices part-time work at 20 hours a week."
          suffix="hours"
          value={fields.hours}
          onChange={set("hours")}
          invalid={hours === null}
          {...LIMITS.hours}
        />
        <NumberField
          label="VA hourly rate"
          hint="Use your real invoice if you have one."
          prefix="$"
          suffix="per hour"
          value={fields.rate}
          onChange={set("rate")}
          invalid={rate === null}
          {...LIMITS.rate}
        />
        <NumberField
          label="Share of tasks suited to an agent"
          hint="Recurring tasks with a clear procedure. Be conservative."
          suffix="%"
          value={fields.share}
          onChange={set("share")}
          invalid={share === null}
          {...LIMITS.share}
        />
        <NumberField
          label="Average VA minutes per task"
          hint="Used to count tasks, so review time can be added up."
          suffix="minutes"
          value={fields.taskMinutes}
          onChange={set("taskMinutes")}
          invalid={taskMinutes === null}
          {...LIMITS.taskMinutes}
        />
        <NumberField
          label="Review minutes per agent task"
          hint="Time a person spends checking each result."
          suffix="minutes"
          value={fields.reviewMinutes}
          onChange={set("reviewMinutes")}
          invalid={reviewMinutes === null}
          {...LIMITS.reviewMinutes}
        />
        <NumberField
          label="Reviewer's hourly value (optional)"
          hint="Leave at 0 to count review in hours instead of dollars."
          prefix="$"
          suffix="per hour"
          value={fields.reviewerRate}
          onChange={set("reviewerRate")}
          invalid={reviewerRate === null}
          {...LIMITS.reviewerRate}
        />
      </div>

      {result ? (
        <CostResults result={result} />
      ) : (
        <ResultSummary>
          Fix the highlighted field to see the result.
        </ResultSummary>
      )}
    </CalculatorFrame>
  );
}

function difference(savings: number, priced: boolean): string {
  const caveat = priced ? "" : " before review";
  if (Math.round(savings) === 0) return `about the same${caveat}`;
  return savings > 0
    ? `saves ${formatDollars(savings)}${caveat}`
    : `costs ${formatDollars(-savings)} more${caveat}`;
}

function CostResults({ result }: { result: CostResult }) {
  const { input } = result;
  const sharePercent = `${Number((input.agentShare * 100).toFixed(1))}%`;
  const priced = input.reviewerHourlyRate > 0;
  const planList = result.plans.map(
    (plan) => `${formatDollars(plan.monthly)} (${plan.name})`,
  );
  const prices =
    planList.length > 1
      ? `${planList.slice(0, -1).join(", ")}, or ${planList.at(-1)}`
      : (planList[0] ?? "");
  const reviewPhrase = priced
    ? `${formatHours(result.reviewHoursPerMonth)} of review a month, worth ${formatDollars(result.reviewCost)}`
    : `${formatHours(result.reviewHoursPerMonth)} of review a month`;

  return (
    <>
      <ResultSummary>
        A VA at {input.vaHoursPerWeek} hours a week and{" "}
        {formatRate(input.vaHourlyRate)} an hour costs about{" "}
        {formatDollars(result.vaMonthlyCost)} a month. Moving {sharePercent} of
        the tasks to an agent leaves {formatDollars(result.remainingVaCost)} of
        VA time, plus a Construct plan at {prices} a month, plus {reviewPhrase}.
        {result.reviewOutweighsTask
          ? " Checking each task takes as long as doing it, so this move saves no human time."
          : ""}
      </ResultSummary>

      <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat
          label="VA alone, per month"
          value={formatDollars(result.vaMonthlyCost)}
        />
        <Stat
          label="VA cost of agent-suited tasks"
          value={formatDollars(result.agentSuitedVaCost)}
        />
        <Stat
          label="Review time per month"
          value={formatHours(result.reviewHoursPerMonth)}
        />
      </dl>

      <div className="mt-4 overflow-x-auto" tabIndex={0}>
        <table className="w-full min-w-[520px] border-collapse bg-white text-[14px]">
          <caption className="sr-only">
            Monthly cost of a VA alone compared with a smaller VA engagement
            plus each Construct plan
          </caption>
          <thead>
            <tr>
              {[
                "Plan",
                "Plan price",
                "Remaining VA",
                priced ? "Review time" : "Review hours",
                "Monthly total",
                "Compared with VA alone",
              ].map((heading) => (
                <th
                  key={heading}
                  scope="col"
                  className="border border-[#e5e7eb] bg-[#fafafa] px-3 py-2 text-left font-medium"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.plans.map((plan) => (
              <tr key={plan.name}>
                <th
                  scope="row"
                  className="border border-[#e5e7eb] px-3 py-2 text-left font-medium"
                >
                  {plan.name}
                </th>
                <td className="border border-[#e5e7eb] px-3 py-2">
                  {formatDollars(plan.monthly)}
                </td>
                <td className="border border-[#e5e7eb] px-3 py-2">
                  {formatDollars(result.remainingVaCost)}
                </td>
                <td className="border border-[#e5e7eb] px-3 py-2">
                  {priced
                    ? formatDollars(result.reviewCost)
                    : formatHours(result.reviewHoursPerMonth)}
                </td>
                <td className="border border-[#e5e7eb] px-3 py-2">
                  {formatDollars(plan.monthlyTotal)}
                  {priced ? "" : " plus review"}
                </td>
                <td className="border border-[#e5e7eb] px-3 py-2">
                  {difference(plan.monthlySavings, priced)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[12px] leading-5 text-[#526b75]">
        Monthly list prices from the pricing page. Plans differ in usage,
        agents, steps per task, and scheduled tasks, and this calculator cannot
        tell which plan your workload needs.
      </p>
    </>
  );
}
