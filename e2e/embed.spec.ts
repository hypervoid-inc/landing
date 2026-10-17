import { expect, test } from "@playwright/test";

/**
 * The show inside an X post: the homepage's player card, the framing
 * headers and the page itself. The show's beats are in shows.spec.ts.
 */

test("the homepage is a large image card for every crawler but X", async ({ request }) => {
  const html = await (await request.get("/", { headers: { "User-Agent": "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)" } })).text();
  expect(html).toContain('<meta name="twitter:card" content="summary_large_image"/>');
  expect(html).toContain('<meta name="twitter:image" content="https://construct.computer/og/home.jpg?v=4"/>');
  expect(html).not.toContain("twitter:player");
});

test("for Twitterbot the homepage is a player card pointing at the live demo", async ({ request }) => {
  const response = await request.get("/", { headers: { "User-Agent": "Twitterbot/1.0" } });
  expect(response.status()).toBe(200);
  expect(response.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  const html = await response.text();
  expect(html).toContain('<meta name="twitter:card" content="player"/>');
  expect(html).toContain('<meta name="twitter:player" content="https://construct.computer/embed/?src=home"/>');
  expect(html).toContain('<meta name="twitter:player:width" content="800"/>');
  expect(html).toContain('<meta name="twitter:image" content="https://construct.computer/og/play.jpg?v=2"/>');
  expect(html).not.toContain("summary_large_image");
});

test("/embed/ may be framed by X and by nobody else", async ({ request }) => {
  const response = await request.get("/embed/");
  expect(response.status()).toBe(200);
  const csp = response.headers()["content-security-policy"] ?? "";
  expect(csp).toContain("frame-ancestors 'self' https://x.com https://*.x.com https://twitter.com https://*.twitter.com");
  expect(csp).not.toContain("frame-ancestors 'none'");
  expect(response.headers()["x-frame-options"]).toBeUndefined();

  const home = await request.get("/");
  expect(home.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(home.headers()["x-frame-options"]).toBe("DENY");
});

test("/embed/ is the Night Shift show, kept out of search", async ({ page }) => {
  await page.goto("/embed/");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  await expect(page.getByRole("button", { name: "Wake it up and start the night shift" })).toBeVisible();
});

test("for Twitterbot /embed/ is a player card for itself", async ({ request }) => {
  for (const path of ["/embed/", "/embed"]) {
    const response = await request.get(path, { headers: { "User-Agent": "Twitterbot/1.0" } });
    expect(response.status(), path).toBe(200);
    const html = await response.text();
    expect(html, path).toContain('<meta name="twitter:player" content="https://construct.computer/embed/?src=embed"/>');
  }
});

test("the old show routes are gone", async ({ request }) => {
  for (const path of ["/embed1/", "/embed2/"]) {
    expect((await request.get(path)).status()).toBe(404);
  }
});

test("a promo link welcomes the visitor once and keeps the code for checkout", async ({ page, context }) => {
  await page.goto("/?promo=freemonth&utm_source=x&utm_medium=player&utm_campaign=e2e");
  const dialog = page.getByRole("dialog", { name: /Your free month is ready/ });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("FREEMONTH")).toBeVisible();
  const cookie = (await context.cookies()).find((c) => c.name === "construct_attr");
  expect(decodeURIComponent(cookie?.value ?? "")).toContain("FREEMONTH");

  await dialog.getByRole("button", { name: "Look around first" }).click();
  await expect(dialog).toBeHidden();
  await page.reload();
  await expect(page.getByRole("dialog", { name: /Your free month is ready/ })).toBeHidden();
});

test("a made-up URL is still a 404, but plays the show when posted to X", async ({ request }) => {
  const response = await request.get("/x");
  expect(response.status()).toBe(404);
  const html = await response.text();
  expect(html).toContain('<meta name="twitter:card" content="player"');
  expect(html).toContain('<meta name="twitter:player" content="https://construct.computer/embed/?src=link"');
  expect(html).toContain('<meta name="robots" content="noindex, follow"');
});

test("each X profile link lands on the homepage with its tags and the free month", async ({ request }) => {
  const links: Array<[string, string]> = [["/co", "company"], ["/ankush", "ankush"], ["/nischal", "nischal"], ["/vib/", "vib"]];
  for (const [path, who] of links) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status(), path).toBe(302);
    const location = new URL(response.headers()["location"] ?? "", "https://construct.computer");
    expect(location.pathname).toBe("/");
    expect(location.searchParams.get("promo")).toBe("FREEMONTH");
    expect(location.searchParams.get("utm_source")).toBe("x");
    expect(location.searchParams.get("utm_content")).toBe(who);
  }
});

test("the X play card image is 4:3 and points at the live show", async ({ request }) => {
  const html = await (await request.get("/embed/", { headers: { "User-Agent": "Twitterbot/1.0" } })).text();
  expect(html).toMatch(/<meta name="twitter:image" content="[^"]*og\/play\.jpg\?v=2"/);
  expect(html).toMatch(/<meta property="og:image" content="[^"]*og\/home\.jpg\?v=4"/);
});
