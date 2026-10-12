import { afterEach, describe, expect, it, vi } from "vitest";

import { REFERRAL_SOURCES } from "../../../shared/beta-signup-schema";
import {
  cleanHeardAboutDetail,
  HEARD_ABOUT_OPTIONS,
  isHeardAbout,
  markHeardAboutSettled,
  shouldAskHeardAbout,
} from "./heard-about";

describe("HEARD_ABOUT_OPTIONS", () => {
  it("uses slugs the attribution cookie accepts", () => {
    for (const [slug] of HEARD_ABOUT_OPTIONS) {
      expect(slug).toMatch(/^[a-z0-9-]{1,32}$/);
    }
  });

  it("ends with Other so the free-text box has somewhere to live", () => {
    expect(HEARD_ABOUT_OPTIONS.at(-1)?.[0]).toBe("other");
  });

  it("is its own list, not the D1-backed referral enum", () => {
    expect(REFERRAL_SOURCES).not.toContain("ai-assistant");
  });

  it("only accepts known slugs", () => {
    expect(isHeardAbout("product-hunt")).toBe(true);
    expect(isHeardAbout("")).toBe(false);
    expect(isHeardAbout("<script>")).toBe(false);
  });
});

describe("cleanHeardAboutDetail", () => {
  it("trims, collapses whitespace, and caps the length", () => {
    expect(cleanHeardAboutDetail("  a   podcast \n")).toBe("a podcast");
    expect(cleanHeardAboutDetail("x".repeat(200))).toHaveLength(120);
  });

  it("drops empty input", () => {
    expect(cleanHeardAboutDetail("   ")).toBeUndefined();
    expect(cleanHeardAboutDetail(undefined)).toBeUndefined();
  });

  it("drops anything that looks like an email address", () => {
    expect(cleanHeardAboutDetail("my boss jane@acme.com")).toBeUndefined();
  });

  it("drops URLs with a query string but keeps plain mentions", () => {
    expect(
      cleanHeardAboutDetail("https://example.com/post?token=abc"),
    ).toBeUndefined();
    expect(cleanHeardAboutDetail("example.com/?ref=me")).toBeUndefined();
    expect(cleanHeardAboutDetail("a newsletter at example.com")).toBe(
      "a newsletter at example.com",
    );
    expect(cleanHeardAboutDetail("a talk, was it you?")).toBe(
      "a talk, was it you?",
    );
  });
});

describe("shouldAskHeardAbout", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("asks once per browser", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
    });
    expect(shouldAskHeardAbout()).toBe(true);
    markHeardAboutSettled();
    expect(shouldAskHeardAbout()).toBe(false);
  });

  it("still asks, and never throws, when storage is blocked", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    });
    expect(() => markHeardAboutSettled()).not.toThrow();
    expect(shouldAskHeardAbout()).toBe(true);
  });
});
