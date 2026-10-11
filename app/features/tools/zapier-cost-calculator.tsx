import { useState } from "react";

import {
  ChoiceField,
  NumberField,
  parseField,
} from "../../components/content/calculators/calculator-ui";
import type { ToolProps } from "./tool-page";
import { layoutTransition, revealElement, transitionName } from "./tool-motion";
import {
  LiveResult,
  TextField,
  ToolFrame,
  ToolStat,
  toolStyles,
} from "./tool-ui";
import {
  LARGEST_TIER,
  ZAPIER_PRICES_CHECKED,
  ZAPIER_PRICING_URL,
  estimateZapier,
  formatCents,
  formatCount,
  type Billing,
  type Quote,
  type Zap,
} from "../../../shared/tools/zapier-pricing";

type Row = { id: number; name: string; steps: string; runs: string };

const STEPS = { min: 1, max: 100, step: 1 } as const;
const RUNS = { min: 0, max: 10_000_000, step: 1 } as const;
const MAX_ROWS = 25;
const rowId = (id: number) => `zapier-zap-${id}`;

/**
 * A small business's three everyday Zaps. 1,360 tasks a month lands just
 * under Professional's 1,500 tier, so the first result a visitor sees already
 * shows how close the next tier is.
 */
const DEFAULT_ROWS: Row[] = [
  { id: 1, name: "New lead to CRM and Slack", steps: "2", runs: "300" },
  { id: 2, name: "Paid invoice to sheet and email", steps: "3", runs: "120" },
  { id: 3, name: "Form reply to email", steps: "1", runs: "400" },
];

function planName(quote: Quote): string {
  return quote.plan === "Free"
    ? "Free"
    : `${quote.plan} ${formatCount(quote.tierTasks)}`;
}

const checkedOn = new Date(
  `${ZAPIER_PRICES_CHECKED}T00:00:00Z`,
).toLocaleDateString("en-US", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function ZapierCostCalculator({ cta }: ToolProps) {
  const [rows, setRows] = useState<Row[]>(DEFAULT_ROWS);
  const [billing, setBilling] = useState<Billing>("annual");
  const [team, setTeam] = useState<"solo" | "team">("solo");

  const update = (id: number, patch: Partial<Row>) =>
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  const add = () => {
    const id = Math.max(0, ...rows.map((row) => row.id)) + 1;
    void layoutTransition(() =>
      setRows((current) => [
        ...current,
        { id, name: "", steps: "1", runs: "100" },
      ]),
    ).then(() => revealElement(rowId(id)));
  };
  const remove = (id: number) =>
    void layoutTransition(() =>
      setRows((current) => current.filter((row) => row.id !== id)),
    );

  const parsed = rows.map((row) => ({
    steps: parseField(row.steps, STEPS.min, STEPS.max),
    runs: parseField(row.runs, RUNS.min, RUNS.max),
  }));
  const valid = parsed.every((row) => row.steps !== null && row.runs !== null);
  const zaps: Zap[] = valid
    ? parsed.map((row) => ({ steps: row.steps!, runs: row.runs! }))
    : [];
  const estimate = estimateZapier({ zaps, billing, team: team === "team" });
  const otherBilling: Billing = billing === "annual" ? "monthly" : "annual";
  const other = estimateZapier({
    zaps,
    billing: otherBilling,
    team: team === "team",
  });
  const summary = valid
    ? summarize({
        tasks: estimate.tasks,
        multiStep: estimate.multiStep,
        covering: estimate.covering,
        cheapest: estimate.cheapest,
        billing,
        other: other.cheapest,
        otherBilling,
      })
    : "Fix the highlighted field to see your cost.";
  const cheapest = valid ? estimate.cheapest : null;

  return (
    <ToolFrame title="Zapier cost calculator">
      <p className={toolStyles.labelClass}>Your Zaps</p>
      <p className={toolStyles.hintClass}>
        Count action steps only. Triggers, Filter, Paths, Formatter and Delay
        steps are free.
      </p>
      <ul className="mt-3 space-y-3">
        {rows.map((row, index) => (
          <li
            key={row.id}
            id={rowId(row.id)}
            style={transitionName(rowId(row.id))}
            className="tool-item rounded-xl border border-[#dcecef] bg-white p-3 sm:p-4"
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1.6fr_1fr_1fr]">
              <div className="col-span-2 sm:col-span-1">
                <TextField
                  label={`Zap ${index + 1} name (optional)`}
                  value={row.name}
                  onChange={(name) => update(row.id, { name })}
                />
              </div>
              <NumberField
                label="Action steps"
                value={row.steps}
                onChange={(steps) => update(row.id, { steps })}
                invalid={parsed[index]!.steps === null}
                {...STEPS}
              />
              <NumberField
                label="Runs a month"
                value={row.runs}
                onChange={(runs) => update(row.id, { runs })}
                invalid={parsed[index]!.runs === null}
                {...RUNS}
              />
            </div>
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => remove(row.id)}
                className="tool-press mt-2 min-h-9 text-[13px] font-medium text-[#526b75] underline underline-offset-4 hover:text-[#b42318]"
              >
                Remove {row.name.trim() || `Zap ${index + 1}`}
              </button>
            )}
          </li>
        ))}
      </ul>

      {/* Named so it glides with the list instead of cross-fading. */}
      <div style={transitionName("zapier-results")}>
        {rows.length < MAX_ROWS && (
          <button
            type="button"
            onClick={add}
            className="tool-press mt-3 min-h-10 rounded-full border border-dashed border-[#01b4c8] bg-white px-4 text-[14px] font-medium text-[#017b89] hover:bg-[#effbfc]"
          >
            + Add a Zap
          </button>
        )}

        <ChoiceField
          legend="Billing"
          value={billing}
          onChange={setBilling}
          options={[
            {
              value: "annual",
              label: "Annual",
              hint: "Billed once a year, shown per month.",
            },
            {
              value: "monthly",
              label: "Monthly",
              hint: "Billed every month, costs more.",
            },
          ]}
        />
        <ChoiceField
          legend="Who uses Zapier"
          value={team}
          onChange={setTeam}
          options={[
            {
              value: "solo",
              label: "Just me",
              hint: "Free or Professional.",
            },
            {
              value: "team",
              label: "My team",
              hint: "Team: shared Zaps, up to 25 users.",
            },
          ]}
        />

        <LiveResult changeKey={summary}>{summary}</LiveResult>
        {cheapest && (
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ToolStat
              label="Tasks a month"
              value={formatCount(estimate.tasks)}
            />
            <ToolStat label="Cheapest plan" value={planName(cheapest)} />
            <ToolStat
              label="Per month"
              value={formatCents(cheapest.totalCents)}
            />
            <ToolStat
              label="Per year"
              value={formatCents(cheapest.totalCents * 12)}
            />
          </dl>
        )}

        <p className="mt-3 text-[12px] leading-5 text-[#526b75]">
          List prices in US dollars from{" "}
          <a
            href={ZAPIER_PRICING_URL}
            rel="noopener noreferrer nofollow"
            target="_blank"
            className="underline underline-offset-2"
          >
            Zapier's pricing page
          </a>
          , checked on {checkedOn}. Taxes and AI by Zapier steps are not
          included. Zapier is a trademark of Zapier, Inc. This calculator is not
          affiliated with Zapier.
        </p>

        {cta}
      </div>
    </ToolFrame>
  );
}

