import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { onRequest } from "../functions/api/beta-signup";
import type { BetaSignupEnv } from "../functions/types";
import { betaSignupSchema } from "../shared/beta-signup-schema";

const validBody = {
  email: " Person@Example.COM ",
  ctaSource: "hero",
  referral: "reddit",
  turnstileToken: "verified-token",
};

type StoredSignup = {
  email: string;
  ctaSource: string;
  referral: string;
  referralOther: string | null;
};

function createDb(fail = false) {
  const rows: StoredSignup[] = [];

  return {
    rows,
    prepare() {
      return {
        bind(
          email: string,
          ctaSource: string,
          referral: string,
          referralOther: string | null,
        ) {
          return {
            async run() {
              if (fail) throw new Error("database unavailable");
              if (!rows.some((row) => row.email === email)) {
                rows.push({ email, ctaSource, referral, referralOther });
              }
              return { success: true };
            },
          };
        },
      };
    },
  };
}

function createEnv(db = createDb()): BetaSignupEnv {
  return {
    DB: db,
    TURNSTILE_SECRET_KEY: "secret",
    TURNSTILE_EXPECTED_HOSTNAME: "construct.example",
  };
}

function request(body: unknown = validBody, init: RequestInit = {}) {
  return new Request("https://construct.example/api/beta-signup", {
    method: "POST",
    headers: { "content-type": "application/json", ...init.headers },
    body: JSON.stringify(body),
    ...init,
  });
}

async function handle(req: Request, env = createEnv()) {
  return onRequest({ request: req, env } as never);
}

describe("betaSignupSchema", () => {
  it("normalizes email and trims referral details", () => {
    const result = betaSignupSchema.parse({
      ...validBody,
      referral: "other",
      referralOther: "  A newsletter  ",
    });

    expect(result.email).toBe("person@example.com");
    expect(result.referralOther).toBe("A newsletter");
  });

  it("allows newsletter footer payloads without referral", () => {
    const result = betaSignupSchema.parse({
      email: "founder@example.com",
      name: " Ada ",
      ctaSource: "footer",
      turnstileToken: "token",
    });
    expect(result.name).toBe("Ada");
    expect(result.referral).toBeUndefined();
  });

  it("allows server ingest payloads without turnstileToken", () => {
    expect(
      betaSignupSchema.safeParse({
        email: "user@example.com",
        ctaSource: "auth-google",
        referral: "other",
        referralOther: "auth-google",
        meta: {
          subscribedVia: "construct_auth",
          authProvider: "google",
          constructUserId: "user-1",
          campaignRef: "mailinglist",
        },
      }).success,
    ).toBe(true);
  });

  it("rejects unknown meta keys", () => {
    expect(
      betaSignupSchema.safeParse({
        email: "user@example.com",
        ctaSource: "footer",
        meta: { evil: "x" },
      }).success,
    ).toBe(false);
  });

  it("rejects unknown referral values", () => {
    expect(
      betaSignupSchema.safeParse({ ...validBody, referral: "somewhere" })
        .success,
    ).toBe(false);
  });

  it("requires a detail for the other referral option", () => {
    expect(
      betaSignupSchema.safeParse({ ...validBody, referral: "other" }).success,
    ).toBe(false);
  });
});

