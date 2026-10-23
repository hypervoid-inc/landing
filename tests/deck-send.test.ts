import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { onRequest as send } from "../functions/api/deck/send";
import { deckLink, recipientForEmail, renderDeckEmail } from "../functions/deck-email";
import type { D1Statement, DeckEnv } from "../functions/types";
import {
  DECK_PDF_FILENAME,
  DECK_PDF_PATH,
  DECK_SENDS_PER_EMAIL_PER_DAY,
  DECK_SENDS_PER_IP_PER_HOUR,
} from "../shared/deck-schema";

const PDF = new TextEncoder().encode("%PDF-1.4 the deck");

/** Just enough of D1 for the deck sends: rows in memory, recognised by query. */
function createDb() {
  const sends: Array<{ email_hash: string; ip_hash: string | null }> = [];
  return {
    sends,
    prepare(query: string) {
      let values: unknown[] = [];
      const statement: D1Statement = {
        bind(...bound: unknown[]) {
          values = bound;
          return statement;
        },
        async run() {
          if (query.includes("INSERT INTO deck_sends")) {
            sends.push({ email_hash: String(values[0]), ip_hash: values[1] === null ? null : String(values[1]) });
            return { success: true };
          }
          if (query.includes("DELETE FROM deck_sends")) return { success: true };
          throw new Error(`unexpected run: ${query}`);
        },
        async first<T>() {
          if (query.includes("AS by_email")) {
            return {
              by_email: sends.filter((s) => s.email_hash === values[0]).length,
              by_ip: sends.filter((s) => s.ip_hash === values[1]).length,
              in_all: sends.length,
            } as T;
          }
          throw new Error(`unexpected first: ${query}`);
        },
      };
      return statement;
    },
  };
}

function createEnv(overrides: Partial<DeckEnv> = {}) {
  const db = createDb();
  const env = {
    TURNSTILE_SECRET_KEY: "secret",
    TURNSTILE_EXPECTED_HOSTNAME: "construct.example",
    EMBED_SESSION_SECRET: "test-secret-test-secret",
    EMAIL_API_TOKEN: "token",
    CLOUDFLARE_ACCOUNT_ID: "acct123",
    EMBED_EMAIL_FROM: "hello@construct.computer",
    EMBED_EMAIL_REPLY_TO: "hello@construct.computer",
    ASSETS: {
      fetch: vi.fn(async (input: Request | URL | string) =>
        new URL(String(input)).pathname === DECK_PDF_PATH ? new Response(PDF) : new Response(null, { status: 404 }),
      ),
    },
    ...overrides,
    DB: db,
  } satisfies DeckEnv;
  return env;
}

function request(body: unknown, ip = "203.0.113.9") {
  return new Request("https://construct.example/api/deck/send", {
    method: "POST",
    headers: { "content-type": "application/json", "CF-Connecting-IP": ip },
    body: JSON.stringify(body),
  });
}

async function call(env: DeckEnv, body: unknown, ip?: string) {
  const response = await send({ request: request(body, ip), env });
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}

/** The bodies posted to Cloudflare's email API. */
function emailsSent(): Array<Record<string, unknown>> {
  return vi
    .mocked(fetch)
    .mock.calls.filter(([url]) => String(url).includes("/email/sending/send"))
    .map(([, init]) => JSON.parse(String(init?.body)));
}

const ask = { email: "Jane@Fund.vc ", turnstileToken: "verified" };