/** The result as one sentence, so the live region announces it whole. */
function summarize({
  tasks,
  multiStep,
  covering,
  cheapest,
  billing,
  other,
  otherBilling,
}: {
  tasks: number;
  multiStep: boolean;
  covering: Quote | null;
  cheapest: Quote | null;
  billing: Billing;
  other: Quote | null;
  otherBilling: Billing;
}): string {
  if (!cheapest) {
    return `Your Zaps use about ${formatCount(tasks)} tasks a month. That is more than Zapier's largest self-serve plan covers, even with pay-per-task (${formatCount(LARGEST_TIER)} tasks, up to three times that with overage), so you would need an Enterprise quote from Zapier's sales team.`;
  }
  const billed = billing === "annual" ? ", billed annually" : "";
  const split =
    cheapest.overageTasks > 0
      ? `, which is ${formatCents(cheapest.baseCents)} for the plan plus ${formatCount(cheapest.overageTasks)} pay-per-task tasks for ${formatCents(cheapest.overageCents)}`
      : "";
  const overage =
    cheapest.overageTasks > 0 && covering
      ? ` That is ${formatCents(covering.totalCents - cheapest.totalCents)} less than moving up to ${planName(covering)} at ${formatCents(covering.totalCents)}, but only if pay-per-task billing is switched on in Zapier.`
      : cheapest.overageTasks > 0
        ? " Pay-per-task billing has to be switched on in Zapier for this to work."
        : "";
  const freeNote =
    cheapest.plan !== "Free" && tasks <= 100 && multiStep
      ? " Free would cover the volume, but it only allows two-step Zaps."
      : "";
  const otherNote =
    other && other.totalCents !== cheapest.totalCents
      ? ` Paying ${otherBilling} instead would cost ${formatCents(other.totalCents)} a month.`
      : "";
  return `Your Zaps use about ${formatCount(tasks)} tasks a month. The cheapest way to run them is ${planName(cheapest)} at ${formatCents(cheapest.totalCents)} a month${billed}${split}.${overage}${freeNote}${otherNote}`;
}
