import { describe, expect, it } from "vitest";

import { AuthSessionSchema, SessionListSchema } from "./schemas";

/** Shape matching the live `/auth/sessions` response. */
const LIVE_SESSION = {
  id: "5154f07a-d05d-4b55-a29c-400bd6969928",
  isCurrent: true,
  loginProvider: "email",
  surface: "web",
  createdAt: "2026-08-05T20:45:26.547Z",
  lastSeenAt: "2026-08-05T20:54:21.418Z",
  revokedAt: null,
  deviceLabel: null,
  ip: "2405:201:801a:4855:9db:3c74:fa5d:bece",
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

describe("SessionListSchema", () => {
  it("accepts ISO timestamps from the live API", () => {
    const parsed = SessionListSchema.safeParse({
      currentSessionId: LIVE_SESSION.id,
      sessions: [
        LIVE_SESSION,
        {
          ...LIVE_SESSION,
          id: "acec7700-3c0c-46ee-8f6f-454088d77237",
          isCurrent: false,
          loginProvider: "google",
          revokedAt: "2026-07-25T17:15:57.500Z",
        },
      ],
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.sessions).toHaveLength(2);
    expect(parsed.data.sessions[0]?.createdAt).toBe(LIVE_SESSION.createdAt);
    expect(parsed.data.sessions[1]?.revokedAt).toBe(
      "2026-07-25T17:15:57.500Z",
    );
  });

  it("coerces unix-second stubs into ISO strings", () => {
    const parsed = AuthSessionSchema.safeParse({
      id: "s1",
      loginProvider: "google",
      surface: "web",
      deviceLabel: null,
      userAgent: null,
      ip: null,
      createdAt: 1_760_000_000,
      lastSeenAt: 1_760_000_100,
      revokedAt: null,
      isCurrent: true,
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
