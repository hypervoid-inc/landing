import { describe, expect, it, vi } from "vitest";

import { isTwitterbot, playerCardPage, withPlayerCard } from "../functions/player-card";

const PAGE = [
  "<html><head>",
  '<meta property="og:image" content="https://construct.computer/og/home.jpg?v=4"/>',
  '<meta name="twitter:card" content="summary_large_image"/>',
  '<meta name="twitter:site" content="@use_construct"/>',
  '<meta name="twitter:image" content="https://construct.computer/og/home.jpg?v=4"/>',
  "</head><body></body></html>",
].join("");

const TWITTERBOT = "Twitterbot/1.0";
const DISCORDBOT = "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)";

function servePage(body = PAGE, init: ResponseInit = {}) {
  return vi.fn(
    async () =>
      new Response(body, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8", ETag: '"abc"' },
        ...init,
      }),
  );
}

function get(userAgent: string, method = "GET") {
  return new Request("https://construct.computer/", {
    method,
    headers: { "User-Agent": userAgent, "If-None-Match": '"abc"' },
  });
}

describe("player card", () => {
  it("knows Twitterbot from the other crawlers", () => {
    expect(isTwitterbot(TWITTERBOT)).toBe(true);
    expect(isTwitterbot(DISCORDBOT)).toBe(false);
    expect(isTwitterbot("Slackbot-LinkExpanding 1.0")).toBe(false);
    expect(isTwitterbot(null)).toBe(false);
  });

  it("swaps the large card for the player card and its 4:3 image", () => {
    const html = withPlayerCard(PAGE, "home");
    expect(html).toContain('<meta name="twitter:card" content="player"/>');
    expect(html).toContain(
      '<meta name="twitter:player" content="https://construct.computer/embed/?src=home"/>',
    );
    expect(html).toContain('<meta name="twitter:player:width" content="800"/>');
    expect(html).toContain('<meta name="twitter:image" content="https://construct.computer/og/play.jpg?v=2"/>');
    expect(html).not.toContain("summary_large_image");
    expect(html.match(/twitter:image/g)).toHaveLength(1);
    // og:image stays the large card.
    expect(html).toContain('<meta property="og:image" content="https://construct.computer/og/home.jpg?v=4"/>');
  });

  it("leaves a page without a twitter:card alone", () => {
    expect(withPlayerCard("<html></html>", "home")).toBe("<html></html>");
  });

  it("serves the static page untouched to everyone but Twitterbot", async () => {
    const next = servePage();
    const response = await playerCardPage("home")({ request: get(DISCORDBOT), next });
    expect(next).toHaveBeenCalledWith();
    expect(await response.text()).toBe(PAGE);
  });

  it("gives Twitterbot the player card, fresh and uncached", async () => {
    const next = servePage();
    const response = await playerCardPage("embed")({ request: get(TWITTERBOT), next });
    const forwarded = (next.mock.calls[0] as unknown as [Request])[0];
    expect(forwarded.headers.get("If-None-Match")).toBeNull();
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("ETag")).toBeNull();
    const html = await response.text();
    expect(html).toContain("https://construct.computer/embed/?src=embed");
  });

  it("passes through what is not an HTML page", async () => {
    const next = servePage("gone", { status: 404 });
    const response = await playerCardPage("home")({ request: get(TWITTERBOT), next });
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("gone");

    const head = servePage();
    await playerCardPage("home")({ request: get(TWITTERBOT, "HEAD"), next: head });
    expect(head).toHaveBeenCalledWith();
  });
});
