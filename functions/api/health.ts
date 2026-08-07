import type { PagesFunction } from "../types";

/**
 * The `status` target of `/.well-known/api-catalog`. Deliberately dependency
 * free: it reports that the Functions runtime is serving, and nothing else. A
 * health check that touches D1 turns every poll into a database read and starts
 * reporting failures the site itself does not have.
 *
 * Response format follows draft-inadarei-api-health-check.
 */
const BODY = JSON.stringify({
  status: "pass",
  serviceId: "construct-computer-site-api",
  description: "Construct Computer site API",
});

export const onRequest: PagesFunction<unknown> = ({ request }) => {
  const allowed = request.method === "GET" || request.method === "HEAD";
  return new Response(
    allowed
      ? request.method === "HEAD"
        ? null
        : BODY
      : JSON.stringify({
          error: { code: "method_not_allowed", message: "Request rejected" },
        }),
    {
      status: allowed ? 200 : 405,
      headers: {
        "Access-Control-Allow-Origin": "*",
        Allow: "GET, HEAD",
        "Cache-Control": "no-store",
        "Content-Type": allowed
          ? "application/health+json; charset=utf-8"
          : "application/json; charset=utf-8",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Strict-Transport-Security":
          "max-age=63072000; includeSubDomains; preload",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
};
