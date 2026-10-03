import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CostCalculator } from "./cost-calculator";
import { ReliabilityCalculator } from "./reliability-calculator";

// Escaped so the source itself stays free of the characters it checks for.
const DASHES = new RegExp("[\\u2013\\u2014]");

/**
 * The blog is prerendered, so both calculators must render in Node with no
 * DOM, and the prerendered HTML must already carry the default answer for
 * readers (and crawlers) who never run the script.
 */
describe("in-post calculators", () => {
  it("prerenders the reliability calculator with the half-life example", () => {
    const html = renderToString(createElement(ReliabilityCalculator));

    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("8.5%");
    expect(html).toContain("11.7");
    expect(html).toMatch(/<label[^>]*for="[^"]+"/);
    expect(html).not.toMatch(DASHES);
  });

  it("prerenders the cost calculator with every plan", () => {
    const html = renderToString(createElement(CostCalculator));

    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("$1,300");
    for (const plan of ["Lite", "Starter", "Pro"]) {
      expect(html).toContain(`>${plan}<`);
    }
    expect(html).toContain('aria-pressed="true"');
    expect(html).not.toMatch(DASHES);
  });
});
