import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  captureCampaignOnLoad,
  readAttributionCookie,
  writeHeardAbout,
  writePromoCode,
} from "./campaign-attribution.client";

/**
 * Just enough of `window` and `document` for the cookie round-trip. Assigning
 * `document.cookie` keeps only the `name=value` pair, like a browser does.
 */
function stubBrowser() {
  const jar = new Map<string, string>();
  let writes = 0;
  const location = {
    hostname: "construct.computer",
    pathname: "/",
    search: "",
  };
  const document = {
    referrer: "",
    get cookie() {
      return [...jar].map(([key, value]) => `${key}=${value}`).join("; ");
    },
    set cookie(raw: string) {
      writes += 1;
      const pair = raw.split(";")[0] ?? "";
      const index = pair.indexOf("=");
      jar.set(pair.slice(0, index), pair.slice(index + 1));
    },
  };
  vi.stubGlobal("window", { location });
  vi.stubGlobal("document", document);

  return {
    visit(url: string, referrer = "") {
      const parsed = new URL(url, "https://construct.computer");
      location.pathname = parsed.pathname;
      location.search = parsed.search;
      document.referrer = referrer;
      return captureCampaignOnLoad();
    },
    writes: () => writes,
  };
}

describe("captureCampaignOnLoad", () => {
  let browser: ReturnType<typeof stubBrowser>;

  beforeEach(() => {
    browser = stubBrowser();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("saves the referring domain for an organic first visit", () => {
    const result = browser.visit("/", "https://x.com/ItsAditya_xyz/status/1");
    expect(readAttributionCookie()).toMatchObject({ rd: "x.com", lp: "/" });
    // `campaign_landed` stays reserved for visits that carried params.
    expect(result.isFirstTouch).toBe(false);
  });

  it("writes nothing for a direct visit", () => {
    browser.visit("/");
    expect(readAttributionCookie()).toBeNull();
    expect(browser.writes()).toBe(0);
  });

  it("ignores the Google sign-in bounce and our own pages", () => {
    browser.visit("/", "https://accounts.google.com/");
    browser.visit("/pricing/", "https://construct.computer/");
    expect(readAttributionCookie()).toBeNull();
  });

  it("does not let a later referrer overwrite the first touch", () => {
    browser.visit("/", "https://ankush.one/");
    const writes = browser.writes();
    const later = browser.visit("/pricing/", "https://www.google.com/");
    expect(readAttributionCookie()).toMatchObject({
      rd: "ankush.one",
      lp: "/",
    });
    expect(later.isFirstTouch).toBe(false);
    // Nothing changed, so the cookie (and its expiry) was left alone.
    expect(browser.writes()).toBe(writes);
  });

  it("lets a later campaign land on a referrer-only cookie", () => {
    browser.visit("/", "https://www.google.com/search?q=construct");
    const later = browser.visit("/?utm_source=x&utm_campaign=y");
    expect(readAttributionCookie()).toMatchObject({
      rd: "google.com",
      lp: "/",
      us: "x",
      uc: "y",
    });
    expect(later.isFirstTouch).toBe(true);
  });

  it("does not let a later campaign overwrite a campaign first touch", () => {
    browser.visit("/?utm_source=newsletter");
    const writes = browser.writes();
    const later = browser.visit("/?utm_source=x&utm_campaign=y");
    expect(readAttributionCookie()?.us).toBe("newsletter");
    expect(readAttributionCookie()?.uc).toBeUndefined();
    expect(later.isFirstTouch).toBe(false);
    expect(browser.writes()).toBe(writes);
  });

  it("reports a campaign first touch and reads utm_term", () => {
    const result = browser.visit("/?utm_source=x&utm_term=ai-agents");
    expect(result.isFirstTouch).toBe(true);
    expect(readAttributionCookie()).toMatchObject({ us: "x", ut: "ai-agents" });
  });

  it("still credits the first real touch after a promo-only cookie", () => {
    writePromoCode("LAUNCH20");
    browser.visit("/", "https://www.reddit.com/r/startups/");
    expect(readAttributionCookie()).toMatchObject({
      p: "LAUNCH20",
      rd: "reddit.com",
    });
  });

  it("adds the heard-about slug without touching first-touch fields", () => {
    browser.visit("/?utm_source=x");
    const before = readAttributionCookie();
    writeHeardAbout("product-hunt");
    expect(readAttributionCookie()).toEqual({ ...before, h: "product-hunt" });
  });
});