describe("POST /api/beta-signup", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("turnstile")) {
          return Response.json({
            success: true,
            action: "beta_signup",
            hostname: "construct.example",
          });
        }
        return Response.json({ data: true });
      }),
    );
  });

  afterEach(() => vi.unstubAllGlobals());

  it("stores a verified signup without IP or user agent data", async () => {
    const db = createDb();
    const response = await handle(
      request(validBody, {
        headers: {
          "content-type": "application/json; charset=utf-8",
          "CF-Connecting-IP": "203.0.113.10",
          "User-Agent": "test browser",
        },
      }),
      createEnv(db),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, listmonk: true });
    expect(db.rows).toEqual([
      {
        email: "person@example.com",
        ctaSource: "hero",
        referral: "reddit",
        referralOther: null,
      },
    ]);
    expect(JSON.stringify(db.rows)).not.toContain("203.0.113.10");
    expect(JSON.stringify(db.rows)).not.toContain("test browser");
  });

  it("defaults referral and forwards the email to Listmonk", async () => {
    const db = createDb();
    const fetchMock = vi.mocked(fetch);
    const response = await handle(
      request({
        email: "founder@example.com",
        name: "Ada",
        ctaSource: "footer",
        turnstileToken: "verified-token",
      }),
      createEnv(db),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, listmonk: true });
    expect(db.rows).toEqual([
      {
        email: "founder@example.com",
        ctaSource: "footer",
        referral: "other",
        referralOther: "newsletter",
      },
    ]);
    const listmonkCall = fetchMock.mock.calls.find(([url]) =>
      String(url).includes("/api/public/subscription"),
    );
    expect(listmonkCall).toBeTruthy();
    expect(JSON.parse(String(listmonkCall?.[1]?.body))).toEqual({
      email: "founder@example.com",
      name: "Ada",
      list_uuids: ["7c3e7b8c-7e05-4482-a5eb-a20c7505dbf6"],
    });
  });

  it("returns listmonk:false when Listmonk subscribe fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("turnstile")) {
          return Response.json({
            success: true,
            action: "beta_signup",
            hostname: "construct.example",
          });
        }
        return new Response(null, { status: 502 });
      }),
    );
    const response = await handle(request(), createEnv());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, listmonk: false });
  });

  it("skips Listmonk when LISTMONK_BASE_URL is empty", async () => {
    const db = createDb();
    const fetchMock = vi.mocked(fetch);
    const response = await handle(request(), {
      ...createEnv(db),
      LISTMONK_BASE_URL: "",
    });
    expect(await response.json()).toEqual({ ok: true, listmonk: true });
    expect(
      fetchMock.mock.calls.some(([url]) =>
        String(url).includes("/api/public/subscription"),
      ),
    ).toBe(false);
    expect(db.rows).toHaveLength(1);
  });

  it("accepts server ingest with shared secret and no Turnstile", async () => {
    const db = createDb();
    const fetchMock = vi.mocked(fetch);
    const response = await handle(
      request(
        {
          email: "os-user@example.com",
          name: "Os User",
          ctaSource: "auth-google",
          referral: "other",
          referralOther: "auth-google",
          meta: {
            subscribedVia: "construct_auth",
            authProvider: "google",
            constructUserId: "user-9",
            utmSource: "twitter",
          },
        },
        {
          headers: {
            "content-type": "application/json",
            authorization: "Bearer ingest-secret",
          },
        },
      ),
      {
        ...createEnv(db),
        SIGNUP_INGEST_SECRET: "ingest-secret",
        LISTMONK_BASE_URL: "",
      },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, listmonk: true });
    expect(db.rows).toEqual([
      {
        email: "os-user@example.com",
        ctaSource: "auth-google",
        referral: "other",
        referralOther: "auth-google",
      },
    ]);
    expect(
      fetchMock.mock.calls.some(([url]) => String(url).includes("turnstile")),
    ).toBe(false);
  });

  it("strips privileged meta on the Turnstile browser path", async () => {
    const db = createDb();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("turnstile")) {
        return Response.json({
          success: true,
          action: "beta_signup",
          hostname: "construct.example",
        });
      }
      if (url.endsWith("/api/subscribers") && init?.method === "POST") {
        return Response.json({ data: { id: 1 } });
      }
      return Response.json({ data: true });
    });
    vi.stubGlobal("fetch", fetchMock);

    await handle(
      request({
        email: "spoof@example.com",
        ctaSource: "footer",
        turnstileToken: "verified-token",
        meta: {
          subscribedVia: "construct_auth",
          authProvider: "google",
          constructUserId: "evil-id",
          campaignRef: "mailinglist",
        },
      }),
      {
        ...createEnv(db),
        LISTMONK_BASE_URL: "https://listmonk.test",
        LISTMONK_NEWSLETTER_LIST_ID: "7",
        LISTMONK_API_USER: "api",
        LISTMONK_API_TOKEN: "token",
      },
    );

    const create = fetchMock.mock.calls.find(
      ([url, init]) =>
        String(url).endsWith("/api/subscribers") &&
        (init as RequestInit | undefined)?.method === "POST",
    );
    const body = JSON.parse(String(create?.[1]?.body));
    expect(body.attribs.subscribed_via).toBe("landing_footer");
    expect(body.attribs.construct_user_id).toBeUndefined();
    expect(body.attribs.auth_provider).toBeUndefined();
    expect(body.attribs.campaign_ref).toBe("mailinglist");
  });

  it("uses private Listmonk API with attribs when credentials are set", async () => {
    const db = createDb();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("turnstile")) {
        return Response.json({
          success: true,
          action: "beta_signup",
          hostname: "construct.example",
        });
      }
      if (url.endsWith("/api/subscribers") && init?.method === "POST") {
        return Response.json({ data: { id: 1 } });
      }
      return Response.json({ data: true });
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await handle(
      request({
        email: "founder@example.com",
        name: "Ada",
        ctaSource: "footer",
        turnstileToken: "verified-token",
        meta: {
          subscribedVia: "landing_footer",
          campaignRef: "mailinglist",
          utmSource: "email",
        },
      }),
      {
        ...createEnv(db),
        LISTMONK_BASE_URL: "https://listmonk.test",
        LISTMONK_NEWSLETTER_LIST_ID: "7",
        LISTMONK_API_USER: "api",
        LISTMONK_API_TOKEN: "token",
      },
    );

    expect(response.status).toBe(200);
    const create = fetchMock.mock.calls.find(
      ([url, init]) =>
        String(url).endsWith("/api/subscribers") &&
        (init as RequestInit | undefined)?.method === "POST",
    );
    expect(create).toBeTruthy();
    const body = JSON.parse(String(create?.[1]?.body));
    expect(body.attribs).toMatchObject({
      source: "footer",
      subscribed_via: "landing_footer",
      campaign_ref: "mailinglist",
      utm_source: "email",
    });
    expect(
      fetchMock.mock.calls.some(([url]) =>
        String(url).includes("/api/public/subscription"),
      ),
    ).toBe(false);
  });

  it("rejects a wrong ingest secret and still requires Turnstile", async () => {
    const response = await handle(
      request(
        {
          email: "os-user@example.com",
          ctaSource: "auth-google",
        },
        {
          headers: {
            "content-type": "application/json",
            authorization: "Bearer wrong",
          },
        },
      ),
      {
        ...createEnv(),
        SIGNUP_INGEST_SECRET: "ingest-secret",
      },
    );
    expect(response.status).toBe(400);
  });

  it("returns the same success for duplicate emails", async () => {
    const db = createDb();
    const env = createEnv(db);

    const first = await handle(request(), env);
    const duplicate = await handle(
      request({ ...validBody, email: "PERSON@example.com" }),
      env,
    );

    expect(await first.json()).toEqual({ ok: true, listmonk: true });
    expect(await duplicate.json()).toEqual({ ok: true, listmonk: true });
    expect(db.rows).toHaveLength(1);
  });

  it("returns generic success for a filled honeypot without storing it", async () => {
    const db = createDb();
    const response = await handle(
      request({ ...validBody, honeypot: "spam" }),
      createEnv(db),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, listmonk: true });
    expect(db.rows).toHaveLength(0);
  });

  it("rejects submissions from another browser origin", async () => {
    const response = await handle(
      request(validBody, {
        headers: {
          "content-type": "application/json",
          origin: "https://evil.example",
        },
      }),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: { code: "origin_rejected", message: "Request rejected" },
    });
  });

  it("supports Cloudflare test-key responses in explicit local test mode", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).includes("turnstile")) {
          return Response.json({
            success: true,
            hostname: "construct.example",
            metadata: { result_with_testing_key: true },
          });
        }
        return Response.json({ data: true });
      }),
    );

    const response = await handle(request(), {
      ...createEnv(),
      TURNSTILE_TEST_MODE: "true",
    });

    expect(response.status).toBe(200);
  });

  it.each([
    ["failed verification", { success: false }, 403],
    [
      "wrong action",
      { success: true, action: "login", hostname: "construct.example" },
      403,
    ],
    [
      "wrong hostname",
      { success: true, action: "beta_signup", hostname: "evil.example" },
      403,
    ],
  ])("rejects %s", async (_name, verification, status) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json(verification)),
    );

    const response = await handle(request());

    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({
      error: { code: "verification_failed", message: "Request rejected" },
    });
  });

  it("rejects non-JSON and malformed or invalid JSON", async () => {
    const unsupported = await handle(
      request(validBody, { headers: { "content-type": "text/plain" } }),
    );
    const malformed = await handle(request(validBody, { body: "{" }));
    const invalid = await handle(request({ ...validBody, email: "nope" }));

    expect(unsupported.status).toBe(415);
    expect(malformed.status).toBe(400);
    expect(invalid.status).toBe(400);
  });

  it("rejects unsupported methods and oversized bodies", async () => {
    const method = await handle(
      new Request("https://construct.example/api/beta-signup"),
    );
    const oversized = await handle(
      request({ ...validBody, honeypot: "x".repeat(8 * 1024) }),
    );

    expect(method.status).toBe(405);
    expect(method.headers.get("allow")).toBe("POST");
    expect(oversized.status).toBe(413);
  });

  it("returns a generic server error for configuration, Turnstile, or D1 failures", async () => {
    const missingConfig = await handle(request(), {
      ...createEnv(),
      TURNSTILE_SECRET_KEY: "",
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 502 })),
    );
    const turnstileFailure = await handle(request());

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).includes("turnstile")) {
          return Response.json({
            success: true,
            action: "beta_signup",
            hostname: "construct.example",
          });
        }
        return Response.json({ data: true });
      }),
    );
    const databaseFailure = await handle(request(), createEnv(createDb(true)));

    for (const response of [missingConfig, turnstileFailure, databaseFailure]) {
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: { code: "internal_error", message: "Unable to process request" },
      });
    }
  });
});
