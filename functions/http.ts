/** Response helpers shared by the embed functions. */

const MAX_BODY_BYTES = 16 * 1024;

export function json(
  data: unknown,
  status = 200,
  headers?: HeadersInit,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Strict-Transport-Security":
        "max-age=63072000; includeSubDomains; preload",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
}

export function error(
  status: number,
  code: string,
  message = "Request rejected",
  headers?: HeadersInit,
): Response {
  return json({ error: { code, message } }, status, headers);
}

/**
 * The parsed JSON body of a POST, or the response that rejects it: wrong
 * method or content type, too large, or not JSON.
 */
export async function readJsonBody(
  request: Request,
  maxBytes = MAX_BODY_BYTES,
): Promise<{ body: unknown } | { response: Response }> {
  if (request.method !== "POST") {
    return {
      response: error(405, "method_not_allowed", "Request rejected", {
        Allow: "POST",
      }),
    };
  }
  const contentType = request.headers
    .get("content-type")
    ?.split(";")
    .at(0)
    ?.trim()
    .toLowerCase();
  if (contentType !== "application/json") {
    return { response: error(415, "unsupported_media_type") };
  }
  const declaredLength = Number(request.headers.get("content-length"));
  if (declaredLength > maxBytes) {
    return { response: error(413, "payload_too_large") };
  }
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return { response: error(400, "invalid_request") };
  }
  if (raw.length > maxBytes) {
    return { response: error(413, "payload_too_large") };
  }
  try {
    return { body: JSON.parse(raw) };
  } catch {
    return { response: error(400, "invalid_request") };
  }
}