describe("POST /api/deck/send", () => {
  let emailOk = true;
  let turnstileOk = true;

  beforeEach(() => {
    emailOk = true;
    turnstileOk = true;
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("turnstile")) {
          return Response.json({ success: turnstileOk, action: "beta_signup", hostname: "construct.example" });
        }
        if (url.includes("/email/sending/send")) {
          return Response.json({ success: emailOk, errors: emailOk ? [] : [{ code: 1, message: "no" }] });
        }
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("emails the deck PDF from hello@ and keeps only hashes", async () => {
    const env = createEnv();
    const { status, body } = await call(env, ask);
    expect(status).toBe(200);
    const r = await recipientForEmail(env.EMBED_SESSION_SECRET, "jane@fund.vc");
    expect(body).toEqual({ ok: true, r });

    const [email] = emailsSent();
    expect(email).toMatchObject({
      to: "jane@fund.vc",
      from: { address: "hello@construct.computer" },
      reply_to: "hello@construct.computer",
      subject: "The Construct Computer deck",
    });
    expect(email!.attachments).toEqual([
      {
        filename: DECK_PDF_FILENAME,
        type: "application/pdf",
        disposition: "attachment",
        content: btoa(String.fromCharCode(...PDF)),
      },
    ]);
    expect(email!.html).toContain(deckLink(r));
    expect(env.DB.sends).toHaveLength(1);
    expect(JSON.stringify(env.DB.sends)).not.toContain("jane");
    expect(JSON.stringify(env.DB.sends)).not.toContain("203.0.113.9");
  });

  it("links back to the deck with the reader's own r when they came with one", async () => {
    const env = createEnv();
    const { body } = await call(env, { ...ask, r: "acme-ventures" });
    expect(body).toEqual({ ok: true, r: "acme-ventures" });
    expect(emailsSent()[0]!.text).toContain("https://construct.computer/deck/?r=acme-ventures");
    expect((await call(env, { ...ask, r: "jane@fund.vc" })).status).toBe(400);
  });

  it("makes the same r for an address every time, naming nobody", async () => {
    const secret = "test-secret-test-secret";
    const r = await recipientForEmail(secret, "jane@fund.vc");
    expect(r).toMatch(/^e-[A-Za-z0-9_-]{12}$/);
    expect(await recipientForEmail(secret, "jane@fund.vc")).toBe(r);
    expect(await recipientForEmail(secret, "john@fund.vc")).not.toBe(r);
    expect(r).not.toContain("jane");
  });

  it("refuses bad input, unknown fields and test domains before sending", async () => {
    const env = createEnv();
    expect((await call(env, { ...ask, email: "not-an-email" })).status).toBe(400);
    expect((await call(env, { ...ask, name: "Jane" })).status).toBe(400);
    const reserved = await call(env, { ...ask, email: "jane@example.com" });
    expect(reserved).toMatchObject({ status: 400, body: { error: { code: "undeliverable_email" } } });
    expect(emailsSent()).toEqual([]);
  });

  it("sends nothing without a passing Turnstile check", async () => {
    turnstileOk = false;
    const env = createEnv();
    expect(await call(env, ask)).toMatchObject({ status: 403, body: { error: { code: "verification_failed" } } });
    expect(emailsSent()).toEqual([]);
  });

  it("answers a filled honeypot as sent and sends nothing", async () => {
    const env = createEnv();
    expect(await call(env, { ...ask, honeypot: "x" })).toMatchObject({ status: 200, body: { ok: true } });
    expect(emailsSent()).toEqual([]);
  });

  it("limits sends per address", async () => {
    const env = createEnv();
    for (let i = 0; i < DECK_SENDS_PER_EMAIL_PER_DAY; i++) {
      expect((await call(env, ask, `198.51.100.${i}`)).status).toBe(200);
    }
    expect(await call(env, ask, "198.51.100.99")).toMatchObject({
      status: 429,
      body: { error: { code: "too_many_requests" } },
    });
  });

  it("limits sends per connection", async () => {
    const env = createEnv();
    for (let i = 0; i < DECK_SENDS_PER_IP_PER_HOUR; i++) {
      expect((await call(env, { ...ask, email: `partner${i}@fund.vc` })).status).toBe(200);
    }
    expect((await call(env, { ...ask, email: "one-more@fund.vc" })).status).toBe(429);
  });

  it("says so when the email doesn't go out, and doesn't count it", async () => {
    emailOk = false;
    const env = createEnv();
    expect(await call(env, ask)).toMatchObject({ status: 502, body: { error: { code: "email_failed" } } });
    expect(env.DB.sends).toHaveLength(0);
  });

  it("fails closed without the PDF", async () => {
    const env = createEnv({
      ASSETS: { fetch: async () => new Response(null, { status: 404 }) },
    });
    expect((await call(env, ask)).status).toBe(500);
    expect(emailsSent()).toEqual([]);
  });
});

describe("renderDeckEmail", () => {
  it("invites a reply only when replies have somewhere to go", () => {
    expect(renderDeckEmail(true, "acme").text).toContain("Just reply");
    expect(renderDeckEmail(false, "acme").text).toContain("Write to hello@construct.computer");
  });

  it("carries the live deck, the demo, the code and the founders, with no dashes we don't write", () => {
    const { html, text } = renderDeckEmail(true, "acme");
    for (const part of [html, text]) {
      expect(part).toContain("https://construct.computer/deck/?r=acme");
      expect(part).toContain("The latest version is always online");
      expect(part).toContain("https://www.youtube.com/watch?v=0lQWyT4PAA8");
      expect(part).toContain("INVEST_IN_US");
      expect(part).toContain("Ankush and Nischal");
      expect(part).not.toMatch(/[\u2013\u2014]/);
    }
  });
});
