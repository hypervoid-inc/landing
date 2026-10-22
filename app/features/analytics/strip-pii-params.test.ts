import { describe, expect, it } from "vitest";

import { stripPiiFromEvent, stripPiiParams } from "./strip-pii-params";

describe("stripPiiParams", () => {
  it("drops email params and keeps attribution params", () => {
    expect(
      stripPiiParams(
        "https://construct.computer/account/?billing_status=success&email=a%40b.com&utm_source=x&ref=r1",
      ),
    ).toBe("https://construct.computer/account/?billing_status=success&utm_source=x&ref=r1");
    expect(stripPiiParams("https://construct.computer/app/?Customer_Email=a%40b.com")).toBe(
      "https://construct.computer/app/",
    );
  });

  it("leaves other values alone", () => {
    expect(stripPiiParams("https://construct.computer/pricing/?utm_source=x")).toBe(
      "https://construct.computer/pricing/?utm_source=x",
    );
    expect(stripPiiParams("not a url?email=x")).toBe("not a url?email=x");
    expect(stripPiiParams(42)).toBe(42);
  });
});

describe("stripPiiFromEvent", () => {
  it("scrubs event, $set and $set_once URL properties", () => {
    const event = stripPiiFromEvent({
      properties: {
        $current_url: "https://construct.computer/account/?email=a%40b.com&status=active",
        $referrer: "https://checkout.dodopayments.com/x?email=a%40b.com",
        $set_once: { $initial_current_url: "https://construct.computer/app/?email=a%40b.com" },
      },
    });
    expect(event.properties?.$current_url).toBe("https://construct.computer/account/?status=active");
    expect(event.properties?.$referrer).toBe("https://checkout.dodopayments.com/x");
    expect((event.properties?.$set_once as Record<string, unknown>).$initial_current_url).toBe(
      "https://construct.computer/app/",
    );
    expect(stripPiiFromEvent(null)).toBeNull();
  });

  it("scrubs the session entry URL and referrer", () => {
    const event = stripPiiFromEvent({
      properties: {
        $session_entry_url:
          "https://construct.computer/account/?billing_status=success&email=a%40b.c&utm_source=x",
        $session_entry_referrer: "https://checkout.dodopayments.com/x?email=a%40b.c",
      },
    });
    expect(event.properties?.$session_entry_url).toBe(
      "https://construct.computer/account/?billing_status=success&utm_source=x",
    );
    expect(event.properties?.$session_entry_referrer).toBe("https://checkout.dodopayments.com/x");
  });
});
