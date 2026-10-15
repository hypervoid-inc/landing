import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { onRequest as claim } from "../functions/api/embed/claim";
import { claimLink, greetingName, renderClaimEmail } from "../functions/claim-email";
import { onRequest as session } from "../functions/api/embed/session";
import {
  keyedHash,
  mintSessionToken,
  verifySessionToken,
} from "../functions/embed-session";
import type { D1Statement, EmbedEnv } from "../functions/types";
import {
  EMBED_SESSIONS_PER_IP_PER_HOUR,
} from "../shared/embed-schema";

const SECRET = "test-secret-test-secret";

type SessionRow = {
  id: string;
  email_hash: string;
  ip_hash: string | null;
  src: string;
  turns: number;
  created_at: number;
  claimed_at: string | null;
};

/**
 * Just enough of D1 for the embed functions: it recognises each query by a
 * fragment and keeps rows in memory.
 */
function createDb() {
  const signups: string[] = [];
  const sessions: SessionRow[] = [];
  const db = {
    signups,
    sessions,
    prepare(query: string) {
      let values: unknown[] = [];
      const statement: D1Statement = {
        bind(...bound: unknown[]) {
          values = bound;
          return statement;
        },
        async run() {
          if (query.includes("INSERT INTO beta_signups")) {
            signups.push(String(values[0]));
            return { success: true };
          }
          if (query.includes("INSERT INTO embed_sessions")) {
            sessions.push({
              id: String(values[0]),
              email_hash: "",
              ip_hash: values[1] === null ? null : String(values[1]),
              src: String(values[2]),
              turns: 0,
              created_at: Date.now(),
              claimed_at: null,
            });
            return { success: true };
          }
          if (query.includes("claimed_at = strftime")) {
            const row = sessions.find((s) => s.id === values[0] && !s.claimed_at);
            if (row) {
              row.email_hash = String(values[1]);
              row.claimed_at = "now";
            }
            return { success: true, meta: { changes: row ? 1 : 0 } };
          }
          if (query.includes("DELETE FROM embed_sessions")) {
            return { success: true };
          }
          throw new Error(`unexpected run: ${query}`);
        },
        async first<T>() {
          if (query.includes("COUNT(*) AS total")) {
            return {
              total: sessions.length,
              by_ip: sessions.filter((s) => s.ip_hash === values[0]).length,
            } as T;
          }
          if (query.includes("SELECT src, claimed_at")) {
            const row = sessions.find((s) => s.id === values[0]);
            return (row ? { src: row.src, claimed_at: row.claimed_at } : null) as T;
          }
          throw new Error(`unexpected first: ${query}`);
        },
      };
      return statement;
    },
  };
  return db;
}

function createEnv(
  db = createDb(),
  overrides: Partial<Omit<EmbedEnv, "DB">> = {},
): EmbedEnv & { DB: ReturnType<typeof createDb> } {
  return {
    TURNSTILE_SECRET_KEY: "secret",
    TURNSTILE_EXPECTED_HOSTNAME: "construct.example",
    EMBED_SESSION_SECRET: SECRET,
    ...overrides,
    DB: db,
  };
}

