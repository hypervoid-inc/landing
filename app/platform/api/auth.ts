import { z } from "zod";

import { getApiBaseUrl, getReturnOrigin } from "../env";
import { apiRequest, type ApiResult } from "./client";
import {
  AuthUserSchema,
  MeResponseSchema,
  PasswordStatusSchema,
  SessionListSchema,
} from "./schemas";

export type { AuthSession, AuthUser, SessionSurface } from "./schemas";

import type { AuthUser } from "./schemas";

export function getGoogleAuthUrl(): string {
  const url = new URL(`${getApiBaseUrl()}/auth/google`);
  url.searchParams.set("redirect_origin", getReturnOrigin());
  return url.toString();
}

export async function exchangeCode(code: string): Promise<boolean> {
  const response = await fetch(`${getApiBaseUrl()}/auth/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ code }),
  });
  return response.ok;
}

export async function getMe(): Promise<
  | { success: true; user: AuthUser }
  | { success: false; error: string; unauthenticated: boolean }
> {
  const result = await apiRequest("/auth/me", { schema: MeResponseSchema });
  if (!result.success) {
    return {
      success: false,
      error: result.error,
      // A 401 is a signed-out user, not a failure worth showing an error for.
      unauthenticated: result.status === 401,
    };
  }
  const user = "user" in result.data ? result.data.user : result.data;
  return { success: true, user };
}

export async function logout(): Promise<void> {
  await apiRequest("/auth/logout", { method: "POST" });
}

export async function sendMagicLink(
  email: string,
  turnstileToken?: string,
): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`${getApiBaseUrl()}/auth/magic`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      email,
      returnOrigin: getReturnOrigin(),
      ...(turnstileToken ? { turnstileToken } : {}),
    }),
  });
  if (response.ok) return { success: true };
  const data = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;
  return { success: false, error: data?.error ?? "Could not send email" };
}

export async function verifyMagicOtp(
  email: string,
  otp: string,
): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  const response = await fetch(`${getApiBaseUrl()}/auth/magic/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, otp }),
  });
  const data = (await response.json().catch(() => null)) as {
    user?: AuthUser;
    error?: string;
  } | null;
  if (!response.ok) {
    return { success: false, error: data?.error ?? "Invalid code" };
  }
  return { success: true, user: data?.user };
}

export async function passwordLogin(
  email: string,
  password: string,
  turnstileToken?: string,
): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  const response = await fetch(`${getApiBaseUrl()}/auth/password/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      email,
      password,
      ...(turnstileToken ? { turnstileToken } : {}),
    }),
  });
  const data = (await response.json().catch(() => null)) as {
    user?: AuthUser;
    error?: string;
  } | null;
  if (!response.ok) {
    return {
      success: false,
      error: data?.error ?? "Incorrect email or password",
    };
  }
  return { success: true, user: data?.user };
}

export async function passwordRegister(
  email: string,
  turnstileToken?: string,
): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`${getApiBaseUrl()}/auth/password/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      email,
      returnOrigin: getReturnOrigin(),
      ...(turnstileToken ? { turnstileToken } : {}),
    }),
  });
  if (response.ok) return { success: true };
  const data = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;
  return { success: false, error: data?.error ?? "Could not start registration" };
}

export async function passwordRegisterVerifyOtp(
  email: string,
  otp: string,
): Promise<{ success: boolean; passwordSetGrant?: string; error?: string }> {
  const response = await fetch(
    `${getApiBaseUrl()}/auth/password/register/verify`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, otp }),
    },
  );
  const data = (await response.json().catch(() => null)) as {
    passwordSetGrant?: string;
    error?: string;
  } | null;
  if (!response.ok) {
    return { success: false, error: data?.error ?? "Invalid code" };
  }
  return { success: true, passwordSetGrant: data?.passwordSetGrant };
}

export async function passwordCompleteRegister(
  grant: string,
  password: string,
  passwordConfirm: string,
): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  const response = await fetch(
    `${getApiBaseUrl()}/auth/password/complete-register`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ grant, password, passwordConfirm }),
    },
  );
  const data = (await response.json().catch(() => null)) as {
    user?: AuthUser;
    error?: string;
  } | null;
  if (!response.ok) {
    return { success: false, error: data?.error ?? "Could not set password" };
  }
  return { success: true, user: data?.user };
}

