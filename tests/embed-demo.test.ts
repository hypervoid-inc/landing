import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { onRequest as claim } from "../functions/api/embed/claim";
import { onRequest as session } from "../functions/api/embed/session";
import {
  modelText,
  onRequest as turn,
  parseModelJson,
  systemPrompt,
} from "../functions/api/embed/turn";
import {
  keyedHash,
  mintSessionToken,
  verifySessionToken,
} from "../functions/embed-session";
import type { D1Statement, EmbedEnv } from "../functions/types";
import {
  EMBED_MAX_TURNS,
  EMBED_SESSIONS_PER_IP_PER_HOUR,
} from "../shared/embed-schema";

const SECRET = "test-secret-test-secret";
const DASHES = new RegExp("[\\u2013\\u2014]");

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
          if (query.includes("turns = turns + 1")) {
            const row = sessions.find((s) => s.id === values[0]);
            if (!row || row.turns >= Number(values[1])) {
              return { success: true, meta: { changes: 0 } };
            }
            row.turns += 1;
            return { success: true, meta: { changes: 1 } };
          }
          if (query.includes("turns = turns - 1")) {
            const row = sessions.find((s) => s.id === values[0]);
            if (row && row.turns > 0) row.turns -= 1;
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
          if (query.includes("SUM(turns)")) {
            return { turns: sessions.reduce((sum, s) => sum + s.turns, 0) } as T;
          }
          if (query.includes("SELECT turns FROM embed_sessions")) {
            const row = sessions.find((s) => s.id === values[0]);
            return (row ? { turns: row.turns } : null) as T;
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
  ai?: EmbedEnv["AI"],
  overrides: Partial<Omit<EmbedEnv, "DB" | "AI">> = {},
): EmbedEnv & { DB: ReturnType<typeof createDb> } {
  return {
    TURNSTILE_SECRET_KEY: "secret",
    TURNSTILE_EXPECTED_HOSTNAME: "construct.example",
    EMBED_SESSION_SECRET: SECRET,
    ...overrides,
    DB: db,
    AI: ai,
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

function aiAnswering(answer: unknown) {
  const run = vi.fn(async () => answer);
  return { run, binding: { run } };
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
    expect(body).toMatchObject({ ok: true, firstName: "Ada", turnsLeft: EMBED_MAX_TURNS });
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
    const env = createEnv(createDb(), undefined, { EMBED_DAILY_SESSION_CAP: "1" });
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
    const env = createEnv(createDb(), undefined, { EMBED_SESSION_SECRET: "" });
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
    const env = createEnv(createDb(), undefined, { EMBED_PROMO_CODE: "FIRSTMONTH" });
    const token = await sessionFor(env);
    const first = await ask(env, { token, email: "Ada@Example.com", name: "Ada" });
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ ok: true, code: "FIRSTMONTH" });
    expect(env.DB.signups).toEqual(["ada@example.com"]);
    expect(env.DB.sessions[0]?.claimed_at).toBe("now");
    expect(env.DB.sessions[0]?.email_hash).not.toContain("ada");

    const again = await ask(env, { token, email: "other@example.com" });
    expect(again.status).toBe(200);
    expect(await again.json()).toEqual({ ok: true, code: "FIRSTMONTH" });
    expect(env.DB.signups).toEqual(["ada@example.com"]);
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

describe("POST /api/embed/turn", () => {
  const reply = {
    say: "Done, your week is planned.",
    mood: "happy",
    actions: [
      { type: "event", title: "Standup", day: "mon", time: "09:00" },
      { type: "tasks", title: "This week", items: ["Ship", "Write"] },
    ],
  };

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
    return turn({ request: post("/api/embed/turn", body), env });
  }

  it("charges a turn, asks the model and returns its actions", async () => {
    const ai = aiAnswering({ response: JSON.stringify(reply) });
    const env = createEnv(createDb(), ai.binding);
    const token = await sessionFor(env);
    const response = await ask(env, { token, message: "Plan my week", history: [] });
    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toMatchObject({ ok: true, turnsLeft: EMBED_MAX_TURNS - 1 });
    expect(body.reply).toEqual(reply);
    expect(ai.run).toHaveBeenCalledTimes(1);
    const [model, input] = ai.run.mock.calls[0] as unknown as [string, Record<string, unknown>];
    expect(model).toBe("@cf/meta/llama-4-scout-17b-16e-instruct");
    expect(input.max_tokens).toBeLessThanOrEqual(800);
    const messages = input.messages as { role: string; content: string }[];
    expect(messages[0]?.role).toBe("system");
    expect(messages.at(-1)?.role).toBe("user");
    expect(messages.at(-1)?.content).toContain("Plan my week");
    expect(input.response_format).toBeUndefined();
  });

  it("keeps the sane actions of a messy answer and refunds a useless one", async () => {
    const messy = aiAnswering({
      response: "```json\n" + JSON.stringify({ ...reply, mood: "elated", actions: [reply.actions[0], { type: "note" }] }) + "\n```",
    });
    const env = createEnv(createDb(), messy.binding);
    const token = await sessionFor(env);
    const ok = (await (await ask(env, { token, message: "hi", history: [] })).json()) as {
      reply: { mood: string; actions: unknown[] };
    };
    expect(ok.reply.mood).toBe("happy");
    expect(ok.reply.actions).toHaveLength(1);

    const broken = aiAnswering({ response: "I cannot do that" });
    const env2 = createEnv(createDb(), broken.binding);
    const token2 = await sessionFor(env2);
    const response = await ask(env2, { token: token2, message: "hi", history: [] });
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: { code: "model_unavailable" } });
    expect(env2.DB.sessions[0]?.turns).toBe(0);
  });

  it("stops at the session's turns and at the daily cap", async () => {
    const ai = aiAnswering({ response: JSON.stringify(reply) });
    const env = createEnv(createDb(), ai.binding);
    const token = await sessionFor(env);
    env.DB.sessions[0]!.turns = EMBED_MAX_TURNS;
    const exhausted = await ask(env, { token, message: "more", history: [] });
    expect(exhausted.status).toBe(403);
    expect(await exhausted.json()).toMatchObject({ error: { code: "turns_exhausted" } });
    expect(ai.run).not.toHaveBeenCalled();

    const capped = createEnv(createDb(), ai.binding, { EMBED_DAILY_TURN_CAP: "1" });
    const token2 = await sessionFor(capped);
    capped.DB.sessions[0]!.turns = 1;
    const full = await ask(capped, { token: token2, message: "more", history: [] });
    expect(full.status).toBe(503);
    expect(await full.json()).toMatchObject({ error: { code: "demo_full" } });
  });

  it("rejects a forged token, a long message and too much history", async () => {
    const ai = aiAnswering({ response: JSON.stringify(reply) });
    const env = createEnv(createDb(), ai.binding);
    const token = await sessionFor(env);
    const forged = await mintSessionToken("another-secret", crypto.randomUUID());
    expect(
      (await ask(env, { token: forged.token, message: "hi", history: [] })).status,
    ).toBe(401);
    expect(
      (await ask(env, { token, message: "x".repeat(281), history: [] })).status,
    ).toBe(400);
    const history = Array.from({ length: 7 }, () => ({ role: "user", text: "hi" }));
    expect((await ask(env, { token, message: "hi", history })).status).toBe(400);
    expect(ai.run).not.toHaveBeenCalled();
  });

  it("reads the model's text whatever shape it comes in", () => {
    expect(modelText({ response: "{}" })).toBe("{}");
    expect(modelText({ response: { say: "x" } })).toBe('{"say":"x"}');
    expect(modelText({ choices: [{ message: { content: "c" } }] })).toBe("c");
    expect(modelText(42)).toBeNull();
    expect(parseModelJson('Sure! {"say":"hi","mood":"happy","actions":[]} there')).toEqual({
      say: "hi",
      mood: "happy",
      actions: [],
    });
    expect(parseModelJson("no json here")).toBeNull();
  });

  it("names the four tools and the day in the system prompt, without dashes", () => {
    const prompt = systemPrompt(new Date("2026-10-14T10:00:00Z"));
    expect(prompt).toContain("Wednesday, 2026-10-14");
    for (const tool of ["note", "event", "tasks", "email"]) expect(prompt).toContain(tool);
    expect(prompt).not.toMatch(DASHES);
  });
});
