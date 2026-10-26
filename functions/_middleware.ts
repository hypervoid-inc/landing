import { siteUrl } from "../shared/site";
import { pagePath, twinPath } from "../shared/markdown-twin";

/**
 * Serves the Markdown twins (`shared/markdown-twin.ts`) the way the AEO spec
 * asks (dualmark.dev/docs/spec). Static headers live in `public/_headers`;
 * this adds the two that depend on the request:
 *
 * - every `.md` response counts its tokens and names its page as canonical;
 * - a page that runs a Function anyway (`/`, see `_routes.json`) answers in
 *   Markdown to a client that prefers it, or to an answer engine's agent that
 *   takes either. The user agent is only matched, never stored. A client
 *   that takes neither gets a 406. Only a page with a twin has the two forms
 *   to choose between, so the API behind this middleware is never refused.
 *
 * Search crawlers are left out on purpose: they index the page, and the HTML
 * carries the title, cards and structured data their results are built from.
 */

type Context = {
  request: Request;
  next: (input?: Request) => Promise<Response>;
  env: { ASSETS: { fetch: (input: URL) => Promise<Response> } };
};

const answerAgents =
  /\b(GPTBot|ChatGPT-User|ClaudeBot|Claude-User|Perplexity-User|CCBot)\b/i;

/** About four characters to a token in English prose. */
export function estimateTokens(markdown: string): number {
  return Math.max(1, Math.ceil(markdown.length / 4));
}

/** The q-value `accept` gives `type`, from its most specific matching range. */
function quality(accept: string, type: string): number {
  const [major] = type.split("/");
  let best = { specificity: -1, q: 0 };
  for (const range of accept.split(",")) {
    const [name = "", ...params] = range.split(";").map((part) => part.trim());
    const specificity =
      name === type ? 2 : name === `${major}/*` ? 1 : name === "*/*" ? 0 : -1;
    if (specificity <= best.specificity) continue;
    const q = params.find((param) => param.startsWith("q="));
    best = { specificity, q: q ? Number(q.slice(2)) || 0 : 1 };
  }
  return best.q;
}

function qualities(request: Request) {
  const accept = request.headers.get("Accept") || "*/*";
  return {
    markdown: quality(accept, "text/markdown"),
    html: Math.max(
      quality(accept, "text/html"),
      quality(accept, "application/xhtml+xml"),
    ),
  };
}

export function prefersMarkdown(request: Request): boolean {
  const { markdown, html } = qualities(request);
  if (markdown !== html) return markdown > html;
  return (
    markdown > 0 && answerAgents.test(request.headers.get("User-Agent") ?? "")
  );
}

export function acceptsNeither(request: Request): boolean {
  const { markdown, html } = qualities(request);
  return markdown === 0 && html === 0;
}

async function withTokens(
  response: Response,
  method: string,
): Promise<Response> {
  const markdown = await response.text();
  const headers = new Headers(response.headers);
  headers.delete("Content-Length");
  headers.set("X-Markdown-Tokens", String(estimateTokens(markdown)));
  return new Response(method === "HEAD" ? null : markdown, {
    status: response.status,
    headers,
  });
}

export const onRequest = async ({
  request,
  next,
  env,
}: Context): Promise<Response> => {
  const { method } = request;
  if (method !== "GET" && method !== "HEAD") return next();
  const url = new URL(request.url);

  if (url.pathname.endsWith(".md")) {
    // A GET, since a HEAD has no body to count, and "manual" so a redirect
    // (/brand/brand.md) reaches the client instead of being followed here.
    const twin = await next(
      new Request(request.url, {
        headers: request.headers,
        redirect: "manual",
      }),
    );
    if (twin.status !== 200) return twin;
    const response = await withTokens(twin, method);
    response.headers.append(
      "Link",
      `<${siteUrl}${pagePath(url.pathname)}>; rel="canonical"`,
    );
    return response;
  }

  const refused = acceptsNeither(request);
  if (!refused && !prefersMarkdown(request)) return next();
  const twin = await env.ASSETS.fetch(new URL(twinPath(url.pathname), url));
  if (!twin.ok) return next();
  if (refused) {
    await twin.body?.cancel();
    return new Response(
      method === "HEAD"
        ? null
        : "This page is available as text/html or text/markdown.\n",
      {
        status: 406,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          Link: `<${twinPath(url.pathname)}>; rel="alternate"; type="text/markdown"`,
          Vary: "Accept",
        },
      },
    );
  }
  const response = await withTokens(twin, method);
  // This is the page's own URL, which stays indexable.
  response.headers.delete("X-Robots-Tag");
  response.headers.set("Vary", "Accept, User-Agent");
  return response;
};
