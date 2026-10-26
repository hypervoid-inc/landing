import { describe, expect, it, vi } from "vitest";

import {
  estimateTokens,
  onRequest,
  prefersMarkdown,
} from "../functions/_middleware";
import { pageToMarkdown } from "../scripts/markdown-twins.mjs";
import { pagePath, twinPath } from "../shared/markdown-twin";

const URL_ = "https://construct.computer/pricing/";

function page(main: string) {
  return [
    "<html><head><title>Pricing | Construct</title>",
    '<meta name="description" content="Plans from $9."/></head>',
    "<body><header><a href='/'>Home</a></header>",
    `<main>${main}</main>`,
    "<footer>Footer</footer></body></html>",
  ].join("");
}

describe("twin paths", () => {
  it("puts .md on the page's path", () => {
    expect(twinPath("/")).toBe("/index.md");
    expect(twinPath("/pricing/")).toBe("/pricing.md");
    expect(twinPath("/blog/tag/pricing")).toBe("/blog/tag/pricing.md");
    expect(pagePath("/index.md")).toBe("/");
    expect(pagePath("/blog/tag/pricing.md")).toBe("/blog/tag/pricing/");
  });
});

describe("pageToMarkdown", () => {
  it("keeps the page's main content under its title, description and URL", () => {
    const markdown = pageToMarkdown(
      page("<h1>Pricing</h1><p>Plans.</p>"),
      URL_,
    );
    expect(markdown).toBe(
      [
        "---",
        'title: "Pricing | Construct"',
        'description: "Plans from $9."',
        `url: ${URL_}`,
        "---",
        "",
        "# Pricing",
        "",
        "Plans.",
        "",
      ].join("\n"),
    );
  });

  it("drops what a reader of the desktop page never meets", () => {
    const markdown = pageToMarkdown(
      page(
        [
          "<p>Kept</p>",
          '<div aria-hidden="true">Decoration</div>',
          "<div hidden>Closed menu</div>",
          '<p class="md:hidden">Mobile copy</p>',
          '<p class="hidden">Never shown</p>',
          '<p class="hidden lg:block">Desktop copy</p>',
          '<div role="tablist"><button>Tab</button></div>',
          '<nav aria-label="On this page"><a href="#a">A</a></nav>',
          '<img src="/a.png" alt=""/>',
          "<script>alert(1)</script>",
        ].join(""),
      ),
      URL_,
    );
    expect(markdown).toContain("Kept");
    expect(markdown).toContain("Desktop copy");
    for (const gone of [
      "Decoration",
      "Closed menu",
      "Mobile copy",
      "Never shown",
      "Tab",
      "On this page",
      "a.png",
      "alert",
      "Home",
      "Footer",
    ]) {
      expect(markdown).not.toContain(gone);
    }
  });

  it("keeps a collapsed FAQ answer", () => {
    const markdown = pageToMarkdown(
      page(
        '<h3>Do you train on my data?</h3><div data-state="closed" hidden role="region"><p>No.</p></div>',
      ),
      URL_,
    );
    expect(markdown).toContain("### Do you train on my data?\n\nNo.");
  });

  it("names icon links by their label and makes every URL absolute", () => {
    const markdown = pageToMarkdown(
      page(
        '<a href="/blog/" aria-label="All posts"><svg></svg></a> <a href="#faq">FAQ</a> <img src="/og/a.png" alt="Chart"/>',
      ),
      URL_,
    );
    expect(markdown).toContain("[All posts](https://construct.computer/blog/)");
    expect(markdown).toContain(`[FAQ](${URL_}#faq)`);
    expect(markdown).toContain("![Chart](https://construct.computer/og/a.png)");
  });

  it("keeps flex children from running into each other", () => {
    const markdown = pageToMarkdown(
      page(
        "<p><span>Monthly</span><span>Annual</span></p><p><span>$</span><span>9</span></p>",
      ),
      URL_,
    );
    expect(markdown).toContain("Monthly Annual");
    expect(markdown).toContain("$9");
  });
});

