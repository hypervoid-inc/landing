import { afterEach, describe, expect, it, vi } from "vitest";

import { onRequest } from "../functions/api/campaign-touch";
import { findSubscriberEmailByUuid } from "../functions/listmonk";
import { captureCampaignTouch } from "../functions/posthog";
import type { BetaSignupEnv } from "../functions/types";

vi.mock("../functions/listmonk", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../functions/listmonk")>();
  return {
    ...actual,
    findSubscriberEmailByUuid: vi.fn(),
  };
});

vi.mock("../functions/posthog", () => ({
  captureCampaignTouch: vi.fn(() => Promise.resolve()),
}));

const env = {
  ALLOWED_ORIGIN_HOSTNAME: "construct.computer",
  POSTHOG_PROJECT_KEY: "phc_test",
} as BetaSignupEnv;

const sid = "7c3e7b8c-7e05-4482-a5eb-a20c7505dbf6";

function request(body: unknown, origin = "https://construct.computer") {
  return new Request("https://construct.computer/api/campaign-touch", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/campaign-touch", () => {
  afterEach(() => {
    vi.mocked(findSubscriberEmailByUuid).mockReset();
    vi.mocked(captureCampaignTouch).mockClear();
  });

  it("rejects missing origin", async () => {
    const res = await onRequest({
      request: new Request("https://construct.computer/api/campaign-touch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sid }),
      }),
      env,
    });
    expect(res.status).toBe(403);
  });

  it("returns opaque 404 for unknown sid", async () => {
    vi.mocked(findSubscriberEmailByUuid).mockResolvedValue(null);
    const res = await onRequest({ request: request({ sid }), env });
    expect(res.status).toBe(404);
    expect(captureCampaignTouch).not.toHaveBeenCalled();
  });

  it("returns email and schedules PostHog capture via waitUntil", async () => {
    vi.mocked(findSubscriberEmailByUuid).mockResolvedValue("ada@example.com");
    const pending: Promise<unknown>[] = [];
    const res = await onRequest({
      request: request({
        sid,
        utm_campaign: "prelaunch-2026-08",
        utm_content: "cta-body-1",
        landing_path: "/launch/",
      }),
      env,
      waitUntil: (p) => {
        pending.push(p);
      },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ email: "ada@example.com" });
    expect(captureCampaignTouch).toHaveBeenCalledWith(
      env,
      "ada@example.com",
      expect.objectContaining({
        campaign_ref: "mailinglist",
        utm_source: "newsletter",
        utm_medium: "email",
        utm_campaign: "prelaunch-2026-08",
        utm_content: "cta-body-1",
        campaign_landing_path: "/launch/",
      }),
    );
    expect(pending).toHaveLength(1);
    await Promise.all(pending);
  });

  it("awaits capture when waitUntil is absent", async () => {
    vi.mocked(findSubscriberEmailByUuid).mockResolvedValue("ada@example.com");
    const res = await onRequest({
      request: request({ sid }),
      env,
    });
    expect(res.status).toBe(200);
    expect(captureCampaignTouch).toHaveBeenCalledOnce();
  });
});
