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
      vi.fn(async () =>
        Response.json({
          success: true,
          action: "beta_signup",
          hostname: "construct.example",
        }),
      ),
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
    expect(await response.json()).toEqual({ ok: true });
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

  it("returns the same success for duplicate emails", async () => {
    const db = createDb();
    const env = createEnv(db);

    const first = await handle(request(), env);
    const duplicate = await handle(
      request({ ...validBody, email: "PERSON@example.com" }),
      env,
    );

    expect(await first.json()).toEqual({ ok: true });
    expect(await duplicate.json()).toEqual({ ok: true });
    expect(db.rows).toHaveLength(1);
  });

  it("returns generic success for a filled honeypot without storing it", async () => {
    const db = createDb();
    const response = await handle(
      request({ ...validBody, honeypot: "spam" }),
      createEnv(db),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
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
      vi.fn(async () =>
        Response.json({
          success: true,
          hostname: "construct.example",
          metadata: { result_with_testing_key: true },
        }),
      ),
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
      vi.fn(async () =>
        Response.json({
          success: true,
          action: "beta_signup",
          hostname: "construct.example",
        }),
      ),
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
