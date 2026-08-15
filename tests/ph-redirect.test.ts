import { describe, expect, it } from "vitest";

import { destinationFor, onRequest } from "../functions/ph";
import {
  PH_FORUM_PATH,
  PH_GO_LIVE_MS,
  PH_PRODUCT_PATH,
} from "../app/features/product-hunt/config";

const BEFORE = PH_GO_LIVE_MS - 60_000;
const AFTER = PH_GO_LIVE_MS + 60_000;

function destination(nowMs: number, query = "") {
  return new URL(destinationFor(nowMs, new URLSearchParams(query)));
}

function request(url = "https://construct.computer/ph", method = "GET") {
  return onRequest({ request: new Request(url, { method }), env: {} });
}

describe("/ph shortlink", () => {
  it("sends people to the page that actually has a Follow button before launch", () => {
    expect(destination(BEFORE).pathname).toBe(PH_FORUM_PATH);
  });

  it("switches to the product page the moment the launch is live", () => {
    expect(destination(AFTER).pathname).toBe(PH_PRODUCT_PATH);
  });

  it("switches exactly at go-live, not a minute either side", () => {
    expect(destination(PH_GO_LIVE_MS - 1).pathname).toBe(PH_FORUM_PATH);
    expect(destination(PH_GO_LIVE_MS).pathname).toBe(PH_PRODUCT_PATH);
  });

  it("only ever points at Product Hunt", () => {
    for (const now of [BEFORE, AFTER]) {
      expect(destination(now).origin).toBe("https://www.producthunt.com");
    }
  });

  it("carries campaign attribution on both sides of go-live", () => {
    for (const now of [BEFORE, AFTER]) {
      expect(destination(now).searchParams.get("utm_source")).toBe("shortlink");
      expect(destination(now).searchParams.get("utm_campaign")).toBe(
        "badge-construct-computer",
      );
    }
  });

  it("lets a caller tag its own placement", () => {
    const url = destination(BEFORE, "utm_content=stream");
    expect(url.searchParams.get("utm_content")).toBe("stream");
    expect(url.pathname).toBe(PH_FORUM_PATH);
  });

  it("ignores non-utm params, so nothing can steer the destination", () => {
    const url = destination(BEFORE, "next=https://evil.example&p=https://evil.example");
    expect(url.origin).toBe("https://www.producthunt.com");
    expect(url.searchParams.get("next")).toBeNull();
    expect(url.searchParams.get("p")).toBeNull();
  });

  it("honours ?ph= so the destination is testable without moving the clock", () => {
    expect(destination(BEFORE, "ph=live").pathname).toBe(PH_PRODUCT_PATH);
    expect(destination(AFTER, "ph=pre").pathname).toBe(PH_FORUM_PATH);
    // A bad value falls back to the clock rather than erroring.
    expect(destination(BEFORE, "ph=nonsense").pathname).toBe(PH_FORUM_PATH);
    expect(destination(BEFORE, "ph=live").searchParams.get("ph")).toBeNull();
  });

  it("answers 302 and refuses to be cached", async () => {
    const response = await request();
    expect(response.status).toBe(302);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Location")).toContain("producthunt.com");
  });

  it("serves HEAD, rejects anything that could have side effects", async () => {
    expect((await request("https://construct.computer/ph", "HEAD")).status).toBe(302);
    expect((await request("https://construct.computer/ph", "POST")).status).toBe(405);
  });
});
