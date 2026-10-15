import { EMBED_SESSION_TTL_SECONDS } from "../shared/embed-schema";

/**
 * Session tokens for the show: a session id and an expiry, signed with
 * `EMBED_SESSION_SECRET`. Whether a session has claimed lives in D1
 * (`embed_sessions`), so a replayed token can't claim twice. The same secret keys the email and address
 * hashes those rows carry, which is what keeps a raw email or IP out of them.
 */

const encoder = new TextEncoder();

function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function fromBase64url(text: string): Uint8Array | null {
  try {
    const padded = text.replaceAll("-", "+").replaceAll("_", "/");
    const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function hmac(secret: string, message: string): Promise<Uint8Array> {
  const key = await hmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return new Uint8Array(signature);
}

function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a[i]! ^ b[i]!;
  return out === 0;
}

export type EmbedSessionClaims = { sid: string; exp: number };

export async function mintSessionToken(
  secret: string,
  sid: string,
  now = Date.now(),
): Promise<{ token: string; exp: number }> {
  const exp = Math.floor(now / 1000) + EMBED_SESSION_TTL_SECONDS;
  const payload = base64url(encoder.encode(JSON.stringify({ sid, exp })));
  const signature = base64url(await hmac(secret, payload));
  return { token: `${payload}.${signature}`, exp };
}

/** The claims of a token that verifies and has not expired, else null. */
export async function verifySessionToken(
  secret: string,
  token: string,
  now = Date.now(),
): Promise<EmbedSessionClaims | null> {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return null;
  const given = fromBase64url(signature);
  if (!given) return null;
  const expected = await hmac(secret, payload);
  if (!equalBytes(given, expected)) return null;
  const raw = fromBase64url(payload);
  if (!raw) return null;
  let claims: unknown;
  try {
    claims = JSON.parse(new TextDecoder().decode(raw));
  } catch {
    return null;
  }
  if (!claims || typeof claims !== "object") return null;
  const { sid, exp } = claims as Record<string, unknown>;
  if (typeof sid !== "string" || !/^[0-9a-f-]{36}$/.test(sid)) return null;
  if (typeof exp !== "number" || exp * 1000 <= now) return null;
  return { sid, exp };
}

/** A keyed hash, so the stored value identifies a repeat without naming it. */
export async function keyedHash(secret: string, kind: string, value: string): Promise<string> {
  return base64url(await hmac(secret, `${kind}:${value}`));
}
