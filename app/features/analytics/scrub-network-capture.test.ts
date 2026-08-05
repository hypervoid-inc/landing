import { describe, expect, it } from "vitest";

import { isCredentialUrl, scrubNetworkCapture } from "./scrub-network-capture";

describe("isCredentialUrl", () => {
  it.each([
    "https://api.construct.computer/api/auth/password/set",
    "https://api.construct.computer/api/auth/password/login",
    "https://api.construct.computer/api/auth/magic/verify-otp",
    "https://api.construct.computer/api/auth/exchange",
    "https://api.construct.computer/api/auth/refresh",
    "https://api.construct.computer/api/v1/llm/byok/keys/anthropic",
  ])("flags %s", (url) => {
    expect(isCredentialUrl(url)).toBe(true);
  });

  it.each([
    "https://api.construct.computer/api/auth/me",
    "https://api.construct.computer/api/v1/billing/plan",
    "https://construct.computer/account",
  ])("leaves %s alone", (url) => {
    expect(isCredentialUrl(url)).toBe(false);
  });

  it("matches on the path so a query string cannot disguise the endpoint", () => {
    expect(
      isCredentialUrl("https://api.construct.computer/api/auth/me?x=/llm/byok"),
    ).toBe(false);
  });

  it("treats a missing url as safe rather than throwing", () => {
    expect(isCredentialUrl(undefined)).toBe(false);
  });
});

describe("scrubNetworkCapture", () => {
  it("redacts the body of a password submission", () => {
    const scrubbed = scrubNetworkCapture({
      name: "https://api.construct.computer/api/auth/password/set",
      requestBody: JSON.stringify({ password: "hunter2-correct-horse" }),
      responseBody: JSON.stringify({ ok: true }),
    });

    expect(scrubbed.requestBody).toBe("[redacted]");
    expect(scrubbed.responseBody).toBe("[redacted]");
    expect(JSON.stringify(scrubbed)).not.toContain("hunter2");
  });

  it("redacts a BYOK provider key", () => {
    const scrubbed = scrubNetworkCapture({
      name: "https://api.construct.computer/api/v1/llm/byok/keys/anthropic",
      requestBody: JSON.stringify({ apiKey: "sk-ant-secret-value" }),
    });

    expect(JSON.stringify(scrubbed)).not.toContain("sk-ant-secret-value");
  });

  it("keeps ordinary payloads so replay stays useful", () => {
    const scrubbed = scrubNetworkCapture({
      name: "https://api.construct.computer/api/v1/billing/plan",
      requestBody: null,
      responseBody: JSON.stringify({ plan: "pro" }),
    });

    expect(scrubbed.responseBody).toBe(JSON.stringify({ plan: "pro" }));
  });

  it("redacts credential headers on every request, not just auth endpoints", () => {
    const scrubbed = scrubNetworkCapture({
      name: "https://api.construct.computer/api/v1/billing/plan",
      requestHeaders: {
        Authorization: "Bearer leaked.jwt.value",
        Cookie: "construct_session=leaked",
        "Content-Type": "application/json",
      },
    });

    expect(scrubbed.requestHeaders).toEqual({
      Authorization: "[redacted]",
      Cookie: "[redacted]",
      "Content-Type": "application/json",
    });
  });

  it("preserves timing fields so the request still shows up in replay", () => {
    const scrubbed = scrubNetworkCapture({
      name: "https://api.construct.computer/api/auth/password/login",
      requestBody: "secret",
      status: 200,
      duration: 42,
    } as { name: string; requestBody: string; status: number; duration: number });

    expect(scrubbed.status).toBe(200);
    expect(scrubbed.duration).toBe(42);
  });
});
