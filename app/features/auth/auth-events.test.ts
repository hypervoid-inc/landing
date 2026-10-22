import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  landingAuthEvent,
  markGoogleSignIn,
  takeGoogleSignIn,
} from "./auth-events";

describe("landingAuthEvent", () => {
  it("sends auth_completed with method and source on success", () => {
    expect(landingAuthEvent("email_otp", "verify", { success: true })).toEqual([
      "auth_completed",
      { method: "email_otp", source: "landing" },
    ]);
  });

  it("sends auth_failed with the step and reason on failure", () => {
    expect(
      landingAuthEvent("email_otp", "send", {
        success: false,
        reason: "http_429",
      }),
    ).toEqual([
      "auth_failed",
      {
        method: "email_otp",
        source: "landing",
        step: "send",
        reason: "http_429",
      },
    ]);
    expect(landingAuthEvent("password", "verify", { success: false })).toEqual([
      "auth_failed",
      { method: "password", source: "landing", step: "verify" },
    ]);
  });
});

describe("Google sign-in note", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("counts a code that lands soon after a Google click, once", () => {
    markGoogleSignIn(1_000);
    expect(takeGoogleSignIn(2_000)).toBe(true);
    expect(takeGoogleSignIn(2_000)).toBe(false);
  });

  it("ignores a stale click and a code with no click", () => {
    expect(takeGoogleSignIn(1_000)).toBe(false);
    markGoogleSignIn(1_000);
    expect(takeGoogleSignIn(1_000 + 11 * 60 * 1000)).toBe(false);
  });
});
