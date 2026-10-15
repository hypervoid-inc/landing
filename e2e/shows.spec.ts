import { expect, test } from "@playwright/test";

/**
 * Night Shift at /embed/. The card tags and framing headers are covered in
 * embed.spec.ts; this walks the first interactive beats, since the full show
 * runs about a minute.
 */

test("Night Shift wakes up, takes the list and goes dark when the chain is pulled", async ({ page }) => {
  await page.setViewportSize({ width: 516, height: 387 });
  await page.goto("/embed/?src=e2e");
  await page.getByRole("button", { name: "Wake it up and start the night shift" }).click();

  await expect(page.getByText("Is today's work done?")).toBeVisible({ timeout: 12_000 });
  await page.getByRole("button", { name: "Not even close" }).click();

  await page.getByRole("button", { name: "Score the 40 new leads" }).click({ timeout: 12_000 });
  await expect(page.getByText(/On it\. I.ll start with/)).toBeVisible({ timeout: 6_000 });

  await page.getByLabel("Your first name").fill("ada", { timeout: 12_000 });
  await page.getByRole("button", { name: "That's me" }).click();
  await expect(page.getByText(/Thanks, Ada/)).toBeVisible();

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
