import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { onRequest as ping } from "../functions/api/deck/ping";
import { deckEventMessage, deckPingMessage } from "../functions/deck-ping-message";
import type { D1Statement, DeckEnv } from "../functions/types";
import { describeDevice } from "../functions/user-agent";
import {
  DECK_PING_EVENTS_PER_VISIT,
  DECK_PINGS_PER_IP_PER_HOUR,
  type DeckPingContext,
} from "../shared/deck-schema";

const IPHONE_LINKEDIN =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22B83 [LinkedInApp]/9.30.1";
const MAC_CHROME =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";

describe("describeDevice", () => {
  it("names the device, OS, browser and the app it was opened in", () => {
    expect(describeDevice(IPHONE_LINKEDIN)).toEqual({ device: "iPhone", os: "iOS 18.1", app: "LinkedIn", bot: false });
    expect(describeDevice(MAC_CHROME)).toEqual({ device: "Mac", os: "macOS", browser: "Chrome 141", bot: false });
    expect(
      describeDevice(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
      ),
    ).toMatchObject({ device: "iPhone", browser: "Safari 17" });
    expect(
      describeDevice("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36 Edg/141.0"),
    ).toMatchObject({ device: "Windows PC", browser: "Edge 141" });
  });

  it("knows a bot or a script from a person", () => {
    for (const ua of ["Twitterbot/1.0", "Slackbot-LinkExpanding 1.0", "curl/8.4.0", "Mozilla/5.0 HeadlessChrome/141", "", null]) {
      expect(describeDevice(ua).bot, String(ua)).toBe(true);
    }
  });
});

const context: DeckPingContext = {
  r: "acme-ventures",
  referrer: "linkedin.com",
  utm: { source: "email" },
  visit: 2,
  lastVisitAt: "2026-10-21T10:00:00.000Z",
  openedAt: "2026-10-23T10:00:00.000Z",
  screen: { width: 390, height: 844 },
  language: "en-US",
  session: "01a16916-6a46-7b93-a512-686edb7f7cd6",
  version: "2026-10-23-9accd9d2",
};
const REPLAY = "https://eu.posthog.com/project/144727/replay/01a16916-6a46-7b93-a512-686edb7f7cd6";
const place = { city: "San Francisco", region: "California", country: "US", timezone: "America/Los_Angeles", asOrganization: "Comcast", asn: 7922 };
const titles = ["Cover", "Problem", "Solution"];
const now = new Date("2026-10-23T17:42:00.000Z");

describe("deckPingMessage", () => {
  it("gives a tagged visit a full card", () => {
    const message = deckPingMessage({ context, place, device: describeDevice(IPHONE_LINKEDIN), titles, now });
    expect(message.content).toBe("");
    expect(message.allowed_mentions).toEqual({ parse: [] });
    const [card] = message.embeds;
    expect(card!.title).toBe("👀 acme-ventures opened the deck");
    expect(card!.url).toBe(REPLAY);
    const field = (name: string) => card!.fields.find((f) => f.name.includes(name))?.value;
    expect(field("Location")).toBe("San Francisco, California\n🇺🇸 United States");
    expect(field("Their time")).toBe("Fri 10:42 AM\nAmerica/Los\\_Angeles");
    expect(field("Device")).toBe("iPhone · iOS 18.1\na browser inside LinkedIn");
    expect(field("Network")).toBe("Comcast\nAS7922");
    expect(field("Came from")).toBe("linkedin.com\nutm_source: `email`");
    expect(field("Visits")).toBe("2nd visit\nlast one 2 days ago");
  });

  it("charts the reading and says how it ended", () => {
    const summary = { final: true, seconds: 252, slides: [12, 0, 240], completed: true, videos: { demo: 75 }, pdf: "sent" as const, pdfEmails: ["jane@fund.vc", "partners@fund.vc"], links: ["try" as const] };
    const [card] = deckPingMessage({ context, summary, place, device: describeDevice(MAC_CHROME), titles, now }).embeds;
    expect(card!.title).toBe("✅ acme-ventures read the whole deck");
    expect(card!.description).toBe("**4m 12s** reading · **2 of 3** slides");
    const chart = card!.fields.find((f) => f.name.includes("Time on each slide"))!.value;
    expect(chart).toContain(" 1 Cover           █░░░░░░░░░░░  0:12");
    expect(chart).toContain(" 3 Solution        ████████████  4:00");
    expect(chart).not.toContain("Problem");
    expect(card!.fields.find((f) => f.name.includes("Videos"))!.value).toBe("Demo: watched 75%");
    // Every address the PDF went to, not just the first.
    expect(card!.fields.find((f) => f.name.includes("PDF"))!.value).toBe("Sent to **jane\\@fund.vc**, **partners\\@fund.vc**");
    expect(card!.fields[0]).toEqual({
      name: "✉️ Email",
      value: "**jane\\@fund.vc** · PDF sent\n**partners\\@fund.vc** · PDF sent",
    });
  });

  it("shows an email the browser was already known by, from the start, full width", () => {
    const [card] = deckPingMessage({ context: { ...context, email: "jane@fund.vc" }, place, device: describeDevice(MAC_CHROME), titles, now }).embeds;
    expect(card!.fields[0]).toEqual({ name: "✉️ Email", value: "**jane\\@fund.vc**" });
  });

  it("gives an untagged visit a few plain lines", () => {
    const untagged = { ...context, r: undefined };
    const opened = deckPingMessage({ context: untagged, place, device: describeDevice(MAC_CHROME), titles, now });
    expect(opened.embeds).toEqual([]);
    expect(opened.content).toBe(
      [
        "👀 **Deck opened** · untagged link",
        "📍 San Francisco, California, 🇺🇸 United States",
        "💻 Mac · macOS · Chrome",
        "🔗 linkedin.com · 2nd visit",
        `🎥 [Watch the session replay](<${REPLAY}>)`,
      ].join("\n"),
    );
    const read = deckPingMessage({
      context: untagged,
      summary: { final: true, seconds: 26, slides: [10, 10, 6], completed: true, pdf: "sent", pdfEmails: ["jane@gmail.com"] },
      place,
      device: describeDevice(MAC_CHROME),
      titles,
      now,
    });
    expect(read.content).toContain("✅ **Deck read in full** · untagged link");
    expect(read.content).toContain("✉️ PDF sent to **jane\\@gmail.com**");
    expect(read.content).toContain("⏱️ 26s reading · 3 of 3 slides");
  });
});

