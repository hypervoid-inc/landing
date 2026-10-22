import { describe, expect, it } from "vitest";

import { isAnalyticsHost } from "./analytics.client";

describe("isAnalyticsHost", () => {
  it("reports from the production site only", () => {
    expect(isAnalyticsHost("construct.computer")).toBe(true);
    expect(isAnalyticsHost("www.construct.computer")).toBe(true);
    expect(isAnalyticsHost("landing-new-9q7.pages.dev")).toBe(false);
    expect(isAnalyticsHost("abc123.landing-new-9q7.pages.dev")).toBe(false);
    expect(isAnalyticsHost("localhost")).toBe(false);
    expect(isAnalyticsHost("os.construct.computer")).toBe(false);
  });
});
