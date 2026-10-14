import {
  embedSourceSchema,
  type EmbedClaimResponse,
  type EmbedErrorCode,
  type EmbedHistoryEntry,
  type EmbedSessionResponse,
  type EmbedTurnResponse,
} from "../../../shared/embed-schema";

/** Talking to the embed functions, and keeping a session across a reload. */

const STORAGE_KEY = "construct_embed_session_v1";

export type EmbedFailure = { ok: false; code: EmbedErrorCode | "network"; status: number };

export type StoredSession = {
  token: string;
  firstName: string;
  turnsLeft: number;
  src: string;
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

export function claimOffer(input: { token: string; email: string; name?: string }) {
  return post<EmbedClaimResponse>("/api/embed/claim", input);
}

export function sendTurn(input: {
  token: string;
  message: string;
  history: EmbedHistoryEntry[];
}) {
  return post<EmbedTurnResponse>("/api/embed/turn", input);
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

export function readStoredSession(): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<StoredSession>;
    if (
      typeof value.token !== "string" ||
      typeof value.firstName !== "string" ||
      typeof value.turnsLeft !== "number" ||
      typeof value.src !== "string"
    ) {
      return null;
    }
    return value as StoredSession;
  } catch {
    return null;
  }
}

export function writeStoredSession(session: StoredSession | null): void {
  try {
    if (session) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // A convenience across reloads only; a blocked store changes nothing.
  }
}