describe("markdown negotiation", () => {
  const request = (headers: Record<string, string>) =>
    new Request("https://construct.computer/", { headers });

  it("follows the Accept header first", () => {
    expect(prefersMarkdown(request({ Accept: "text/markdown" }))).toBe(true);
    expect(
      prefersMarkdown(request({ Accept: "text/markdown, text/html;q=0.9" })),
    ).toBe(true);
    expect(
      prefersMarkdown(
        request({ Accept: "text/html,application/xhtml+xml,*/*;q=0.8" }),
      ),
    ).toBe(false);
    expect(prefersMarkdown(request({ Accept: "text/markdown;q=0" }))).toBe(
      false,
    );
  });

  it("gives an answer engine's agent Markdown when it takes either", () => {
    const agent =
      "Mozilla/5.0 (compatible; GPTBot/1.2; +https://openai.com/gptbot)";
    expect(prefersMarkdown(request({ "User-Agent": agent }))).toBe(true);
    expect(
      prefersMarkdown(request({ Accept: "*/*", "User-Agent": agent })),
    ).toBe(true);
    expect(
      prefersMarkdown(request({ Accept: "text/html", "User-Agent": agent })),
    ).toBe(false);
    // Search crawlers index the page itself.
    expect(
      prefersMarkdown(
        request({ Accept: "*/*", "User-Agent": "OAI-SearchBot/1.0" }),
      ),
    ).toBe(false);
    expect(prefersMarkdown(request({ Accept: "*/*" }))).toBe(false);
  });

  it("estimates at least one token", () => {
    expect(estimateTokens("")).toBe(1);
    expect(estimateTokens("a".repeat(400))).toBe(100);
  });
});

describe("markdown middleware", () => {
  const twin = "---\nurl: https://construct.computer/\n---\n\n# Construct\n";
  const asset = () =>
    new Response(twin, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Length": String(twin.length),
        "X-Robots-Tag": "noindex",
      },
    });
  const html = () =>
    new Response("<html></html>", { headers: { "Content-Type": "text/html" } });

  function call(path: string, init: RequestInit = {}) {
    const next = vi.fn(async (input?: Request) =>
      input?.url.endsWith(".md") || path.endsWith(".md") ? asset() : html(),
    );
    const assets = vi.fn(async (url: URL) =>
      url.pathname === "/index.md"
        ? asset()
        : new Response(null, { status: 404 }),
    );
    const response = onRequest({
      request: new Request(`https://construct.computer${path}`, init),
      next,
      env: { ASSETS: { fetch: assets } },
    });
    return { response, next, assets };
  }

  it("counts a twin's tokens and names its page as canonical", async () => {
    const response = await call("/index.md").response;
    expect(response.headers.get("X-Markdown-Tokens")).toBe(
      String(estimateTokens(twin)),
    );
    expect(response.headers.get("Link")).toBe(
      '<https://construct.computer/>; rel="canonical"',
    );
    expect(response.headers.get("Content-Length")).toBeNull();
    expect(await response.text()).toBe(twin);
  });

  it("counts from a GET when asked for HEAD", async () => {
    const { response, next } = call("/index.md", { method: "HEAD" });
    const head = await response;
    expect(next.mock.calls[0]?.[0]?.method).toBe("GET");
    expect(head.headers.get("X-Markdown-Tokens")).toBe(
      String(estimateTokens(twin)),
    );
    expect(await head.text()).toBe("");
  });

  it("passes a redirect through untouched", async () => {
    const redirect = new Response(null, {
      status: 301,
      headers: { Location: "/brand.md" },
    });
    const response = await onRequest({
      request: new Request("https://construct.computer/brand/brand.md"),
      next: async () => redirect,
      env: { ASSETS: { fetch: vi.fn() } },
    });
    expect(response).toBe(redirect);
  });

  it("answers the page in Markdown, indexable, to a client that asks", async () => {
    const response = await call("/", { headers: { Accept: "text/markdown" } })
      .response;
    expect(response.headers.get("Content-Type")).toMatch(/^text\/markdown/);
    expect(response.headers.get("X-Robots-Tag")).toBeNull();
    expect(response.headers.get("Vary")).toBe("Accept, User-Agent");
  });

  it("leaves browsers and pages without a twin to the next handler", async () => {
    const browser = call("/", { headers: { Accept: "text/html" } });
    expect((await browser.response).headers.get("Content-Type")).toBe(
      "text/html",
    );
    expect(browser.assets).not.toHaveBeenCalled();

    const shell = call("/embed", { headers: { Accept: "text/markdown" } });
    expect((await shell.response).headers.get("Content-Type")).toBe(
      "text/html",
    );
  });
});
