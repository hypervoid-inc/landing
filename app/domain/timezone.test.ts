import { describe, expect, it } from "vitest";
import {
  resolveDisplayTimezone,
  timezoneLabel,
} from "./timezone";

describe("timezone display helpers", () => {
  it("prefers a profile zone over the browser fallback", () => {
    expect(resolveDisplayTimezone("Asia/Kolkata")).toBe("Asia/Kolkata");
    expect(resolveDisplayTimezone("  ")).not.toBe("  ");
  });

  it("softens IANA underscores for chrome cues", () => {
    expect(timezoneLabel("America/New_York")).toBe("America/New York");
  });
});
