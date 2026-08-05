import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearPostLoginWelcome,
  consumePostLoginWelcome,
  markPostLoginWelcome,
  peekPostLoginWelcome,
  shouldOpenPostLoginWelcomePreview,
} from "./post-login-welcome";

function installSessionStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  });
}

describe("post-login-welcome", () => {
  beforeEach(() => {
    installSessionStorage();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-06T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("marks and peeks a payload", () => {
    markPostLoginWelcome({ source: "nav", plan: "pro" });
    expect(peekPostLoginWelcome()).toEqual({
      source: "nav",
      plan: "pro",
      ts: Date.parse("2026-08-06T00:00:00.000Z"),
    });
    // Peek does not clear.
    expect(peekPostLoginWelcome()?.source).toBe("nav");
  });

  it("consumes once", () => {
    markPostLoginWelcome({ source: "hero" });
    expect(consumePostLoginWelcome()?.source).toBe("hero");
    expect(consumePostLoginWelcome()).toBeNull();
    expect(peekPostLoginWelcome()).toBeNull();
  });

  it("drops expired payloads on peek", () => {
    markPostLoginWelcome({ source: "stale" });
    vi.setSystemTime(Date.now() + 31 * 60 * 1000);
    expect(peekPostLoginWelcome()).toBeNull();
    expect(sessionStorage.getItem("construct.landing.postLoginWelcome")).toBeNull();
  });

  it("clear removes the flag", () => {
    markPostLoginWelcome({ source: "x" });
    clearPostLoginWelcome();
    expect(peekPostLoginWelcome()).toBeNull();
  });

  it("honors ?welcome=1 on localhost without auth", () => {
    expect(
      shouldOpenPostLoginWelcomePreview("?welcome=1", {
        isDev: false,
        hostname: "localhost",
      }),
    ).toBe(true);
    expect(
      shouldOpenPostLoginWelcomePreview("?welcome=now", {
        isDev: false,
        hostname: "127.0.0.1",
      }),
    ).toBe(true);
    expect(
      shouldOpenPostLoginWelcomePreview("?welcome=1", {
        isDev: false,
        hostname: "construct.computer",
      }),
    ).toBe(false);
    expect(
      shouldOpenPostLoginWelcomePreview("", {
        isDev: true,
        hostname: "construct.computer",
      }),
    ).toBe(false);
    expect(
      shouldOpenPostLoginWelcomePreview("?welcome=1", {
        isDev: true,
        hostname: "construct.computer",
      }),
    ).toBe(true);
  });
});
