import { afterEach, describe, expect, it, vi } from "vitest";

import { sendMagicLink, verifyMagicOtp } from "./auth";

function stubResponse(status: number, body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(body), { status })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("verifyMagicOtp", () => {
  it("carries the API's failure code as the reason", async () => {
    stubResponse(401, { error: "This code has expired.", code: "expired" });
    await expect(verifyMagicOtp("a@b.co", "123456")).resolves.toEqual({
      success: false,
      error: "This code has expired.",
      reason: "expired",
    });
  });

  it("falls back to the status when the code is missing or not a slug", async () => {
    stubResponse(429, { error: "Slow down" });
    expect((await verifyMagicOtp("a@b.co", "1")).reason).toBe("http_429");
    stubResponse(401, { error: "x", code: "Wrong code for a@b.co" });
    expect((await verifyMagicOtp("a@b.co", "1")).reason).toBe("http_401");
  });

  it("has no reason on success", async () => {
    stubResponse(200, { token: "t" });
    const result = await verifyMagicOtp("a@b.co", "123456");
    expect(result.success).toBe(true);
    expect(result.reason).toBeUndefined();
  });
});

describe("sendMagicLink", () => {
  it("carries the status as the reason when the send fails", async () => {
    stubResponse(400, { error: "Invalid captcha" });
    await expect(sendMagicLink("a@b.co")).resolves.toEqual({
      success: false,
      error: "Invalid captcha",
      reason: "http_400",
    });
  });
});