function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(`https://construct.example${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

const lead = {
  name: "ada lovelace",
  src: "launch",
  turnstileToken: "verified",
};

async function startSession(env: EmbedEnv, body: unknown = lead, ip = "203.0.113.9") {
  const response = await session({
    request: post("/api/embed/session", body, { "CF-Connecting-IP": ip }),
    env,
  });
  return { response, body: (await response.json()) as Record<string, unknown> };
}

describe("session tokens", () => {
  it("round-trip, and refuse tampering or expiry", async () => {
    const sid = crypto.randomUUID();
    const { token } = await mintSessionToken(SECRET, sid);
    expect(await verifySessionToken(SECRET, token)).toMatchObject({ sid });
    expect(await verifySessionToken("other-secret", token)).toBeNull();
    expect(await verifySessionToken(SECRET, `${token}x`)).toBeNull();
    expect(
      await verifySessionToken(SECRET, token, Date.now() + 3 * 60 * 60 * 1000),
    ).toBeNull();
  });

  it("hashes with the secret, so the stored value names nobody", async () => {
    const a = await keyedHash(SECRET, "email", "ada@example.com");
    const b = await keyedHash("other", "email", "ada@example.com");
    expect(a).not.toBe(b);
    expect(a).not.toContain("ada");
  });
});

describe("POST /api/embed/session", () => {
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

  it("hands back a token and a capitalised first name, and stores no lead yet", async () => {
    const env = createEnv();
    const { response, body } = await startSession(env);
    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: true, firstName: "Ada" });
    expect(env.DB.signups).toEqual([]);
    expect(env.DB.sessions).toHaveLength(1);
    expect(env.DB.sessions[0]).toMatchObject({ src: "launch", turns: 0, email_hash: "" });
    expect(await verifySessionToken(SECRET, String(body.token))).not.toBeNull();
  });

  it("takes a plain first name, refuses an email as a name and unknown fields", async () => {
    const env = createEnv();
    expect((await startSession(env, { ...lead, name: "ada" })).response.status).toBe(200);
    expect((await startSession(env, { ...lead, name: "ada@example.com" })).response.status).toBe(400);
    expect((await startSession(env, { ...lead, name: "1234" })).response.status).toBe(400);
    expect((await startSession(env, { ...lead, email: "x@y.z" })).response.status).toBe(400);
  });

  it("closes the demo past the daily cap", async () => {
    const env = createEnv(createDb(), { EMBED_DAILY_SESSION_CAP: "1" });
    expect((await startSession(env)).response.status).toBe(200);
    const second = await startSession(env);
    expect(second.response.status).toBe(503);
    expect(second.body).toMatchObject({ error: { code: "demo_full" } });
    expect(env.DB.sessions).toHaveLength(1);
  });

  it("limits sessions per address", async () => {
    const env = createEnv();
    for (let i = 0; i < EMBED_SESSIONS_PER_IP_PER_HOUR; i++) {
      expect((await startSession(env)).response.status).toBe(200);
    }
    const over = await startSession(env);
    expect(over.response.status).toBe(429);
    expect(over.body).toMatchObject({ error: { code: "too_many_sessions" } });
  });

  it("gives a filled honeypot a token that opens nothing", async () => {
    const env = createEnv();
    const { response, body } = await startSession(env, { ...lead, honeypot: "bot" });
    expect(response.status).toBe(200);
    expect(env.DB.sessions).toEqual([]);
    expect(await verifySessionToken(SECRET, String(body.token))).toBeNull();
  });

  it("refuses without the session secret", async () => {
    const env = createEnv(createDb(), { EMBED_SESSION_SECRET: "" });
    expect((await startSession(env)).response.status).toBe(500);
  });
});

describe("POST /api/embed/claim", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ success: true, action: "beta_signup", hostname: "construct.example" }),
      ),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  async function sessionFor(env: EmbedEnv) {
    const { body } = await startSession(env);
    return String(body.token);
  }

  function ask(env: EmbedEnv, body: unknown) {
    return claim({ request: post("/api/embed/claim", body), env });
  }

  it("stores the lead once and hands out the code, the same code again after", async () => {
    const env = createEnv(createDb(), { EMBED_PROMO_CODE: "FREEMONTH" });
    const token = await sessionFor(env);
    const first = await ask(env, { token, email: "Ada@Example.com", name: "Ada" });
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ ok: true, code: "FREEMONTH" });
    expect(env.DB.signups).toEqual(["ada@example.com"]);
    expect(env.DB.sessions[0]?.claimed_at).toBe("now");
    expect(env.DB.sessions[0]?.email_hash).not.toContain("ada");

    const again = await ask(env, { token, email: "other@example.com" });
    expect(again.status).toBe(200);
    expect(await again.json()).toEqual({ ok: true, code: "FREEMONTH" });
    expect(env.DB.signups).toEqual(["ada@example.com"]);
  });

  it("emails the code once, through Cloudflare Email Service", async () => {
    const env = createEnv(createDb(), {
      EMBED_PROMO_CODE: "FREEMONTH",
      EMAIL_API_TOKEN: "cf-token",
      CLOUDFLARE_ACCOUNT_ID: "acct123",
      EMBED_EMAIL_REPLY_TO: "team@construct.example",
    });
    const token = await sessionFor(env);
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation(async (input: RequestInfo | URL) =>
      String(input).includes("/email/sending/send")
        ? Response.json({ success: true, errors: [], result: { delivered: ["ada@example.com"], permanent_bounces: [], queued: [] } })
        : Response.json({ success: true, action: "beta_signup", hostname: "construct.example" }),
    );
    await ask(env, { token, email: "ada@example.com", name: "Ada" });
    await ask(env, { token, email: "ada@example.com", name: "Ada" });

    const sends = fetchMock.mock.calls.filter(([url]) => String(url).includes("/email/sending/send"));
    expect(sends).toHaveLength(1);
    const [url, init] = sends[0]!;
    expect(String(url)).toBe("https://api.cloudflare.com/client/v4/accounts/acct123/email/sending/send");
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer cf-token");
    const body = JSON.parse(String(init?.body));
    expect(body).toMatchObject({
      to: "ada@example.com",
      from: { address: "noreply@construct.computer", name: "Construct" },
      reply_to: "team@construct.example",
    });
    expect(body.text).toContain("Hi Ada,");
    expect(body.text).toContain("FREEMONTH");
    expect(body.html).toContain(claimLink("FREEMONTH", "launch").replaceAll("&", "&amp;"));
  });

  it("still hands out the code when email isn't configured", async () => {
    const env = createEnv(createDb(), { EMBED_PROMO_CODE: "FREEMONTH" });
    const token = await sessionFor(env);
    const response = await ask(env, { token, email: "ada@example.com" });
    expect(await response.json()).toEqual({ ok: true, code: "FREEMONTH" });
    expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).includes("/email/sending/send"))).toBe(false);
  });

  it("refuses a forged token and a bad email", async () => {
    const env = createEnv();
    const token = await sessionFor(env);
    const forged = await mintSessionToken("another-secret", crypto.randomUUID());
    expect((await ask(env, { token: forged.token, email: "a@b.co" })).status).toBe(401);
    expect((await ask(env, { token, email: "not-an-email" })).status).toBe(400);
    expect(env.DB.signups).toEqual([]);
  });
});

describe("the claim email", () => {
  it("greets by a plain first name only", () => {
    expect(greetingName(" ada lovelace ")).toBe("ada");
    expect(greetingName("Zoë")).toBe("Zoë");
    expect(greetingName("<b>x</b>")).toBeUndefined();
    expect(greetingName("http://evil")).toBeUndefined();
    expect(greetingName(undefined)).toBeUndefined();
  });

  it("carries the code and the promo link, without dashes, and invites a reply only when one is set", () => {
    const quiet = renderClaimEmail({ to: "a@b.co", code: "FREEMONTH", src: "home" }, false);
    const replyable = renderClaimEmail({ to: "a@b.co", firstName: "Ada", code: "FREEMONTH", src: "home" }, true);
    expect(quiet.text).toContain("Hi there,");
    expect(quiet.text).toContain("https://construct.computer/?promo=FREEMONTH");
    expect(quiet.text).not.toContain("reply to this email");
    expect(replyable.text).toContain("reply to this email");
    for (const part of [quiet.subject, quiet.text, quiet.html, replyable.html]) {
      expect(part).not.toMatch(/[\u2013\u2014]/);
    }
  });
});
