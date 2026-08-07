import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { onRequest } from "../functions/redirect";

// The shape of every payload we actually send: a listmonk click-tracking URL,
// /link/<link uuid>/<campaign uuid>/<subscriber uuid>.
const TRACKED =
  "https://listmonk.construct.computer/link/3f2b91d4-6c58-4a72-b0e3-7d1a9f4c2e85/8a1c33f0-2e77-4b19-a5d2-1f9e4c7b6a08/9d4e7c21-8b3a-4f60-9e11-6c2a5d8f0b73";

const SUBSCRIBER = "9d4e7c21-8b3a-4f60-9e11-6c2a5d8f0b73";
const CAMPAIGN = "8a1c33f0-2e77-4b19-a5d2-1f9e4c7b6a08";
const LANDING = "https://construct.computer/launch/?ref=mailinglist&utm_campaign=prelaunch-2026-08";

function base64url(value: string) {
  return btoa(value)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Stand in for listmonk: books the click, answers with a redirect to the real destination. */
function listmonkReturning(location: string | null, status = 302) {
  return vi.fn(async () =>
    location === null
      ? new Response(null, { status })
      : new Response(null, { status, headers: { Location: location } }),
  );
}

function redirectFor(raw: string | null, extra: Record<string, string> = {}, method = "GET") {
  const url = new URL("https://construct.example/redirect");
  if (raw !== null) url.searchParams.set("p", raw);
  for (const [key, value] of Object.entries(extra)) url.searchParams.set(key, value);
  return onRequest({ request: new Request(url.toString(), { method }), env: {} });
}

describe("redirect", () => {
  let listmonk: ReturnType<typeof listmonkReturning>;

  beforeEach(() => {
    listmonk = listmonkReturning(LANDING);
    vi.stubGlobal("fetch", listmonk);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("books the click with listmonk and forwards to the destination it names", async () => {
    const response = await redirectFor(TRACKED);
    expect(listmonk).toHaveBeenCalledOnce();
    expect(listmonk).toHaveBeenCalledWith(TRACKED, expect.objectContaining({ redirect: "manual" }));
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(LANDING);
  });

  it("carries subscriber and campaign ids onto our own pages", async () => {
    const response = await redirectFor(base64url(TRACKED), { s: SUBSCRIBER, c: CAMPAIGN });
    const location = new URL(response.headers.get("Location")!);
    expect(location.searchParams.get("sid")).toBe(SUBSCRIBER);
    expect(location.searchParams.get("cid")).toBe(CAMPAIGN);
    // The UTMs listmonk stored must survive alongside them.
    expect(location.searchParams.get("utm_campaign")).toBe("prelaunch-2026-08");
  });

  it("does not leak the subscriber id to third-party destinations", async () => {
    vi.stubGlobal("fetch", listmonkReturning("https://discord.gg/puArEQHYN9?utm_content=discord-body"));
    const response = await redirectFor(TRACKED, { s: SUBSCRIBER, c: CAMPAIGN });
    const location = new URL(response.headers.get("Location")!);
    expect(location.searchParams.has("sid")).toBe(false);
    expect(location.searchParams.has("cid")).toBe(false);
    expect(location.searchParams.get("utm_content")).toBe("discord-body");
  });

  it("falls back to listmonk when it is unreachable, so the click still lands", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );
    const response = await redirectFor(TRACKED, { s: SUBSCRIBER });
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(TRACKED);
  });

  it("falls back when listmonk answers without a redirect", async () => {
    vi.stubGlobal("fetch", listmonkReturning(null, 200));
    expect((await redirectFor(TRACKED)).headers.get("Location")).toBe(TRACKED);

    vi.stubGlobal("fetch", listmonkReturning(null, 302));
    expect((await redirectFor(TRACKED)).headers.get("Location")).toBe(TRACKED);
  });

  it("ignores a non-http(s) destination from listmonk", async () => {
    vi.stubGlobal("fetch", listmonkReturning("javascript:alert(1)"));
    expect((await redirectFor(TRACKED)).headers.get("Location")).toBe(TRACKED);
  });

  it("does not book a click for HEAD, which is what mail scanners send", async () => {
    const response = await redirectFor(TRACKED, {}, "HEAD");
    expect(listmonk).not.toHaveBeenCalled();
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(TRACKED);
  });

  it("redirects to a base64-encoded destination", async () => {
    expect((await redirectFor(btoa(TRACKED))).status).toBe(302);
    expect((await redirectFor(base64url(TRACKED))).status).toBe(302);
  });

  it("rejects missing, invalid, or non-http(s) targets", async () => {
    expect((await redirectFor(null)).status).toBe(400);
    expect((await redirectFor("javascript:alert(1)")).status).toBe(400);
    expect((await redirectFor("not a url")).status).toBe(400);
    expect((await redirectFor("file:///etc/passwd")).status).toBe(400);
    expect((await redirectFor(btoa("javascript:alert(1)"))).status).toBe(400);
  });

  // Without a host allowlist this endpoint is an open redirect on our own domain.
  it("rejects hosts outside the allowlist", async () => {
    expect((await redirectFor("https://example.com/page?x=1")).status).toBe(400);
    expect((await redirectFor(btoa("https://example.com/page?x=1"))).status).toBe(400);
    expect((await redirectFor(base64url("https://example.com/page?x=1"))).status).toBe(400);
    // A lookalike host must not pass: matching is exact, not a suffix test.
    expect((await redirectFor("https://listmonk.construct.computer.evil.test/link/a/b/c")).status).toBe(400);
    expect((await redirectFor("https://evil.test/?x=listmonk.construct.computer")).status).toBe(400);
  });

  it("rejects methods other than GET/HEAD", async () => {
    const response = await redirectFor(TRACKED, {}, "POST");
    expect(response.status).toBe(405);
  });
});