export async function passwordForgot(
  email: string,
  turnstileToken?: string,
): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`${getApiBaseUrl()}/auth/password/forgot`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      email,
      returnOrigin: getReturnOrigin(),
      ...(turnstileToken ? { turnstileToken } : {}),
    }),
  });
  if (response.ok) return { success: true };
  const data = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;
  return { success: false, error: data?.error ?? "Could not send reset email" };
}

export async function passwordReset(input: {
  token?: string;
  email?: string;
  otp?: string;
  password: string;
  passwordConfirm: string;
  turnstileToken?: string;
}): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  const response = await fetch(`${getApiBaseUrl()}/auth/password/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  const data = (await response.json().catch(() => null)) as {
    user?: AuthUser;
    error?: string;
  } | null;
  if (!response.ok) {
    return { success: false, error: data?.error ?? "Could not reset password" };
  }
  return { success: true, user: data?.user };
}

/**
 * Returns the result rather than a bare boolean: swallowing the error made a
 * network blip look like "no password set", which silently drops the
 * current-password field and turns a change into an unverified set.
 */
export async function passwordStatus(): Promise<
  ApiResult<{ hasPassword: boolean }>
> {
  return apiRequest("/auth/password/status", { schema: PasswordStatusSchema });
}

export async function passwordSet(input: {
  currentPassword?: string;
  password: string;
  passwordConfirm: string;
}): Promise<{ success: boolean; error?: string }> {
  const result = await apiRequest("/auth/password/set", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return result.success
    ? { success: true }
    : { success: false, error: result.error };
}

export async function updateProfile(input: {
  displayName?: string;
  timezone?: string;
}) {
  return apiRequest("/auth/profile", {
    method: "PATCH",
    schema: AuthUserSchema,
    body: JSON.stringify(input),
  });
}

export async function listSessions() {
  return apiRequest("/auth/sessions", { schema: SessionListSchema });
}

export async function revokeSession(id: string) {
  return apiRequest(`/auth/sessions/${encodeURIComponent(id)}`, {
    method: "DELETE",
    schema: z.object({ ok: z.boolean(), revoked: z.boolean().optional() }),
  });
}

export async function redeemPasswordSetCode(
  code: string,
): Promise<{ success: boolean; passwordSetGrant?: string; error?: string }> {
  const response = await fetch(
    `${getApiBaseUrl()}/auth/password/redeem-set-code`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ code }),
    },
  );
  const data = (await response.json().catch(() => null)) as {
    passwordSetGrant?: string;
    error?: string;
  } | null;
  if (!response.ok) {
    return { success: false, error: data?.error ?? "Invalid code" };
  }
  return { success: true, passwordSetGrant: data?.passwordSetGrant };
}

/** Consume OAuth / magic / password deep-link query params after mount. */
export async function handleAuthReturn(): Promise<{
  handled: boolean;
  error?: string;
}> {
  const params = new URLSearchParams(window.location.search);
  const authError = params.get("auth_error");
  const code = params.get("code");
  const magicToken = params.get("magic_token");
  const registerToken = params.get("register_token");

  if (authError) {
    const url = new URL(window.location.href);
    url.searchParams.delete("auth_error");
    window.history.replaceState({}, "", url.pathname + url.search);
    return { handled: true, error: authError };
  }

  if (magicToken) {
    window.location.href = `${getApiBaseUrl()}/auth/magic/verify?token=${encodeURIComponent(magicToken)}`;
    return { handled: true };
  }

  if (registerToken) {
    window.location.href = `${getApiBaseUrl()}/auth/password/register/verify?token=${encodeURIComponent(registerToken)}`;
    return { handled: true };
  }

  if (code) {
    const url = new URL(window.location.href);
    url.searchParams.delete("code");
    window.history.replaceState({}, "", url.pathname + url.search);
    const ok = await exchangeCode(code);
    return ok
      ? { handled: true }
      : { handled: true, error: "Invalid or expired login code" };
  }

  return { handled: false };
}

export function consumeDeepLinkTokens(): {
  resetToken: string | null;
  passwordSetCode: string | null;
} {
  const params = new URLSearchParams(window.location.search);
  const resetToken = params.get("reset_token");
  const passwordSetCode = params.get("password_set_code");
  if (resetToken || passwordSetCode) {
    const url = new URL(window.location.href);
    url.searchParams.delete("reset_token");
    url.searchParams.delete("password_set_code");
    window.history.replaceState({}, "", url.pathname + url.search);
  }
  return { resetToken, passwordSetCode };
}
