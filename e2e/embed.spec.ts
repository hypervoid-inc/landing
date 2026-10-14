import { expect, test } from "@playwright/test";

/**
 * The show inside an X post: the homepage's player card, the framing
 * headers and the page itself. The show's beats are in shows.spec.ts.
 */

test("the homepage is a player card pointing at the live demo", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "player");
  await expect(page.locator('meta[name="twitter:player"]')).toHaveAttribute(
    "content",
    "https://construct.computer/embed/?src=home",
  );
  await expect(page.locator('meta[name="twitter:player:width"]')).toHaveAttribute("content", "800");
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute("content", /og\/home\.jpg/);
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
  await expect(page.locator('meta[name="twitter:player"]')).toHaveAttribute(
    "content",
    "https://construct.computer/embed/?src=embed",
  );
  await expect(page.getByRole("button", { name: "Wake it up and start the night shift" })).toBeVisible();
});

test("the old show routes are gone", async ({ request }) => {
  for (const path of ["/embed1/", "/embed2/"]) {
    expect((await request.get(path)).status()).toBe(404);
  }
});
