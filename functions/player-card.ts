import { playerCardTags } from "../shared/player-card";

/**
 * The prerendered homepage and `/embed/` are large image cards, which is what
 * Discord, Telegram, Slack and the rest should show. X is the one place the
 * page can play, so for Twitterbot alone the large card's tags are swapped for
 * the player card's (`shared/player-card.ts`). Everyone else gets the static
 * page untouched. The user agent is only matched, never stored.
 */

export type PageContext = {
  request: Request;
  next: (input?: Request) => Promise<Response>;
};

const CARD_TAG = /<meta name="twitter:card" content="[^"]*"\s*\/?>/;
const IMAGE_TAG = /<meta name="twitter:image" content="[^"]*"\s*\/?>/;

export function isTwitterbot(userAgent: string | null): boolean {
  return /\bTwitterbot\b/i.test(userAgent ?? "");
}

function escapeAttribute(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
}

/**
 * The page's `twitter:card` and `twitter:image` replaced with the player card,
 * or the page unchanged when it carries no `twitter:card` to replace.
 */
export function withPlayerCard(html: string, src: string): string {
  if (!CARD_TAG.test(html)) return html;
  const tags = playerCardTags(src)
    .map(
      ({ name, content }) =>
        `<meta name="${name}" content="${escapeAttribute(content)}"/>`,
    )
    .join("");
  return html.replace(IMAGE_TAG, "").replace(CARD_TAG, () => tags);
}

export function playerCardPage(src: string) {
  return async ({ request, next }: PageContext): Promise<Response> => {
    if (request.method !== "GET" || !isTwitterbot(request.headers.get("User-Agent"))) {
      return next();
    }
    // A 304 would let X keep whichever card it cached, so always fetch the page.
    const headers = new Headers(request.headers);
    headers.delete("If-None-Match");
    headers.delete("If-Modified-Since");
    const page = await next(new Request(request.url, { headers }));
    const type = page.headers.get("Content-Type") ?? "";
    if (!page.ok || !type.includes("text/html")) return page;

    const response = new Response(withPlayerCard(await page.text(), src), page);
    response.headers.delete("Content-Length");
    response.headers.delete("ETag");
    response.headers.set("Cache-Control", "no-store");
    return response;
  };
}
