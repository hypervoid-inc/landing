import { describe, expect, it } from "vitest";

import {
  ATTRIBUTION_COOKIE_NAME,
  hasFirstTouch,
  mergeFirstTouch,
  parseAttributionCookie,
  parseCampaignParams,
  referringDomain,
  serializeAttribution,
  toAnalyticsProperties,
} from "./campaign-attribution";

describe("attribution wire contract", () => {
  // The v2 API parses this cookie at signup and there is no shared package
  // between the repos. If either side drifts, attribution silently zeroes out
  // rather than failing loudly, so pin the literals here and there.
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

  it("reads utm_term as ut", () => {
    expect(parseCampaignParams("?utm_term=ai+agents")).toBeNull();
    expect(parseCampaignParams("?utm_term=ai-agents")?.ut).toBe("ai-agents");
    expect(parseCampaignParams("?ut=short")?.ut).toBe("short");
  });

  it("records an external referrer even without campaign params", () => {
    const parsed = parseCampaignParams("", "/", {
      url: "https://www.x.com/someone/status/123?s=20",
      currentHost: "construct.computer",
    });
    expect(parsed).toMatchObject({ rd: "x.com", lp: "/" });
    expect(parsed?.us).toBeUndefined();
  });

  it("keeps the referrer next to campaign params", () => {
    const parsed = parseCampaignParams("?utm_source=x", "/", {
      url: "https://t.co/abc",
    });
    expect(parsed).toMatchObject({ us: "x", rd: "t.co" });
  });

  it("returns null for a direct visit or one of our own hops", () => {
    expect(parseCampaignParams("", "/", { url: "" })).toBeNull();
    expect(
      parseCampaignParams("", "/", {
        url: "https://accounts.google.com/o/oauth2/v2/auth",
      }),
    ).toBeNull();
  });

  it("rejects a landing path that is not a plain path", () => {
    expect(
      parseCampaignParams("?ref=x", "https://evil.test/")?.lp,
    ).toBeUndefined();
  });
});

describe("referringDomain", () => {
  it("keeps only the lowercased hostname, without www", () => {
    expect(referringDomain("https://WWW.Google.com/search?q=construct")).toBe(
      "google.com",
    );
    expect(referringDomain("https://news.ycombinator.com/item?id=1")).toBe(
      "news.ycombinator.com",
    );
    expect(referringDomain("https://ankush.one/")).toBe("ankush.one");
  });

  it("drops the Google sign-in bounce and its relatives", () => {
    expect(referringDomain("https://accounts.google.com/")).toBeUndefined();
    expect(referringDomain("https://accounts.google.co.in/")).toBeUndefined();
    expect(referringDomain("https://accounts.youtube.com/")).toBeUndefined();
    expect(
      referringDomain("android-app://com.google.android.gm/"),
    ).toBeUndefined();
    expect(referringDomain("https://com.google.android.gm/")).toBeUndefined();
  });

  it("keeps Gmail on the web, which is a real source", () => {
    expect(referringDomain("https://mail.google.com/")).toBe("mail.google.com");
  });

  it("drops our own domains, Stripe, and the current host", () => {
    expect(
      referringDomain("https://construct.computer/pricing/"),
    ).toBeUndefined();
    expect(referringDomain("https://app.construct.computer/")).toBeUndefined();
    expect(
      referringDomain("https://api.construct.computer/auth"),
    ).toBeUndefined();
    expect(
      referringDomain("https://checkout.stripe.com/c/pay"),
    ).toBeUndefined();
    expect(
      referringDomain("http://localhost:5173/", "localhost"),
    ).toBeUndefined();
  });

  it("drops empty, malformed, and non-web referrers", () => {
    expect(referringDomain("")).toBeUndefined();
    expect(referringDomain(null)).toBeUndefined();
    expect(referringDomain("not a url")).toBeUndefined();
    expect(referringDomain("file:///etc/passwd")).toBeUndefined();
    expect(referringDomain(`https://${"a".repeat(70)}.com/`)).toBeUndefined();
  });

  it("never keeps an IP address as a referring domain", () => {
    expect(referringDomain("http://192.168.1.20:3000/")).toBeUndefined();
    expect(referringDomain("http://203.0.113.7/")).toBeUndefined();
    expect(referringDomain("http://[2001:db8::1]/")).toBeUndefined();
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

  it("keeps a first-touch referrer when a later visit only brings a referrer", () => {
    const organic = { rd: "x.com", lp: "/", t: 1 };
    const merged = mergeFirstTouch(organic, {
      rd: "google.com",
      lp: "/pricing/",
      t: 2,
    });
    expect(merged).toEqual(organic);
  });

  it("lets a later campaign land on a referrer-only cookie", () => {
    // A bare referring domain is a weaker touch than a tagged link, so the
    // newsletter or UTM click still reaches the cookie and the API.
    const organic = { rd: "google.com", lp: "/", t: 1 };
    const merged = mergeFirstTouch(organic, {
      rd: "x.com",
      us: "x",
      uc: "launch",
      lp: "/launch/",
      t: 2,
    });
    expect(merged).toEqual({
      rd: "google.com",
      lp: "/",
      t: 1,
      us: "x",
      uc: "launch",
    });
  });

  it("keeps a campaign first touch over a later campaign", () => {
    const tagged = { rd: "google.com", us: "newsletter", t: 1 };
    expect(mergeFirstTouch(tagged, { us: "x", uc: "y", t: 2 })).toEqual(tagged);
  });

  it("lets the first real touch land after a promo- or answer-only cookie", () => {
    // A direct visitor who clicked a code chip, or answered "how did you hear",
    // has no first touch yet; the next campaign or referrer must still count.
    const merged = mergeFirstTouch(
      { p: "LAUNCH20", h: "friend", t: 1 },
      { rd: "reddit.com", lp: "/launch/", t: 2 },
    );
    expect(merged).toEqual({
      p: "LAUNCH20",
      h: "friend",
      rd: "reddit.com",
      lp: "/launch/",
      t: 2,
    });
    expect(hasFirstTouch(merged)).toBe(true);
  });

  it("lets a later answer replace the earlier one without moving first touch", () => {
    const merged = mergeFirstTouch({ ...first, h: "reddit" }, { h: "friend" });
    expect(merged).toEqual({ ...first, h: "friend" });
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

  it("round-trips the referrer, utm_term, and answer keys", () => {
    const value = { rd: "x.com", ut: "agents", h: "product-hunt", t: 5 };
    expect(parseAttributionCookie(serializeAttribution(value))).toEqual(value);
  });

  it("refuses a full URL or junk in the referrer and answer keys", () => {
    const tampered = encodeURIComponent(
      JSON.stringify({
        r: "ok",
        rd: "https://x.com/path",
        h: "Free text, not a slug",
      }),
    );
    expect(parseAttributionCookie(tampered)).toEqual({ r: "ok" });
  });

  it("drops an IP address stored as the referring domain", () => {
    const tampered = encodeURIComponent(
      JSON.stringify({ r: "ok", rd: "203.0.113.7" }),
    );
    expect(parseAttributionCookie(tampered)).toEqual({ r: "ok" });
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

  it("names the first-touch referrer so it can't collide with PostHog's own", () => {
    expect(
      toAnalyticsProperties({ rd: "x.com", ut: "agents", h: "x" }),
    ).toEqual({
      referring_domain_first_touch: "x.com",
      utm_term: "agents",
    });
  });

  it("omits absent fields rather than emitting undefined", () => {
    expect(toAnalyticsProperties({})).toEqual({});
  });
});
