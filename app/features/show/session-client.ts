import {
  embedSourceSchema,
  type EmbedClaimResponse,
  type EmbedErrorCode,
  type EmbedJob,
  type EmbedSessionResponse,
} from "../../../shared/embed-schema";

/** Talking to the embed functions: a session for the viewer, then the claim. */

export type EmbedFailure = { ok: false; code: EmbedErrorCode | "network"; status: number };

/** What the show says when a call fails, by the functions' error code. */
export const ERROR_COPY: Record<string, string> = {
  invalid_request: "Please check your name and email.",
  verification_failed: "Please complete the check and try again.",
  origin_rejected: "This page is not trusted.",
  too_many_sessions: "That's a few demos from this connection this hour. Try again in a little while.",
  session_expired: "That session ended. Start again.",
  invalid_email: "Please enter a valid email.",
  internal_error: "Something went wrong. Please try again.",
  network: "Could not reach Construct. Check your connection and try again.",
};

async function post<T extends { ok: true }>(
  path: string,
  body: unknown,
): Promise<T | EmbedFailure> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, code: "network", status: 0 };
  }
  const data = (await response.json().catch(() => null)) as
    | T
    | { error?: { code?: string } }
    | null;
  if (response.ok && data && "ok" in data && data.ok === true) return data as T;
  const code =
    data && "error" in data && data.error?.code
      ? (data.error.code as EmbedErrorCode)
      : "internal_error";
  return { ok: false, code, status: response.status };
}

export function startSession(input: {
  name: string;
  src: string;
  turnstileToken: string;
  honeypot?: string;
}) {
  return post<EmbedSessionResponse>("/api/embed/session", input);
}

export function claimOffer(input: { token: string; email: string; name?: string; job?: EmbedJob }) {
  return post<EmbedClaimResponse>("/api/embed/claim", input);
}

/** The `src` the player URL carries, or `home`. */
export function sourceFromLocation(search: string): string {
  const raw = new URLSearchParams(search).get("src") ?? undefined;
  const parsed = embedSourceSchema.safeParse(raw);
  return parsed.success ? parsed.data : "home";
}

/** Whether this document is inside another page's frame (the X post). */
export function isFramed(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}
