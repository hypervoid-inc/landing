import type { z } from "zod";

import { getApiBaseUrl } from "../env";

export type ApiFailureKind =
  /** Reached the server; it refused or errored. */
  | "http"
  /** Never reached the server (offline, DNS, CORS). Worth a retry. */
  | "network"
  /** Reached the server but the body was not the shape we expect. */
  | "contract";

export type ApiResult<T> =
  | { success: true; data: T; status: number }
  | {
      success: false;
      error: string;
      kind: ApiFailureKind;
      status?: number;
    };

/** Callers gate re-auth on this rather than string-matching the message. */
export function isUnauthorized(result: ApiResult<unknown>): boolean {
  return !result.success && result.status === 401;
}

/** True when retrying could plausibly succeed — drives the Retry affordance. */
export function isRetryable(result: ApiResult<unknown>): boolean {
  if (result.success) return false;
  if (result.kind === "network") return true;
  return result.status != null && result.status >= 500;
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function errorMessage(body: unknown, status: number): string {
  const record =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : null;
  return (
    (typeof record?.message === "string" && record.message) ||
    (typeof record?.error === "string" && record.error) ||
    `Request failed (${status})`
  );
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit & { schema?: z.ZodType<T> } = {},
): Promise<ApiResult<T>> {
  const { schema, ...fetchOptions } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string> | undefined),
  };

  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
      ...fetchOptions,
      headers,
      // The session cookie is host-only on the API origin; without this the
      // request is anonymous and SSO with the OS silently breaks.
      credentials: "include",
    });
  } catch {
    return {
      success: false,
      error: "Can't reach Construct. Check your connection.",
      kind: "network",
    };
  }

  const body = await readBody(response);

  if (!response.ok) {
    return {
      success: false,
      error: errorMessage(body, response.status),
      kind: "http",
      status: response.status,
    };
  }

  if (!schema) {
    return { success: true, data: body as T, status: response.status };
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    // A shape mismatch here means the client and API disagree. Surface it as a
    // real error rather than rendering an empty card and calling it a loading
    // state, which is how the previous hand-written types stayed broken.
    return {
      success: false,
      error: "Construct returned unexpected data.",
      kind: "contract",
      status: response.status,
    };
  }

  return { success: true, data: parsed.data, status: response.status };
}
