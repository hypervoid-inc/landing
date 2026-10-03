/**
 * Pure math behind the AI employee vs virtual assistant cost calculator. No
 * React and no browser APIs, so it prerenders and is unit tested on its own.
 *
 * The model splits a VA's week into tasks, hands an agreed share of those
 * tasks to an agent, keeps the VA for the rest, and charges the agent side a
 * flat plan price plus human review time. It does not estimate whether a plan's
 * usage covers the work: Construct plans are metered by usage, not hours.
 */
import { pricingPlans } from "../../../content/landing";

/** 52 weeks over 12 months, so a month is about 4.33 weeks. */
export const WEEKS_PER_MONTH = 52 / 12;

export type CostInput = {
  /** Hours of VA work bought per week. */
  readonly vaHoursPerWeek: number;
  /** VA hourly rate in US dollars. */
  readonly vaHourlyRate: number;
  /** Share of the VA's tasks an agent could take on, from 0 to 1. */
  readonly agentShare: number;
  /** Average VA minutes one task takes. */
  readonly minutesPerTask: number;
  /** Minutes a person spends checking one agent-run task. */
  readonly reviewMinutesPerTask: number;
  /** Optional value of the reviewer's hour in dollars, 0 to count hours only. */
  readonly reviewerHourlyRate: number;
};

export type PlanPrice = { readonly name: string; readonly monthly: number };

export type PlanOutcome = PlanPrice & {
  /** Remaining VA cost, plus the plan, plus priced review time. */
  readonly monthlyTotal: number;
  /** Positive when the mixed setup costs less than the VA alone. */
  readonly monthlySavings: number;
};

export type CostResult = {
  readonly input: CostInput;
  readonly vaMonthlyCost: number;
  readonly tasksPerMonth: number;
  readonly agentTasksPerMonth: number;
  /** VA spend on the tasks the agent would take on. */
  readonly agentSuitedVaCost: number;
  /** VA spend that stays with the VA. */
  readonly remainingVaCost: number;
  readonly reviewHoursPerMonth: number;
  /** Review hours priced at the reviewer's rate, 0 when no rate is given. */
  readonly reviewCost: number;
  /**
   * True when checking a task takes as long as doing it, so moving it to an
   * agent saves no human time whatever the dollar figures say.
   */
  readonly reviewOutweighsTask: boolean;
  readonly plans: readonly PlanOutcome[];
};

/** "$59" to 59. */
export function parseDollars(label: string): number {
  return Number(label.replace(/[^0-9.]/g, ""));
}

/** Monthly list prices of the paid plans, read from the pricing page copy. */
export const constructPlanPrices: readonly PlanPrice[] = pricingPlans.map(
  (plan) => ({ name: plan.name, monthly: parseDollars(plan.price) }),
);

export function analyseCost(
  input: CostInput,
  plans: readonly PlanPrice[] = constructPlanPrices,
): CostResult {
  const vaHoursPerMonth = input.vaHoursPerWeek * WEEKS_PER_MONTH;
  const vaMonthlyCost = vaHoursPerMonth * input.vaHourlyRate;
  const tasksPerMonth =
    input.minutesPerTask > 0
      ? (vaHoursPerMonth * 60) / input.minutesPerTask
      : 0;
  const agentTasksPerMonth = tasksPerMonth * input.agentShare;
  const agentSuitedVaCost = vaMonthlyCost * input.agentShare;
  const remainingVaCost = vaMonthlyCost - agentSuitedVaCost;
  const reviewHoursPerMonth =
    (agentTasksPerMonth * input.reviewMinutesPerTask) / 60;
  const reviewCost = reviewHoursPerMonth * input.reviewerHourlyRate;

  return {
    input,
    vaMonthlyCost,
    tasksPerMonth,
    agentTasksPerMonth,
    agentSuitedVaCost,
    remainingVaCost,
    reviewHoursPerMonth,
    reviewCost,
    reviewOutweighsTask:
      input.agentShare > 0 &&
      input.reviewMinutesPerTask >= input.minutesPerTask,
    plans: plans.map((plan) => {
      const monthlyTotal = remainingVaCost + plan.monthly + reviewCost;
      return {
        ...plan,
        monthlyTotal,
        monthlySavings: vaMonthlyCost - monthlyTotal,
      };
    }),
  };
}

/** Whole dollars with thousands separators, e.g. "$1,300". */
export function formatDollars(value: number): string {
  const rounded = Math.round(value);
  const sign = rounded < 0 ? "-" : "";
  return `${sign}$${Math.abs(rounded).toLocaleString("en-US")}`;
}

/** An hourly rate, cents shown only when there are any, e.g. "$15", "$9.50". */
export function formatRate(value: number): string {
  return Number.isInteger(value) ? `$${value}` : `$${value.toFixed(2)}`;
}

/** Hours to one decimal place, e.g. "3.9 hours". */
export function formatHours(value: number): string {
  const hours = Number(value.toFixed(1));
  return `${hours.toLocaleString("en-US")} ${hours === 1 ? "hour" : "hours"}`;
}
