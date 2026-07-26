import { describe, expect, it } from "vitest";

import { sanitizeEvent } from "./sanitize-event";

describe("sanitizeEvent", () => {
  it("removes query strings and fragments from captured URLs", () => {
    const event = {
      event: "$pageview",
      properties: {
        $current_url: "https://construct.computer/blog/?email=private#section",
        $pathname: "/blog/?email=private",
        $referrer: "https://search.example/?query=secret",
        source: "hero",
      },
    };

    expect(sanitizeEvent(event)).toEqual({
      event: "$pageview",
      properties: {
        $current_url: "https://construct.computer/blog/",
        $pathname: "/blog/",
        $referrer: "https://search.example",
        source: "hero",
      },
    });
    expect(event.properties.$current_url).toContain("email=private");
  });

  it("redacts unknown paths and invalid referrers", () => {
    const event = {
      event: "custom",
      properties: { $current_url: "not a URL", $referrer: null },
    };

    expect(sanitizeEvent(event)).toEqual({
      event: "custom",
      properties: {
        $current_url: "https://construct.computer/404/",
        $pathname: undefined,
        $referrer: null,
      },
    });
  });
});
