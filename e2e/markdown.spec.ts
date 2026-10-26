import { expect, test } from "@playwright/test";

import { landingFaq } from "../app/content/landing";
import { canonicalRoutes } from "../app/lib/route-manifest";
import { twinPath } from "../shared/markdown-twin";

// The AEO spec's checks (dualmark.dev/docs/spec), run against the real Pages
// runtime so `_headers`, `_routes.json` and the middleware are all in play.
test("serves a Markdown twin of every canonical page", async ({ request }) => {
  for (const route of canonicalRoutes) {
    const page = route.path === "/" ? "/" : `${route.path}/`;
    const twin = twinPath(page);

    const html = await request.get(page);
    expect(html.headers().link, page).toContain(
      `<${twin}>; rel="alternate"; type="text/markdown"`,
    );
    expect(html.headers().vary, page).toContain("Accept");

    const markdown = await request.get(twin);
    expect(markdown.status(), twin).toBe(200);
    const headers = markdown.headers();
    expect(headers["content-type"], twin).toMatch(/^text\/markdown/);
    expect(headers["x-markdown-tokens"], twin).toMatch(/^[1-9]\d*$/);
    expect(headers["x-robots-tag"], twin).toContain("noindex");
    expect(headers.vary, twin).toContain("Accept");
    expect(headers["x-aeo-version"], twin).toBe("1.0");
    expect(headers.link, twin).toContain(
      `<${route.canonical}>; rel="canonical"`,
    );
    expect(await markdown.text(), twin).toContain(route.canonical);
  }
});

test("answers the homepage in Markdown to agents that ask", async ({
  request,
}) => {
  const asked = await request.get("/", {
    headers: { Accept: "text/markdown" },
  });
  expect(asked.headers()["content-type"]).toMatch(/^text\/markdown/);
  // Served at the page's own URL, which has to stay indexable.
  expect(asked.headers()["x-robots-tag"]).toBeUndefined();
  expect(await asked.text()).toContain(landingFaq[0].answer);

  const agent = await request.get("/", {
    headers: { Accept: "*/*", "User-Agent": "Mozilla/5.0 GPTBot/1.0" },
  });
  expect(agent.headers()["content-type"]).toMatch(/^text\/markdown/);

  const browser = await request.get("/", {
    headers: {
      Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
      "User-Agent": "Mozilla/5.0 GPTBot/1.0",
    },
  });
  expect(browser.headers()["content-type"]).toMatch(/^text\/html/);
});

test("moves the brand page's Markdown to its twin path", async ({
  request,
}) => {
  const response = await request.get("/brand/brand.md", { maxRedirects: 0 });
  expect(response.status()).toBe(301);
  expect(response.headers().location).toMatch(/\/brand\.md$/);
});
