import { describe, expect, it } from "vitest";

import { partOfDay } from "./part-of-day";

describe("partOfDay", () => {
  it("splits the day at 5, 12, 17 and 21", () => {
    expect([4, 5, 11, 12, 16, 17, 20, 21, 0].map(partOfDay)).toEqual([
      "night",
      "morning",
      "morning",
      "afternoon",
      "afternoon",
      "evening",
      "evening",
      "night",
      "night",
    ]);
  });
});
