/* global document -- the page functions passed to `evaluate` run in Chromium. */
import { chromium } from "@playwright/test";

import { cardHtml } from "./frame.mjs";

/**
 * Renders cards to 2400x1260 PNGs (1200x630 at 2x) in headless Chromium, so
 * a card is set with the site's own fonts and CSS rather than an
 * approximation of them. One browser is shared across a run; nothing here
 * calls a model or the network.
 */

let browser;

/**
 * Geist is embedded, but the wordmark is Georgia italic, as on the site, and
 * terminals are Menlo, both from the system. Chromium falls back silently
 * when a family is missing, which would reset the whole set's wordmark, so a
 * machine without them refuses to render. Cards are made on macOS.
 */
const SYSTEM_FONTS = ["Georgia", "Menlo"];

async function launch() {
  const instance = await chromium.launch();
  const tab = await instance.newPage();
  const missing = await tab.evaluate((families) => {
    const context = document.createElement("canvas").getContext("2d");
    const width = (font) => {
      context.font = font;
      return context.measureText("Construct Computer 0123 wiq").width;
    };
    return families.filter(
      (family) =>
        width(`30px "${family}", monospace`) === width("30px monospace") &&
        width(`30px "${family}", serif`) === width("30px serif"),
    );
  }, SYSTEM_FONTS);
  await tab.close();
  if (missing.length) {
    await instance.close();
    throw new Error(
      `Missing system fonts: ${missing.join(", ")}. Render cards on macOS.`,
    );
  }
  return instance;
}

export async function renderCard(card) {
  browser ??= await launch();
  const tab = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 2,
  });
  try {
    await tab.setContent(cardHtml(card), { waitUntil: "load" });
    await tab.waitForSelector("body[data-ready]");
    const { overflow, problems } = await tab.evaluate(() => ({
      ...document.body.dataset,
    }));
    if (overflow) throw new Error(`Headline does not fit: "${card.title}"`);
    if (problems) throw new Error(`${card.figure.kind}: ${problems}`);
    return await tab.screenshot({ type: "png" });
  } finally {
    await tab.close();
  }
}

export async function closeRenderer() {
  await browser?.close();
  browser = undefined;
}
