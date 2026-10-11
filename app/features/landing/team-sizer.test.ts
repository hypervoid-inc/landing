import { describe, expect, it } from "vitest";

import { pricingPlans } from "../../content/landing";
import { planForTeam } from "./team-sizer";

describe("planForTeam", () => {
  it("picks the smallest plan with an agent for each person", () => {
    const fit = (people: number) => planForTeam(pricingPlans, people)?.name;
    expect([1, 2, 3, 5, 6, 15].map(fit)).toEqual([
      "Lite",
      "Lite",
      "Starter",
      "Starter",
      "Pro",
      "Pro",
    ]);
  });
});
