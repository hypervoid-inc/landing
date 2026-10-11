import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Brand marks, so a card about Lindy shows Lindy and a figure with Slack in
 * it shows Slack.
 *
 * Logos are found by name, not set by hand: a matrix row called "Claude
 * Cowork", a plan called "Manus", or a flow node called "Slack" picks up the
 * right mark on its own, so writing a card never involves choosing an image.
 * The match is on exact product names this file lists, as whole words, never
 * on what a phrase means.
 *
 * An alias written "=Make" only matches a field that is exactly that word;
 * "Make" is a product and also an ordinary verb, and a card should not grow a
 * logo for using it as one.
 *
 * Sources and provenance: `assets/og/logos/SOURCES.md`.
 */

const root = fileURLToPath(new URL("../../../", import.meta.url));

export const LOGOS = {
  openai: ["OpenAI", "ChatGPT", "ChatGPT Dots", "Dots", "Codex", "ChatGPT Pro"],
  claude: [
    "Claude",
    "Cowork",
    "Claude Cowork",
    "Claude Code",
    "Claude Desktop",
    "Claude Tag",
    "Anthropic",
  ],
  gemini: ["Gemini", "Gemini Spark", "Spark"],
  google: ["Google", "Google Workspace", "Workspace AI"],
  gmail: ["Gmail"],
  "google-calendar": ["Google Calendar"],
  slack: ["Slack"],
  telegram: ["Telegram"],
  discord: ["Discord"],
  hubspot: ["HubSpot"],
  linear: ["Linear"],
  zapier: ["Zapier", "Zapier Agents"],
  make: ["=Make"],
  n8n: ["n8n"],
  perplexity: [
    "Perplexity",
    "Perplexity Computer",
    "Perplexity Max",
    "Perplexity Pro",
  ],
  grok: ["Grok", "Grok Bot", "xAI"],
  copilot: ["Copilot", "Microsoft Copilot"],
  cursor: ["Cursor"],
  vscode: ["VS Code", "Visual Studio Code"],
  cloudflare: ["Cloudflare", "R2", "D1"],
  github: ["GitHub"],
  notion: ["Notion"],
  hostinger: ["Hostinger"],
  composio: ["Composio"],
  exa: ["Exa"],
  lindy: ["Lindy"],
  manus: ["Manus"],
  viktor: ["Viktor"],
  sintra: ["Sintra", "Sintra X"],
  marblism: ["Marblism"],
  cellcog: ["CellCog"],
  genspark: ["Genspark", "Genspark Claw"],
  openclaw: ["OpenClaw"],
  hermes: ["Hermes", "Hermes Agent", "Nous"],
  simular: ["Simular", "Simular Sai", "Sai"],
  runbear: ["Runbear"],
  myclaw: ["MyClaw"],
  muse: ["Muse"],
  relay: ["Relay", "Relay.app"],
  gumloop: ["Gumloop"],
  relevance: ["Relevance AI"],
  artisan: ["Artisan"],
  meta: ["Meta"],
};

const normal = (text) =>
  ` ${String(text)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()} `;

/** Every alias as normalised text, longest first so "Claude Code" beats "Claude". */
const ALIASES = Object.entries(LOGOS)
  .flatMap(([key, names]) =>
    names.map((name) => ({
      key,
      exact: name.startsWith("="),
      text: normal(name.replace(/^=/, "")),
    })),
  )
  .sort((left, right) => right.text.length - left.text.length);

/** The brands named in a piece of text, in the order they appear. */
export function brandsIn(text) {
  const haystack = normal(text);
  const found = [];
  for (const alias of ALIASES) {
    const at = alias.exact
      ? haystack === alias.text
        ? 0
        : -1
      : haystack.indexOf(alias.text);
    if (at >= 0 && !found.some((entry) => entry.key === alias.key)) {
      found.push({ key: alias.key, at });
    }
  }
  return found
    .sort((left, right) => left.at - right.at)
    .map((entry) => entry.key);
}

/** The one brand a short name field refers to, if any. */
export function logoFor(text) {
  return brandsIn(text)[0];
}

export function logoFile(key) {
  return path.join(root, "assets/og/logos", `${key}.png`);
}
