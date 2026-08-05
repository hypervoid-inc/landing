import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * `?clippy=now` collapses the dwell delay to zero. A query param is the only
 * override that reaches a root mounted widget without bundler surgery, and it is
 * inert for a prerendered SPA.
 */
const POST = "/blog/ai-agent-memory/?clippy=now";

const widget = "aside.clippy-widget";

test("walks a blog reader through three beats into the auth dialog", async ({
  page,
}) => {
  await page.goto(POST);

  const tip = page.getByRole("complementary", { name: "Construct" });
  await expect(tip).toBeVisible();
  await expect(tip).toContainText("It looks like you're researching AI agents");

  await page.getByRole("button", { name: "What are you?" }).click();
  await expect(tip).toContainText(
    "I am Construct, your AI coworker with a cloud computer",
  );

  await page.getByRole("button", { name: "Show me" }).click();
  await expect(tip).toContainText("Research, inbox, reports");
  await expect(page.locator(".clippy-chip")).toHaveCount(0);

  // Scoped to the tip: blog bodies now carry their own inline CTAs, so an
  // unscoped link lookup matches those too.
  await tip.getByRole("link", { name: "Try Construct" }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: /Start with Construct/i }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
});

test("opens the auth dialog from the first beat too", async ({ page }) => {
  await page.goto(POST);
  await page.locator(".clippy-pill").click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: /Start with Construct/i }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
});

test("collapses to the sprite and reopens on the same beat", async ({
  page,
}) => {
  await page.goto(POST);
  await page.getByRole("button", { name: "What are you?" }).click();
  await expect(page.locator(widget)).toContainText("I am Construct");

  await page.getByRole("button", { name: "Minimize Construct" }).click();
  await expect(page.locator(".clippy-bubble")).toHaveCount(0);
  await expect(page.locator(".clippy-sprite")).toBeVisible();

  await page.getByRole("button", { name: "Open Construct message" }).click();
  await expect(page.locator(widget)).toContainText("I am Construct");
});

test("keeps its beat and stays hidden across client side navigation", async ({
  page,
}) => {
  await page.goto(POST);
  await page.getByRole("button", { name: "What are you?" }).click();
  await page.getByRole("button", { name: "Minimize Construct" }).click();
  await page.getByRole("button", { name: "Hide Construct" }).click();
  await expect(page.locator(widget)).toHaveCount(0);

  await page.getByRole("link", { name: "Blog", exact: true }).first().click();
  await expect(page).toHaveURL(/\/blog\/$/);
  await expect(page.locator(widget)).toHaveCount(0);
});

test("reappears after a hard refresh even when previously dismissed", async ({
  page,
}) => {
  await page.goto(POST);
  await page.getByRole("button", { name: "Minimize Construct" }).click();
  await page.getByRole("button", { name: "Hide Construct" }).click();
  await expect(page.locator(widget)).toHaveCount(0);

  await page.reload();
  await expect(page.locator(widget)).toBeVisible();
});

test("dismisses with the Escape key", async ({ page }) => {
  await page.goto(POST);
  await expect(page.locator(widget)).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.locator(".clippy-bubble")).toHaveCount(0);

  await page.keyboard.press("Escape");
  await expect(page.locator(widget)).toHaveCount(0);
});

test("can be dragged around the viewport without firing a click", async ({
  page,
}) => {
  // The entrance spring is still moving the sprite for its first 420ms, so a
  // press aimed at a freshly measured box can miss and select page text instead.
  // Reduced motion trips the CSS kill switch, as in the landing button test.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(POST);
  const root = page.locator(widget);
  await expect(root).toHaveAttribute("data-placed", "true");
  const before = await root.getAttribute("style");

  const box = await page.locator(".clippy-sprite").boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x - 700, box!.y - 250, { steps: 12 });
  await page.mouse.up();

  await expect(root).not.toHaveAttribute("style", before ?? "");
  // The bubble keeps its side no matter where the widget is dropped.
  await expect(page.locator(".clippy-bubble")).toBeVisible();
  // The drag must not read as a click on the widget.
  await expect(root).toHaveAttribute("data-open", "true");
});

test("stays silent on the privacy policy", async ({ page }) => {
  await page.goto("/privacy/?clippy=now");
  await expect(page.locator("main")).toBeVisible();
  await expect(page.locator(widget)).toHaveCount(0);
});

test("still appears when the reader already subscribed", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "construct_beta_access_v1",
      JSON.stringify({ granted: true, grantedAt: Date.now() }),
    );
  });
  await page.goto(POST);
  await expect(page.locator(widget)).toBeVisible();
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("swaps the bubble for a card and keeps a 44px dismiss target", async ({
    page,
  }) => {
    // getBoundingClientRect includes transforms, and the entrance spring is
    // still scaling the card, so measure with motion off to get true sizes.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(POST);
    await expect(page.locator(".clippy-card")).toBeVisible();
    await expect(page.locator(".clippy-bubble")).toHaveCount(0);
    // Drag is desktop only, so no transform is ever applied.
    await expect(page.locator(widget)).toHaveAttribute("data-variant", "mobile");

    const close = page.getByRole("button", { name: "Minimize Construct" });
    const hit = await close.evaluate((node) => {
      const style = getComputedStyle(node, "::after");
      const box = node.getBoundingClientRect();
      const inset = Math.abs(Number.parseFloat(style.top)) || 0;
      return { width: box.width + inset * 2, height: box.height + inset * 2 };
    });
    expect(hit.width).toBeGreaterThanOrEqual(44);
    expect(hit.height).toBeGreaterThanOrEqual(44);

    // The card must not push its own actions out of the viewport.
    const actions = await page.locator(".clippy-actions").boundingBox();
    expect(actions!.x + actions!.width).toBeLessThanOrEqual(375);
  });
});

for (const path of ["/?clippy=now", "/blog/?clippy=now"]) {
  test(`${path} has no accessibility violations with the tip open`, async ({
    page,
  }) => {
    await page.goto(path);
    await expect(
      page.getByRole("complementary", { name: "Construct" }),
    ).toBeVisible();
    const results = await new AxeBuilder({ page })
      // The requested brand cyan intentionally matches the original visual system.
      .disableRules(["color-contrast"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}