describe("deckEventMessage", () => {
  it("says what happened, who it was and how far they'd got, in a few lines", () => {
    const message = deckEventMessage({
      event: "left",
      context,
      summary: { final: true, seconds: 84, slides: [30, 50, 4], completed: false },
      place,
      device: describeDevice(IPHONE_LINKEDIN),
      titles,
    });
    expect(message.embeds).toEqual([]);
    expect(message.content).toBe(
      [
        "👋 **acme-ventures** closed the deck after 3 of 3 slides",
        "⏱️ 1m 24s reading · 3 of 3 slides · furthest: Solution",
        "📍 San Francisco, California, 🇺🇸 United States · 💻 iPhone, a browser inside LinkedIn",
        `🎥 [Watch the session replay](<${REPLAY}>)`,
      ].join("\n"),
    );
  });

  it("names an untagged visit plainly", () => {
    const message = deckEventMessage({ event: "video", detail: "launch", context: { ...context, r: undefined }, place, device: describeDevice(MAC_CHROME), titles });
    expect(message.content.split("\n")[0]).toBe("🎬 Someone on an untagged link played the launch video");
  });
});

/** Just enough of D1 for the pings. */
function createDb() {
  const rows: Array<{ visit_id: string; message_id: string; ip_hash: string | null; events: number }> = [];
  return {
    rows,
    prepare(query: string) {
      let values: unknown[] = [];
      const statement: D1Statement = {
        bind(...bound: unknown[]) {
          values = bound;
          return statement;
        },
        async run() {
          if (query.includes("INSERT INTO deck_pings")) {
            const existing = rows.find((row) => row.visit_id === values[0]);
            if (existing) existing.message_id = String(values[1]);
            else rows.push({ visit_id: String(values[0]), message_id: String(values[1]), ip_hash: values[2] === null ? null : String(values[2]), events: 0 });
            return { success: true };
          }
          if (query.includes("SET events = events + 1")) {
            const row = rows.find((r) => r.visit_id === values[0] && r.events < Number(values[1]));
            if (row) row.events += 1;
            return { success: true, meta: { changes: row ? 1 : 0 } };
          }
          if (query.includes("DELETE FROM deck_pings")) return { success: true };
          throw new Error(`unexpected run: ${query}`);
        },
        async first<T>() {
          if (query.includes("SELECT message_id")) {
            const row = rows.find((r) => r.visit_id === values[0]);
            return (row ? { message_id: row.message_id } : null) as T;
          }
          if (query.includes("AS by_ip")) {
            return { by_ip: rows.filter((r) => r.ip_hash === values[0]).length, in_all: rows.length } as T;
          }
          throw new Error(`unexpected first: ${query}`);
        },
      };
      return statement;
    },
  };
}

const WEBHOOK = "https://discord.com/api/webhooks/123/test-token";

function createEnv(overrides: Partial<DeckEnv> = {}) {
  return {
    TURNSTILE_SECRET_KEY: "secret",
    TURNSTILE_EXPECTED_HOSTNAME: "construct.computer",
    EMBED_SESSION_SECRET: "test-secret-test-secret",
    DECK_DISCORD_WEBHOOK_URL: WEBHOOK,
    ASSETS: { fetch: async () => new Response(null, { status: 404 }) },
    ...overrides,
    DB: createDb(),
  } satisfies DeckEnv;
}

