const STORAGE_KEY = "construct.landing.postLoginWelcome";
const TTL_MS = 30 * 60 * 1000;

export type PostLoginWelcome = {
  source: string;
  plan?: string;
  ts: number;
};

function readRaw(): PostLoginWelcome | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PostLoginWelcome>;
    if (typeof parsed.source !== "string" || typeof parsed.ts !== "number") {
      return null;
    }
    return {
      source: parsed.source,
      plan: typeof parsed.plan === "string" ? parsed.plan : undefined,
      ts: parsed.ts,
    };
  } catch {
    return null;
  }
}

function isFresh(payload: PostLoginWelcome): boolean {
  return Date.now() - payload.ts < TTL_MS;
}

/** Persist intent before Google / magic-email leave the page. */
export function markPostLoginWelcome(input: {
  source: string;
  plan?: string;
}): void {
  try {
    const payload: PostLoginWelcome = {
      source: input.source,
      ...(input.plan ? { plan: input.plan } : {}),
      ts: Date.now(),
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // sessionStorage may be unavailable; welcome simply won't reopen.
  }
}

/** Read without clearing; drops expired payloads. */
export function peekPostLoginWelcome(): PostLoginWelcome | null {
  const payload = readRaw();
  if (!payload) return null;
  if (!isFresh(payload)) {
    clearPostLoginWelcome();
    return null;
  }
  return payload;
}

/** Read once and clear. */
export function consumePostLoginWelcome(): PostLoginWelcome | null {
  const payload = peekPostLoginWelcome();
  clearPostLoginWelcome();
  return payload;
}

export function clearPostLoginWelcome(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Local preview: `?welcome=1` (or `now`) opens the post-login dialog without
 * signing in. Gated to Vite DEV or localhost so production never honors it.
 */
export function shouldOpenPostLoginWelcomePreview(
  search: string,
  options?: { hostname?: string; isDev?: boolean },
): boolean {
  const value = new URLSearchParams(search).get("welcome");
  if (value !== "1" && value !== "now") return false;

  const isDev = options?.isDev ?? Boolean(import.meta.env.DEV);
  if (isDev) return true;

  const hostname =
    options?.hostname ??
    (typeof window !== "undefined" ? window.location.hostname : "");
  return hostname === "localhost" || hostname === "127.0.0.1";
}
