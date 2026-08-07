import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildListmonkAttribs,
  mergeListmonkAttribs,
  subscribeListmonk,
} from "../functions/listmonk";
import type { BetaSignupEnv } from "../functions/types";

const privateEnv = {
  LISTMONK_BASE_URL: "https://listmonk.test",
  LISTMONK_NEWSLETTER_LIST_ID: "42",
  LISTMONK_API_USER: "api",
  LISTMONK_API_TOKEN: "token",
} as BetaSignupEnv;

describe("buildListmonkAttribs", () => {
  it("flattens source and campaign fields for Listmonk queries", () => {
    const attribs = buildListmonkAttribs({
      ctaSource: "footer",
      referral: "other",
      referralOther: "newsletter",
      subscribedVia: "landing_footer",
      campaignRef: "mailinglist",
      campaignId: "cid-1",
      utmSource: "email",
      landingPath: "/launch",
    });
    expect(attribs.source).toBe("footer");
    expect(attribs.cta_source).toBe("footer");
    expect(attribs.subscribed_via).toBe("landing_footer");
    expect(attribs.campaign_ref).toBe("mailinglist");
    expect(attribs.utm_source).toBe("email");
    expect(attribs.landing_path).toBe("/launch");
    expect(typeof attribs.subscribed_at).toBe("string");
  });
});

describe("mergeListmonkAttribs", () => {
  it("keeps first-touch keys and records last_touch", () => {
    const merged = mergeListmonkAttribs(
      { source: "footer", campaign_ref: "email" },
      { source: "auth-google", campaign_ref: "other", utm_source: "twitter" },
    );
    expect(merged.source).toBe("footer");
    expect(merged.campaign_ref).toBe("email");
    expect(merged.utm_source).toBe("twitter");
    expect(merged.last_touch_source).toBe("auth-google");
    expect(typeof merged.last_touch_at).toBe("string");
  });
});

describe("subscribeListmonk", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns ok when Listmonk is explicitly disabled", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = await subscribeListmonk(
      { LISTMONK_BASE_URL: "" } as BetaSignupEnv,
      "a@b.com",
      undefined,
      {},
    );
    expect(result).toEqual({ ok: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses public subscribe when API credentials are missing", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => Response.json({ data: true }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await subscribeListmonk(
      {
        LISTMONK_BASE_URL: "https://listmonk.test",
        LISTMONK_NEWSLETTER_LIST_UUID: "list-uuid",
      } as BetaSignupEnv,
      "a@b.com",
      "Ada",
      buildListmonkAttribs({
        ctaSource: "footer",
        referral: "other",
        referralOther: "newsletter",
        subscribedVia: "landing_footer",
      }),
    );

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      "/api/public/subscription",
    );
  });

  it("returns ok:false when public subscribe fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 502 })),
    );
    const result = await subscribeListmonk(
      {
        LISTMONK_BASE_URL: "https://listmonk.test",
        LISTMONK_NEWSLETTER_LIST_UUID: "list-uuid",
      } as BetaSignupEnv,
      "a@b.com",
      undefined,
      {},
    );
    expect(result).toEqual({ ok: false });
  });

  it("creates a subscriber with attribs via the private API", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input);
      if (url.endsWith("/api/subscribers") && init?.method === "POST") {
        return Response.json({ data: { id: 1 } }, { status: 200 });
      }
      return Response.json({ data: true });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await subscribeListmonk(
      privateEnv,
      "a@b.com",
      "Ada",
      buildListmonkAttribs({
        ctaSource: "auth-google",
        referral: "other",
        referralOther: "auth-google",
        subscribedVia: "construct_auth",
        authProvider: "google",
        constructUserId: "user-1",
      }),
    );

    expect(result).toEqual({ ok: true });
    const create = fetchMock.mock.calls.find(
      ([url, init]) =>
        String(url).endsWith("/api/subscribers") &&
        init?.method === "POST",
    );
    const body = JSON.parse(String(create?.[1]?.body));
    expect(body.attribs.construct_user_id).toBe("user-1");
  });

  it("merges attribs and adds the list on 409 when not subscribed", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/subscribers") && init?.method === "POST") {
        return new Response(null, { status: 409 });
      }
      if (url.includes("/api/subscribers?query=")) {
        return Response.json({
          data: {
            results: [
              {
                id: 9,
                status: "enabled",
                attribs: { source: "footer", campaign_ref: "email" },
                lists: [],
              },
            ],
          },
        });
      }
      if (url.endsWith("/api/subscribers/9") && !init?.method) {
        return Response.json({
          data: {
            id: 9,
            status: "enabled",
            attribs: { source: "footer", campaign_ref: "email" },
            lists: [],
          },
        });
      }
      if (url.endsWith("/api/subscribers/9") && init?.method === "PATCH") {
        return Response.json({ data: true });
      }
      if (url.endsWith("/api/subscribers/lists") && init?.method === "PUT") {
        return Response.json({ data: true });
      }
      return Response.json({ data: true });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await subscribeListmonk(
      privateEnv,
      "a@b.com",
      undefined,
      buildListmonkAttribs({
        ctaSource: "auth-google",
        referral: "other",
        referralOther: "auth-google",
        subscribedVia: "construct_auth",
      }),
    );

    expect(result).toEqual({ ok: true });
    const lists = fetchMock.mock.calls.find(
      ([url, init]) =>
        String(url).endsWith("/api/subscribers/lists") &&
        (init as RequestInit | undefined)?.method === "PUT",
    );
    expect(lists).toBeTruthy();
  });

  it("does not re-add an unsubscribed list membership on 409", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/subscribers") && init?.method === "POST") {
        return new Response(null, { status: 409 });
      }
      if (url.includes("/api/subscribers?query=")) {
        return Response.json({
          data: {
            results: [
              {
                id: 9,
                status: "enabled",
                attribs: { source: "footer" },
                lists: [{ id: 42, status: "unsubscribed" }],
              },
            ],
          },
        });
      }
      if (url.endsWith("/api/subscribers/9") && init?.method === "PATCH") {
        return Response.json({ data: true });
      }
      return Response.json({ data: true });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await subscribeListmonk(
      privateEnv,
      "a@b.com",
      undefined,
      buildListmonkAttribs({
        ctaSource: "auth-google",
        referral: "other",
        referralOther: "auth-google",
        subscribedVia: "construct_auth",
      }),
    );

    expect(result).toEqual({ ok: true });
    expect(
      fetchMock.mock.calls.some(([url, init]) =>
        String(url).endsWith("/api/subscribers/lists") &&
        (init as RequestInit | undefined)?.method === "PUT",
      ),
    ).toBe(false);
  });

  it("does not re-add when already confirmed on the list", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/subscribers") && init?.method === "POST") {
        return new Response(null, { status: 409 });
      }
      if (url.includes("/api/subscribers?query=")) {
        return Response.json({
          data: {
            results: [
              {
                id: 9,
                status: "enabled",
                attribs: {},
                lists: [{ id: 42, status: "confirmed" }],
              },
            ],
          },
        });
      }
      if (url.endsWith("/api/subscribers/9") && init?.method === "PATCH") {
        return Response.json({ data: true });
      }
      return Response.json({ data: true });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await subscribeListmonk(privateEnv, "a@b.com", undefined, {});
    expect(result).toEqual({ ok: true });
    expect(
      fetchMock.mock.calls.some(([url, init]) =>
        String(url).endsWith("/api/subscribers/lists") &&
        (init as RequestInit | undefined)?.method === "PUT",
      ),
    ).toBe(false);
  });
});
