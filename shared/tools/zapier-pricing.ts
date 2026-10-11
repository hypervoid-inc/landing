/**
 * Zapier's self-serve price list and the arithmetic behind the Zapier cost
 * calculator. Pure, so it runs the same in the prerender and the browser.
 *
 * The rows were read from the plan data embedded in zapier.com/pricing, not
 * from a third-party summary, because the sites that rank for this search
 * already disagree with each other. Each row is
 * `[tasks, monthly cents, monthly overage cents per task, annual cents per
 * month, annual overage cents per task]`. In that data every tier's hard
 * ceiling is exactly 3x its task count, which is the pay-per-task limit
 * Zapier's help center describes.
 *
 * ponytail: a hand-copied snapshot. Zapier changes prices without notice, so
 * re-read the page and bump `ZAPIER_PRICES_CHECKED` when it moves. A scheduled
 * fetch is the upgrade path if that starts happening more than twice a year.
 */
export const ZAPIER_PRICES_CHECKED = "2026-10-11";
export const ZAPIER_PRICING_URL = "https://zapier.com/pricing";

type Row = readonly [number, number, number, number, number];

const PROFESSIONAL: readonly Row[] = [
  [750, 2999, 5, 1999, 3.34],
  [1500, 5850, 4.88, 3900, 3.25],
  [2000, 7350, 4.6, 4900, 3.07],
  [5000, 13350, 3.34, 8900, 2.23],
  [10000, 19350, 2.42, 12900, 1.62],
  [20000, 28350, 1.78, 18900, 1.19],
  [50000, 43350, 1.09, 28900, 0.73],
  [100000, 73350, 0.92, 48900, 0.62],
  [200000, 114900, 0.72, 76900, 0.49],
  [300000, 159900, 0.67, 106900, 0.45],
  [400000, 189900, 0.6, 126900, 0.4],
  [500000, 219900, 0.55, 149900, 0.38],
  [750000, 299900, 0.5, 199900, 0.34],
  [1000000, 329900, 0.42, 219900, 0.28],
  [1250000, 389900, 0.39, 259900, 0.26],
  [1500000, 449900, 0.38, 299900, 0.25],
  [1750000, 479900, 0.35, 319900, 0.23],
  [2000000, 509900, 0.32, 338900, 0.22],
];

const TEAM: readonly Row[] = [
  [2000, 10350, 6.47, 6900, 4.32],
  [5000, 17850, 4.47, 11900, 2.98],
  [10000, 25350, 3.17, 16900, 2.12],
  [20000, 37350, 2.34, 24900, 1.56],
  [50000, 59850, 1.5, 39900, 1],
  [100000, 89850, 1.13, 59900, 0.75],
  [200000, 149900, 0.94, 99900, 0.63],
  [300000, 179900, 0.75, 119900, 0.5],
  [400000, 209900, 0.66, 139900, 0.44],
  [500000, 269900, 0.63, 179900, 0.42],
  [750000, 329900, 0.55, 219900, 0.37],
  [1000000, 374900, 0.47, 249900, 0.32],
  [1250000, 449900, 0.45, 299900, 0.3],
  [1500000, 509900, 0.43, 339900, 0.29],
  [1750000, 569900, 0.41, 379900, 0.28],
  [2000000, 599900, 0.38, 399900, 0.25],
];

/** Free: 100 tasks a month, two-step Zaps only (one trigger, one action). */
export const FREE_TASKS = 100;
/** Pay-per-task keeps Zaps running up to this multiple of the plan's tasks. */
export const PAY_PER_TASK_CEILING = 3;
export const LARGEST_TIER = 2_000_000;

export type Billing = "annual" | "monthly";
export type ZapierPlan = "Free" | "Professional" | "Team";

export type Zap = { readonly steps: number; readonly runs: number };

export type Quote = {
  readonly plan: ZapierPlan;
  readonly tierTasks: number;
  /** Subscription price per month, in cents. */
  readonly baseCents: number;
  readonly overageTasks: number;
  readonly overageCents: number;
  readonly totalCents: number;
};

export type ZapierEstimate = {
  readonly tasks: number;
  readonly multiStep: boolean;
  /** The smallest plan whose included tasks cover the month. */
  readonly covering: Quote | null;
  /** The cheapest option, which can be a smaller tier plus pay-per-task. */
  readonly cheapest: Quote | null;
};

/** Every successful action step is a task. Triggers and built-in steps are not. */
export function monthlyTasks(zaps: readonly Zap[]): number {
  return zaps.reduce((total, zap) => total + zap.steps * zap.runs, 0);
}

function quote(plan: ZapierPlan, row: Row, billing: Billing, tasks: number) {
  const [tierTasks, monthly, monthlyOverage, annual, annualOverage] = row;
  const baseCents = billing === "annual" ? annual : monthly;
  const rate = billing === "annual" ? annualOverage : monthlyOverage;
  const overageTasks = Math.max(0, tasks - tierTasks);
  const overageCents = Math.round(overageTasks * rate);
  return {
    plan,
    tierTasks,
    baseCents,
    overageTasks,
    overageCents,
    totalCents: baseCents + overageCents,
  };
}

export function estimateZapier({
  zaps,
  billing,
  team,
}: {
  zaps: readonly Zap[];
  billing: Billing;
  /** Shared Zaps and multiple users need Team. */
  team: boolean;
}): ZapierEstimate {
  const tasks = monthlyTasks(zaps);
  const multiStep = zaps.some((zap) => zap.steps > 1 && zap.runs > 0);
  const options: Quote[] = [];

  if (!team && !multiStep && tasks <= FREE_TASKS) {
    options.push({
      plan: "Free",
      tierTasks: FREE_TASKS,
      baseCents: 0,
      overageTasks: 0,
      overageCents: 0,
      totalCents: 0,
    });
  }

  const plan: ZapierPlan = team ? "Team" : "Professional";
  for (const row of team ? TEAM : PROFESSIONAL) {
    if (tasks <= row[0] * PAY_PER_TASK_CEILING) {
      options.push(quote(plan, row, billing, tasks));
    }
  }

  const covering = options.find((option) => option.overageTasks === 0) ?? null;
  const cheapest = options.reduce<Quote | null>(
    (best, option) =>
      best === null || option.totalCents < best.totalCents ? option : best,
    null,
  );
  return { tasks, multiStep, covering, cheapest };
}

export function formatCents(cents: number): string {
  const whole = cents % 100 === 0;
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  });
}

export function formatCount(value: number): string {
  return value.toLocaleString("en-US");
}

export type ZapierTier = {
  readonly plan: "Professional" | "Team";
  readonly tasks: number;
  readonly monthlyCents: number;
  readonly annualCents: number;
};

/** Every self-serve tier, for the reference table and agent answers. */
export const zapierTiers: readonly ZapierTier[] = [
  ...PROFESSIONAL.map(([tasks, monthlyCents, , annualCents]) => ({
    plan: "Professional" as const,
    tasks,
    monthlyCents,
    annualCents,
  })),
  ...TEAM.map(([tasks, monthlyCents, , annualCents]) => ({
    plan: "Team" as const,
    tasks,
    monthlyCents,
    annualCents,
  })),
];
