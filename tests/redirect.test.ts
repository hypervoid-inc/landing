import { describe, expect, it } from "vitest";

import { onRequest } from "../functions/redirect";

function redirectFor(raw: string | null) {
  const url = raw === null ? "https://construct.example/redirect" : `https://construct.example/redirect?p=${encodeURIComponent(raw)}`;
  return onRequest({ request: new Request(url), env: {} });
}

describe("redirect", () => {
  it("redirects to a valid http(s) destination", async () => {
    const response = await redirectFor("https://example.com/page?x=1");
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("https://example.com/page?x=1");
  });

  it("redirects to an http destination", async () => {
    const response = await redirectFor("http://example.com/");
    expect(response.status).toBe(302);
  });

  it("redirects to a base64-encoded destination", async () => {
    expect((await redirectFor(btoa("https://example.com/page?x=1"))).status).toBe(302);
    expect((await redirectFor(btoa("https://example.com/page?x=1"))).headers.get("Location")).toBe("https://example.com/page?x=1");
  });

  it("redirects to a base64url-encoded destination", async () => {
    const encoded = btoa("https://example.com/page?x=1").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    expect((await redirectFor(encoded)).status).toBe(302);
  });

  it("rejects missing, invalid, or non-http(s) targets", async () => {
    expect((await redirectFor(null)).status).toBe(400);
    expect((await redirectFor("javascript:alert(1)")).status).toBe(400);
    expect((await redirectFor("not a url")).status).toBe(400);
    expect((await redirectFor("file:///etc/passwd")).status).toBe(400);
    expect((await redirectFor(btoa("javascript:alert(1)"))).status).toBe(400);
  });

  it("rejects methods other than GET/HEAD", async () => {
    const response = await onRequest({
      request: new Request("https://construct.example/redirect?p=https%3A%2F%2Fexample.com", { method: "POST" }),
      env: {},
    });
    expect(response.status).toBe(405);
  });
});