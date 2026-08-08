import { describe, expect, it } from "vitest";

import {
  ATTRIBUTION_COOKIE_NAME,
  mergeFirstTouch,
  parseAttributionCookie,
  parseCampaignParams,
  serializeAttribution,
  toAnalyticsProperties,
} from "./campaign-attribution";

describe("attribution wire contract", () => {
  // The v2 API parses this cookie at signup and there is no shared package
  // between the repos. If either side drifts, attribution silently zeroes out
  // rather than failing loudly — so pin the literals here and there.
  it("pins the cookie name", () => {
    expect(ATTRIBUTION_COOKIE_NAME).toBe("construct_attr");
  });

  it("pins the short key shape", () => {
    const parsed = parseCampaignParams(
      "?ref=mailinglist&cid=abc&sid=def&utm_source=newsletter&utm_medium=email&utm_campaign=launch&utm_content=cta-body-1&code=LAUNCH20",
      "/launch/",
    );
    expect(Object.keys(parsed ?? {}).sort()).toEqual([
      "c",
      "lp",
      "p",
      "r",
      "s",
      "t",
      "uc",
      "um",
      "uo",
      "us",
    ]);
  });
});

describe("parseCampaignParams", () => {
  it("returns null when no campaign params are present", () => {
    expect(parseCampaignParams("?foo=bar", "/")).toBeNull();
    expect(parseCampaignParams("", "/")).toBeNull();
  });

  it("maps known params to short keys", () => {
    const parsed = parseCampaignParams(
      "?ref=mailinglist&cid=camp-1&sid=sub-2&utm_content=cta-body-1",
    );
    expect(parsed).toMatchObject({
      r: "mailinglist",
      c: "camp-1",
      s: "sub-2",
      uo: "cta-body-1",
      us: "newsletter",
      um: "email",
    });
  });

  it("accepts short query keys used by email CTAs", () => {
    const parsed = parseCampaignParams(
      "?s=sub-2&uc=prelaunch-2026-08&uo=cta-body-1",
      "/launch/",
    );
    expect(parsed).toMatchObject({
      s: "sub-2",
      uc: "prelaunch-2026-08",
      uo: "cta-body-1",
      r: "mailinglist",
      us: "newsletter",
      um: "email",
      lp: "/launch/",
    });
  });

  it("prefers short keys when both short and long names are present", () => {
    const parsed = parseCampaignParams(
      "?s=short-sid&sid=long-sid&uo=short-uo&utm_content=long-uo",
    );
    expect(parsed?.s).toBe("short-sid");
    expect(parsed?.uo).toBe("short-uo");
  });

  it("does not invent email defaults without a subscriber id", () => {
    const parsed = parseCampaignParams("?uc=ads-campaign&uo=hero");
    expect(parsed).toMatchObject({ uc: "ads-campaign", uo: "hero" });
    expect(parsed?.r).toBeUndefined();
    expect(parsed?.us).toBeUndefined();
    expect(parsed?.um).toBeUndefined();
  });

  it("uppercases promo codes and accepts either param name", () => {
    expect(parseCampaignParams("?code=launch20")?.p).toBe("LAUNCH20");
    expect(parseCampaignParams("?promo=launch40")?.p).toBe("LAUNCH40");
  });

  it("drops values that fail the allowlist pattern", () => {
    // Query strings are attacker-controlled and land in a cookie, analytics
    // properties, and eventually a database row.
    expect(parseCampaignParams("?ref=<script>alert(1)</script>")).toBeNull();
    expect(parseCampaignParams(`?cid=${"x".repeat(65)}`)).toBeNull();
    expect(parseCampaignParams("?code=NOT-A-VALID-CODE!")).toBeNull();
  });

  it("keeps a campaign even when only some params are valid", () => {
    const parsed = parseCampaignParams("?ref=mailinglist&cid=<bad>");
    expect(parsed?.r).toBe("mailinglist");
    expect(parsed?.c).toBeUndefined();
  });

  it("rejects a landing path that is not a plain path", () => {
    expect(parseCampaignParams("?ref=x", "https://evil.test/")?.lp).toBeUndefined();
  });
});

describe("mergeFirstTouch", () => {
  const first = { r: "mailinglist", c: "camp-1", t: 1 };

  it("keeps first touch when a later visit brings new params", () => {
    const merged = mergeFirstTouch(first, { r: "google", c: "camp-2", t: 2 });
    expect(merged).toMatchObject({ r: "mailinglist", c: "camp-1" });
  });

  it("lets a later promo code through", () => {
    // Clicking a code chip on /launch is a fresh, deliberate intent, and the
    // code has to reach checkout to be worth anything.
    expect(mergeFirstTouch(first, { p: "LAUNCH40" })?.p).toBe("LAUNCH40");
  });

  it("handles either side being absent", () => {
    expect(mergeFirstTouch(null, first)).toBe(first);
    expect(mergeFirstTouch(first, null)).toBe(first);
    expect(mergeFirstTouch(null, null)).toBeNull();
  });
});

describe("parseAttributionCookie", () => {
  it("round-trips a serialized value", () => {
    const value = { r: "mailinglist", c: "camp-1", p: "LAUNCH20", t: 123 };
    expect(parseAttributionCookie(serializeAttribution(value))).toEqual(value);
  });

  it("degrades to null instead of throwing on junk", () => {
    // A malformed or hand-edited cookie must never break app boot.
    expect(parseAttributionCookie("not-json")).toBeNull();
    expect(parseAttributionCookie("%7Bbroken")).toBeNull();
    expect(parseAttributionCookie(null)).toBeNull();
    expect(parseAttributionCookie("")).toBeNull();
  });

  it("strips fields that fail validation on the way back in", () => {
    const tampered = encodeURIComponent(
      JSON.stringify({ r: "ok", c: "<script>", t: "nope" }),
    );
    expect(parseAttributionCookie(tampered)).toEqual({ r: "ok" });
  });
});

describe("toAnalyticsProperties", () => {
  it("expands short keys into readable property names", () => {
    expect(
      toAnalyticsProperties({
        r: "mailinglist",
        c: "camp-1",
        uo: "cta-body-1",
        p: "LAUNCH20",
      }),
    ).toEqual({
      campaign_ref: "mailinglist",
      campaign_id: "camp-1",
      utm_content: "cta-body-1",
      campaign_promo_code: "LAUNCH20",
    });
  });

  it("omits absent fields rather than emitting undefined", () => {
    expect(toAnalyticsProperties({})).toEqual({});
  });
});
