import { describe, expect, it } from "vitest";

import {
  WEEKS_PER_MONTH,
  analyseCost,
  constructPlanPrices,
  formatDollars,
  formatHours,
  formatRate,
  parseDollars,
  type CostInput,
} from "./cost-math";

const base: CostInput = {
  vaHoursPerWeek: 20,
  vaHourlyRate: 15,
  agentShare: 0.3,
  minutesPerTask: 20,
  reviewMinutesPerTask: 3,
  reviewerHourlyRate: 0,
};

describe("cost math", () => {
  it("reads plan prices from the pricing copy", () => {
    expect(constructPlanPrices).toEqual([
      { name: "Lite", monthly: 9 },
      { name: "Starter", monthly: 59 },
      { name: "Pro", monthly: 299 },
    ]);
    expect(parseDollars("$7.50")).toBe(7.5);
  });

  it("converts a weekly VA engagement to a monthly bill", () => {
    const result = analyseCost(base);
    // 20 hours x $15 x 52 / 12 = $1,300.
    expect(result.vaMonthlyCost).toBeCloseTo(1300, 6);
    expect(result.agentSuitedVaCost).toBeCloseTo(390, 6);
    expect(result.remainingVaCost).toBeCloseTo(910, 6);
  });

  it("counts review time from tasks, not hours", () => {
    const result = analyseCost(base);
    // 20 h a week at 20 min a task is 60 tasks a week, 260 a month.
    expect(result.tasksPerMonth).toBeCloseTo(260, 6);
    expect(result.agentTasksPerMonth).toBeCloseTo(78, 6);
    // 78 tasks x 3 minutes = 234 minutes = 3.9 hours.
    expect(result.reviewHoursPerMonth).toBeCloseTo(3.9, 6);
    expect(result.reviewCost).toBe(0);
    expect(result.reviewOutweighsTask).toBe(false);
  });

  it("adds the plan and priced review time to the remaining VA cost", () => {
    const result = analyseCost({ ...base, reviewerHourlyRate: 50 });
    const starter = result.plans.find((plan) => plan.name === "Starter")!;
    // $910 VA + $59 plan + 3.9 h x $50 review = $1,164.
    expect(result.reviewCost).toBeCloseTo(195, 6);
    expect(starter.monthlyTotal).toBeCloseTo(1164, 6);
    expect(starter.monthlySavings).toBeCloseTo(136, 6);
  });

  it("reports a loss when the plan costs more than the work it takes on", () => {
    const result = analyseCost({
      ...base,
      vaHoursPerWeek: 2,
      vaHourlyRate: 10,
      agentShare: 0.5,
    });
    const pro = result.plans.find((plan) => plan.name === "Pro")!;
    expect(pro.monthlySavings).toBeLessThan(0);
  });

  it("flags review that takes as long as the task", () => {
    expect(
      analyseCost({ ...base, reviewMinutesPerTask: 20 }).reviewOutweighsTask,
    ).toBe(true);
    expect(
      analyseCost({ ...base, agentShare: 0, reviewMinutesPerTask: 20 })
        .reviewOutweighsTask,
    ).toBe(false);
  });

  it("keeps a zero share at today's VA bill plus the plan", () => {
    const result = analyseCost({ ...base, agentShare: 0 });
    expect(result.remainingVaCost).toBeCloseTo(result.vaMonthlyCost, 6);
    expect(result.reviewHoursPerMonth).toBe(0);
    expect(result.plans[0]!.monthlySavings).toBeCloseTo(-9, 6);
  });

  it("formats money and hours for reading aloud", () => {
    expect(WEEKS_PER_MONTH).toBeCloseTo(4.333, 3);
    expect(formatDollars(1299.6)).toBe("$1,300");
    expect(formatDollars(-9)).toBe("-$9");
    expect(formatHours(3.9)).toBe("3.9 hours");
    expect(formatHours(1)).toBe("1 hour");
    expect(formatRate(15)).toBe("$15");
    expect(formatRate(9.5)).toBe("$9.50");
  });
});