const visitId = "0b7f3c1e-2d4a-4b5c-9e8f-1a2b3c4d5e6f";

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://construct.computer/api/deck/ping", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://construct.computer",
      "user-agent": MAC_CHROME,
      "CF-Connecting-IP": "203.0.113.9",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/deck/ping", () => {
  let messageId = 1000;
  const discordCalls = () =>
    vi
      .mocked(fetch)
      .mock.calls.filter(([url]) => String(url).startsWith(WEBHOOK))
      .map(([url, init]) => ({ url: String(url), method: init?.method, body: JSON.parse(String(init?.body)) }));

  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).startsWith(WEBHOOK)) return Response.json({ id: String(++messageId) });
        throw new Error(`unexpected fetch: ${String(input)}`);
      }),
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("posts a new visit, then edits that message as they read", async () => {
    const env = createEnv();
    expect((await ping({ request: request({ visitId, context }), env })).status).toBe(200);
    const postedId = messageId;
    const summary = { final: false, seconds: 30, slides: [30], completed: false };
    expect((await ping({ request: request({ visitId, context, summary }), env })).status).toBe(200);

    const [posted, edited] = discordCalls();
    expect(posted).toMatchObject({ url: `${WEBHOOK}?wait=true`, method: "POST" });
    expect(posted!.body.embeds[0].title).toBe("👀 acme-ventures opened the deck");
    expect(edited).toMatchObject({ url: `${WEBHOOK}/messages/${postedId}`, method: "PATCH" });
    expect(edited!.body.embeds[0].title).toBe("📖 acme-ventures is reading the deck");
    expect(env.DB.rows).toHaveLength(1);
    expect(JSON.stringify(env.DB.rows)).not.toContain("203.0.113.9");
  });

  it("posts a moment as a message of its own, since edits notify nobody", async () => {
    const env = createEnv();
    await ping({ request: request({ visitId, context }), env });
    const summary = { final: false, seconds: 40, slides: [40], completed: false, pdf: "sent" as const, pdfEmails: ["jane@fund.vc"] };
    expect((await ping({ request: request({ visitId, context, summary, event: "pdf_sent" }), env })).status).toBe(200);

    const calls = discordCalls();
    expect(calls.map((call) => call.method)).toEqual(["POST", "PATCH", "POST"]);
    expect(calls[2]!.url).toBe(WEBHOOK);
    expect(calls[2]!.body.content).toContain("📄 **acme-ventures** asked for the PDF");
    expect(calls[2]!.body.content).toContain("✉️ Sent to **jane\\@fund.vc**");
  });

  it("caps the moments one visit can post", async () => {
    const env = createEnv();
    await ping({ request: request({ visitId, context }), env });
    for (let i = 0; i < DECK_PING_EVENTS_PER_VISIT + 3; i++) {
      await ping({ request: request({ visitId, context, event: "link", detail: "try" }), env });
    }
    const posts = discordCalls().filter((call) => call.method === "POST");
    expect(posts).toHaveLength(1 + DECK_PING_EVENTS_PER_VISIT);
  });

  it("only takes pings from the deck page, and ignores bots", async () => {
    const env = createEnv();
    expect((await ping({ request: request({ visitId, context }, { origin: "https://evil.example" }), env })).status).toBe(403);
    expect((await ping({ request: request({ visitId, context }, { origin: "" }), env })).status).toBe(403);
    expect((await ping({ request: request({ visitId, context }, { "user-agent": "Slackbot 1.0" }), env })).status).toBe(200);
    expect(discordCalls()).toEqual([]);
  });

  it("refuses a ping that isn't the shape the page sends", async () => {
    const env = createEnv();
    expect((await ping({ request: request({ visitId, context: { ...context, r: "jane@fund.vc" } }), env })).status).toBe(400);
    expect((await ping({ request: request({ visitId, context: { ...context, session: "https://evil.example/x" } }), env })).status).toBe(400);
    expect((await ping({ request: request({ visitId: "not-a-uuid", context }), env })).status).toBe(400);
    expect(discordCalls()).toEqual([]);
  });

  it("does nothing without a webhook", async () => {
    const env = createEnv({ DECK_DISCORD_WEBHOOK_URL: "" });
    expect((await ping({ request: request({ visitId, context }), env })).status).toBe(200);
    expect(discordCalls()).toEqual([]);
  });

  it("caps new alerts per connection", async () => {
    const env = createEnv();
    for (let i = 0; i < DECK_PINGS_PER_IP_PER_HOUR; i++) {
      const id = `0b7f3c1e-2d4a-4b5c-9e8f-${String(i).padStart(12, "0")}`;
      expect((await ping({ request: request({ visitId: id, context }), env })).status).toBe(200);
    }
    expect((await ping({ request: request({ visitId, context }), env })).status).toBe(429);
  });
});
