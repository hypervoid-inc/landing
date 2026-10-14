import { expect, test } from "@playwright/test";

/**
 * The live demo inside an X post. The model is not reachable from a local
 * Pages dev server, so this covers the card, the headers, the gate and the
 * first screen of the desk; the turn itself is covered by the unit tests.
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

test("a first name unlocks Construct's computer", async ({ page }) => {
  await page.setViewportSize({ width: 516, height: 387 });
  await page.goto("/embed/?src=e2e");
  await expect(page.getByRole("heading", { name: /Meet Construct\./ })).toBeVisible();

  await page.getByPlaceholder("Your first name").fill("ada");
  const start = page.getByRole("button", { name: "Start" });
  await expect(start).toBeEnabled({ timeout: 15_000 });
  await start.click();

  // The computer is set up, the lock screen slides away, Spotlight asks for a job.
  await expect(page.getByText(/Setting up Ada's computer/)).toBeVisible();
  await expect(page.getByPlaceholder(/Hi Ada\. What's first/)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("8 jobs left")).toBeVisible();
  await expect(page.getByRole("button", { name: /Plan my week/ })).toBeVisible();
  await expect(page.getByText("Clocked in")).toBeVisible();

  // A reload keeps the session and skips the lock screen.
  await page.reload();
  await expect(page.getByPlaceholder(/Hi Ada\. What's first/)).toBeVisible({ timeout: 10_000 });

  await page.setViewportSize({ width: 375, height: 667 });
  await expect(page.getByRole("button", { name: /Chase an invoice/ })).toBeVisible();
});

test("the demo stands on its own page too", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/embed/");
  await expect(page.getByText(/live demo inside Construct/)).toBeVisible();
  await page.screenshot({ path: "test-results/embed-page-1280.png" });
});
