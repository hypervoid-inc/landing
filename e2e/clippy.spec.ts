import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * `?clippy=now` collapses the dwell delay to zero. A query param is the only
 * override that reaches a root mounted widget without bundler surgery, and it is
 * inert for a prerendered SPA.
 * `?ph=off` keeps sticky chrome header-only so Clippy geometry stays stable.
 * Clippy still waits for a trusted gesture (click, key, or wheel) before opening.
 */
const POST = "/blog/ai-agent-memory/?clippy=now&ph=off";

const widget = "aside.clippy-widget";

/** Harmless keydown that counts as the first interaction. */
async function engage(page: Page) {
  await expect(page.locator("main")).toBeVisible();
  // useEffect listeners attach after paint; a key before that is lost.
  await page.waitForTimeout(150);
  await page.keyboard.press("Shift");
}

async function gotoAndEngage(page: Page, url: string) {
  await page.goto(url);
  await engage(page);
}

test.beforeEach(async ({ page }) => {
  const originalGoto = page.goto.bind(page);
  page.goto = ((url, options) => {
    const target = new URL(String(url), "http://localhost:8788");
    if (!target.searchParams.has("ph")) {
      target.searchParams.set("ph", "off");
    }
    return originalGoto(
      `${target.pathname}${target.search}${target.hash}`,
      options,
    );
  }) as typeof page.goto;
});

test("stays closed until the first interaction", async ({ page }) => {
  await page.goto(POST);
  await expect(page.locator("main")).toBeVisible();
  // Hydration would open the tip immediately with `?clippy=now` if the gate
  // were missing, so wait a beat before asserting it stayed closed.
  await page.waitForTimeout(400);
  await expect(page.locator(widget)).toHaveCount(0);
  await engage(page);
  await expect(page.locator(widget)).toBeVisible();
});

test("opens the auth dialog from the single CTA", async ({ page }) => {
  await gotoAndEngage(page, POST);

  const tip = page.getByRole("complementary", { name: "Construct" });
  await expect(tip).toBeVisible();
  await expect(tip).toContainText("It looks like you're researching AI agents");
  await expect(tip.getByRole("button")).toHaveCount(1);
  await expect(tip.getByRole("link")).toHaveCount(1);

  // Scoped to the tip: blog bodies now carry their own inline CTAs, so an
  // unscoped link lookup matches those too.
  await tip.getByRole("link", { name: "Try Construct" }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: /Create your Construct account/i }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
});

test("collapses to the sprite and reopens on the same line", async ({
  page,
}) => {
  await gotoAndEngage(page, POST);
  const root = page.locator(widget);
  await expect(root).toHaveAttribute("data-variant", "desktop");
  await expect(root).toHaveAttribute("data-placed", "true");
  await expect(root).toHaveAttribute("style", /translate3d/);
  await expect(root).toContainText(
    "It looks like you're researching AI agents",
  );

  await page.getByRole("button", { name: "Minimize Construct" }).click();
  await expect(page.locator(".clippy-bubble")).toHaveCount(0);
  await expect(page.locator(".clippy-sprite")).toBeVisible();
  // Still on the desktop drag path after collapse — not mobile bottom anchoring.
  await expect(root).toHaveAttribute("data-variant", "desktop");
  await expect(root).toHaveAttribute("style", /translate3d/);

  await page.getByRole("button", { name: "Open Construct message" }).click();
  await expect(root).toContainText(
    "It looks like you're researching AI agents",
  );
});

test("stays hidden across client side navigation", async ({ page }) => {
  await gotoAndEngage(page, POST);
  await page.getByRole("button", { name: "Minimize Construct" }).click();
  await page.getByRole("button", { name: "Hide Construct" }).click();
  await expect(page.locator(widget)).toHaveCount(0);

  await page
    .getByRole("navigation", { name: "Primary" })
    .getByRole("button", { name: "Resources" })
    .click();
  await page
    .getByRole("navigation", { name: "Primary" })
    .getByRole("link", { name: "Blog", exact: true })
    .click();
  await expect(page).toHaveURL(/\/blog\/$/);
  await expect(page.locator(widget)).toHaveCount(0);
});

test("reappears after a hard refresh even when previously dismissed", async ({
  page,
}) => {
  await gotoAndEngage(page, POST);
  await page.getByRole("button", { name: "Minimize Construct" }).click();
  await page.getByRole("button", { name: "Hide Construct" }).click();
  await expect(page.locator(widget)).toHaveCount(0);

  await page.reload();
  await expect(page.locator(widget)).toHaveCount(0);
  await engage(page);
  await expect(page.locator(widget)).toBeVisible();
});

test("dismisses with the Escape key", async ({ page }) => {
  await gotoAndEngage(page, POST);
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
  await gotoAndEngage(page, POST);
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
  await gotoAndEngage(page, "/privacy/?clippy=now");
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
  await gotoAndEngage(page, POST);
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
    await gotoAndEngage(page, POST);
    await expect(page.locator(".clippy-card")).toBeVisible();
    await expect(page.locator(".clippy-bubble")).toHaveCount(0);
    await expect(page.locator(".clippy-pill")).toHaveCount(1);
    await expect(
      page.getByRole("button", { name: "What are you?" }),
    ).toHaveCount(0);
    const clamp = await page
      .locator(".clippy-card .clippy-line")
      .evaluate((node) => getComputedStyle(node).webkitLineClamp);
    expect(clamp).toBe("2");
    // Drag is desktop only, so no transform is ever applied.
    await expect(page.locator(widget)).toHaveAttribute(
      "data-variant",
      "mobile",
    );

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

  test("keeps the collapsed sprite and close fully on screen", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await gotoAndEngage(page, POST);
    await expect(page.locator(widget)).toHaveAttribute(
      "data-variant",
      "mobile",
    );

    await page.getByRole("button", { name: "Minimize Construct" }).click();
    await expect(page.locator(".clippy-card")).toHaveCount(0);
    await expect(page.locator(widget)).toHaveAttribute("data-open", "false");

    const viewport = page.viewportSize()!;
    for (const target of [
      page.locator(".clippy-sprite"),
      page.getByRole("button", { name: "Hide Construct" }),
    ]) {
      const box = await target.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
    }
  });
});

for (const path of ["/?clippy=now", "/blog/?clippy=now"]) {
  test(`${path} has no accessibility violations with the tip open`, async ({
    page,
  }) => {
    await gotoAndEngage(page, path);
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
