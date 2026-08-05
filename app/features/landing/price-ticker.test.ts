import { describe, expect, it } from "vitest";

import {
  PRICE_TICK_EASE,
  decimalPlaces,
  formatPrice,
  parsePrice,
} from "./price-ticker";

describe("price ticker", () => {
  it("parses currency strings", () => {
    expect(parsePrice("$299")).toBe(299);
    expect(parsePrice("$7.50")).toBe(7.5);
  });

  it("formats with matching decimal places", () => {
    expect(formatPrice(199.2, 0)).toBe("$199");
    expect(formatPrice(7.5, 2)).toBe("$7.50");
  });

  it("reads decimal places from price labels", () => {
    expect(decimalPlaces("$59")).toBe(0);
    expect(decimalPlaces("$7.50")).toBe(2);
  });

  it("eases out so early frames jump farther", () => {
    expect(PRICE_TICK_EASE(0)).toBe(0);
    expect(PRICE_TICK_EASE(1)).toBe(1);
    expect(PRICE_TICK_EASE(0.25)).toBeGreaterThan(0.25);
  });
});
