import { describe, expect, it } from "vitest";

import { onRequest } from "../functions/redirect";

// The shape of every payload we actually send: a listmonk click-tracking URL,
// /link/<link uuid>/<campaign uuid>/<subscriber uuid>.
const TRACKED =
  "https://listmonk.construct.computer/link/3f2b91d4-6c58-4a72-b0e3-7d1a9f4c2e85/8a1c33f0-2e77-4b19-a5d2-1f9e4c7b6a08/9d4e7c21-8b3a-4f60-9e11-6c2a5d8f0b73";

function base64url(value: string) {
  return btoa(value)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function redirectFor(raw: string | null) {
  const url = raw === null ? "https://construct.example/redirect" : `https://construct.example/redirect?p=${encodeURIComponent(raw)}`;
  return onRequest({ request: new Request(url), env: {} });
}

describe("redirect", () => {
  it("redirects to a tracked listmonk destination", async () => {
    const response = await redirectFor(TRACKED);
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(TRACKED);
  });

  it("redirects to an http destination", async () => {
    const response = await redirectFor("http://listmonk.construct.computer/link/a/b/c");
    expect(response.status).toBe(302);
  });

  it("redirects to a base64-encoded destination", async () => {
    expect((await redirectFor(btoa(TRACKED))).status).toBe(302);
    expect((await redirectFor(btoa(TRACKED))).headers.get("Location")).toBe(TRACKED);
  });

  it("redirects to a base64url-encoded destination", async () => {
    const response = await redirectFor(base64url(TRACKED));
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(TRACKED);
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
    const response = await onRequest({
      request: new Request(`https://construct.example/redirect?p=${encodeURIComponent(TRACKED)}`, { method: "POST" }),
      env: {},
    });
    expect(response.status).toBe(405);
  });
});
