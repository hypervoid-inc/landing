import { describe, expect, it } from "vitest";

import { untilNextTask } from "./schedules-card";

const at = (hours: number, minutes: number) =>
  new Date(2026, 9, 12, hours, minutes);

describe("untilNextTask", () => {
  it("counts to the next task today, then to tomorrow's first", () => {
    expect(untilNextTask(at(6, 18))).toBe("Next in 3h 12m");
    expect(untilNextTask(at(13, 20))).toBe("Next in 40m");
    expect(untilNextTask(at(23, 0))).toBe("Next in 10h 30m");
  });
});
