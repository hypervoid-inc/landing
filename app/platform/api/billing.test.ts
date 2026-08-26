import { describe, expect, it } from "vitest";

import { checkoutPromoCode } from "./billing";

describe("checkoutPromoCode", () => {
  it("drops LAUNCH20 unless the cart is Pro monthly", () => {
    expect(checkoutPromoCode("LAUNCH20", "pro", "month")).toBe("LAUNCH20");
    expect(checkoutPromoCode("LAUNCH20", "pro", "year")).toBeUndefined();
    expect(checkoutPromoCode("LAUNCH20", "lite", "month")).toBeUndefined();
    expect(checkoutPromoCode("LAUNCH20", "starter", "month")).toBeUndefined();
  });

  it("drops LAUNCH40 unless the cart is Pro annual", () => {
    expect(checkoutPromoCode("LAUNCH40", "pro", "year")).toBe("LAUNCH40");
    expect(checkoutPromoCode("LAUNCH40", "pro", "month")).toBeUndefined();
    expect(checkoutPromoCode("LAUNCH40", "lite", "year")).toBeUndefined();
    expect(checkoutPromoCode("LAUNCH40", "starter", "year")).toBeUndefined();
  });

  it("omits a missing code", () => {
    expect(checkoutPromoCode(undefined, "pro", "month")).toBeUndefined();
    expect(checkoutPromoCode("", "pro", "month")).toBeUndefined();
  });

  it("forwards an unknown code so the API can decide", () => {
    // A future unrestricted campaign code should still reach Dodo.
    expect(checkoutPromoCode("SAVE10", "lite", "month")).toBe("SAVE10");
  });
});
