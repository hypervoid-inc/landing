import { getApiBaseUrl, getReturnOrigin } from "../env";
import { apiRequest } from "./client";

export type AuthUser = {
  id: string;
  username: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  timezone: string | null;
  onboardingCompleted: boolean;
  createdAt: string;
};

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
  { success: true; user: AuthUser } | { success: false; error: string }
> {
  const result = await apiRequest<AuthUser>("/auth/me");
  if (!result.success) return { success: false, error: result.error };
  return { success: true, user: result.data };
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

export async function passwordStatus(): Promise<{ hasPassword: boolean }> {
  const result = await apiRequest<{ hasPassword: boolean }>(
    "/auth/password/status",
  );
  return result.success ? result.data : { hasPassword: false };
}

export async function passwordSet(input: {
  currentPassword?: string;
  password: string;
  passwordConfirm: string;
}): Promise<{ success: boolean; error?: string }> {
  const result = await apiRequest<{ ok: true }>("/auth/password/set", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return result.success
    ? { success: true }
    : { success: false, error: result.error };
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
