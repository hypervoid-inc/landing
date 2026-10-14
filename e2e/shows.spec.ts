import { expect, test } from "@playwright/test";

/**
 * The two playable shows, /embed1/ (Night Shift Live) and /embed2/
 * (Episode 01). These cover the card tags, the framing headers and the
 * first interactive beats; the full shows run about a minute each.
 */

for (const path of ["/embed1/", "/embed2/"]) {
  test(`${path} is a player card that only X may frame`, async ({ page, request }) => {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    const csp = response.headers()["content-security-policy"] ?? "";
    expect(csp).toContain("frame-ancestors 'self' https://x.com https://*.x.com https://twitter.com https://*.twitter.com");
    expect(response.headers()["x-frame-options"]).toBeUndefined();

    await page.goto(path);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "player");
    await expect(page.locator('meta[name="twitter:player"]')).toHaveAttribute(
      "content",
      `https://construct.computer${path}?src=${path.replaceAll("/", "")}`,
    );
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  });
}

test("Night Shift wakes up, takes the list and goes dark when the chain is pulled", async ({ page }) => {
  await page.setViewportSize({ width: 516, height: 387 });
  await page.goto("/embed1/");
  await page.getByRole("button", { name: "Wake it up and start the night shift" }).click();

  await expect(page.getByText("Is your to-do list done for today?")).toBeVisible({ timeout: 12_000 });
  await page.getByRole("button", { name: "Not even close" }).click();

  await page.getByRole("button", { name: "Score the 40 new leads" }).click({ timeout: 12_000 });
  await expect(page.getByText(/On it\. I.ll start with/)).toBeVisible({ timeout: 6_000 });

  await page.getByLabel("Your first name").fill("ada", { timeout: 12_000 });
  await page.getByRole("button", { name: "That's me" }).click();
  await expect(page.getByText(/Nice to meet you, Ada/)).toBeVisible();

  // The chain has to be pulled down, not clicked.
  const bead = page.getByRole("button", { name: "Pull the chain to turn off the light" });
  await expect(bead).toBeVisible({ timeout: 6_000 });
  // Let the chain finish dropping in before grabbing it.
  await page.waitForTimeout(1_200);
  const box = (await bead.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 80, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByText(/Good night, Ada/)).toBeVisible({ timeout: 6_000 });
  await expect(page.locator(".ns")).toHaveAttribute("data-tod", "night");
});

test("Episode 01 lets the reader name the episode and its star", async ({ page }) => {
  await page.setViewportSize({ width: 516, height: 387 });
  await page.goto("/embed2/");
  await page.getByRole("button", { name: "Forty new leads" }).click({ timeout: 12_000 });
  await page.getByLabel("Your first name").fill("ada");
  await page.getByRole("button", { name: "Roll it" }).click();
  await expect(page.getByText("Starring Ada")).toBeVisible();
  await expect(page.getByText(/Forty/)).toBeVisible();
});
