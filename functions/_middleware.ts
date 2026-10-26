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
 *   takes either. The user agent is only matched, never stored.
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

export function prefersMarkdown(request: Request): boolean {
  const accept = request.headers.get("Accept") || "*/*";
  const markdown = quality(accept, "text/markdown");
  const html = quality(accept, "text/html");
  if (markdown !== html) return markdown > html;
  return (
    markdown > 0 && answerAgents.test(request.headers.get("User-Agent") ?? "")
  );
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

  if (!prefersMarkdown(request)) return next();
  const twin = await env.ASSETS.fetch(new URL(twinPath(url.pathname), url));
  if (!twin.ok) return next();
  const response = await withTokens(twin, method);
  // This is the page's own URL, which stays indexable.
  response.headers.delete("X-Robots-Tag");
  response.headers.set("Vary", "Accept, User-Agent");
  return response;
};
