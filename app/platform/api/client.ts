import { getApiBaseUrl } from "../env";

export type ApiResult<T> =
  | { success: true; data: T; status: number }
  | { success: false; error: string; status?: number };

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<ApiResult<T>> {
  const { auth = true, ...fetchOptions } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string> | undefined),
  };

  try {
    const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
      ...fetchOptions,
      headers,
      credentials: "include",
    });
    const text = await response.text();
    let body: unknown = null;
    if (text) {
      try {
        body = JSON.parse(text) as unknown;
      } catch {
        body = text;
      }
    }
    if (!response.ok) {
      const record =
        typeof body === "object" && body !== null
          ? (body as Record<string, unknown>)
          : null;
      const error =
        (typeof record?.message === "string" && record.message) ||
        (typeof record?.error === "string" && record.error) ||
        `Request failed (${response.status})`;
      return { success: false, error, status: response.status };
    }
    void auth;
    return { success: true, data: body as T, status: response.status };
  } catch {
    return { success: false, error: "Network error" };
  }
}
