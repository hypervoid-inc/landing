import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Turnstile } from "@marsidev/react-turnstile";

import { SiteFooter, SiteHeader } from "../../components/layout/site-layout";
import * as authApi from "../../platform/api/auth";
import { getOsOrigin, getTurnstileSiteKey } from "../../platform/env";
import { useAuth } from "./auth-provider";

type Panel =
  | "signin"
  | "magic-otp"
  | "create"
  | "create-otp"
  | "set-password"
  | "forgot"
  | "forgot-sent"
  | "reset";

const fieldClass =
  "w-full rounded-xl border border-[#dcecef] bg-white px-3 py-2.5 text-sm text-[#4e4646] outline-none focus:border-[#01b4c8]";
const btnPrimary =
  "site-cta inline-flex min-h-11 w-full items-center justify-center rounded-full bg-black px-4 text-sm font-semibold text-white";
const btnSecondary =
  "inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[#dcecef] bg-white px-4 text-sm font-semibold text-[#4e4646]";

export function LoginPage() {
  const { status, user, setUser, error: authError, clearError, refresh } =
    useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const planIntent = params.get("plan");

  const [deepLinks] = useState(() =>
    typeof window === "undefined"
      ? { resetToken: null, passwordSetCode: null }
      : authApi.consumeDeepLinkTokens(),
  );
  const [panel, setPanel] = useState<Panel>(() =>
    deepLinks.resetToken ? "reset" : "signin",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [passwordSetGrant, setPasswordSetGrant] = useState<string | null>(null);
  const [resetToken] = useState(() => deepLinks.resetToken);
  const [passwordMode, setPasswordMode] = useState(false);
  const turnstileKey = getTurnstileSiteKey();

  useEffect(() => {
    const code = deepLinks.passwordSetCode;
    if (!code) return;
    void authApi.redeemPasswordSetCode(code).then((r) => {
      if (r.success && r.passwordSetGrant) {
        setPasswordSetGrant(r.passwordSetGrant);
        setPanel("set-password");
      } else if (r.error) setError(r.error);
    });
  }, [deepLinks.passwordSetCode]);

  useEffect(() => {
    if (status === "authenticated" && user) {
      if (!user.onboardingCompleted) {
        window.location.href = getOsOrigin();
        return;
      }
      navigate(planIntent ? `/account?plan=${planIntent}` : "/account", {
        replace: true,
      });
    }
  }, [status, user, navigate, planIntent]);

  async function onMagicSend(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    clearError();
    const result = await authApi.sendMagicLink(
      email,
      turnstileToken ?? undefined,
    );
    setBusy(false);
    if (!result.success) {
      setError(result.error ?? "Failed");
      return;
    }
    setPanel("magic-otp");
  }

  async function onMagicVerify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await authApi.verifyMagicOtp(email, otp);
    setBusy(false);
    if (!result.success) {
      setError(result.error ?? "Invalid code");
      return;
    }
    if (result.user) setUser(result.user);
    else await refresh();
  }

  async function onPasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await authApi.passwordLogin(
      email,
      password,
      turnstileToken ?? undefined,
    );
    setBusy(false);
    if (!result.success) {
      setError(result.error ?? "Login failed");
      return;
    }
    if (result.user) setUser(result.user);
  }

  async function onRegister(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await authApi.passwordRegister(
      email,
      turnstileToken ?? undefined,
    );
    setBusy(false);
    if (!result.success) {
      setError(result.error ?? "Failed");
      return;
    }
    setPanel("create-otp");
  }

  async function onRegisterOtp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await authApi.passwordRegisterVerifyOtp(email, otp);
    setBusy(false);
    if (!result.success || !result.passwordSetGrant) {
      setError(result.error ?? "Invalid code");
      return;
    }
    setPasswordSetGrant(result.passwordSetGrant);
    setPanel("set-password");
  }

  async function onSetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordSetGrant) return;
    setBusy(true);
    setError(null);
    const result = await authApi.passwordCompleteRegister(
      passwordSetGrant,
      password,
      passwordConfirm,
    );
    setBusy(false);
    if (!result.success) {
      setError(result.error ?? "Failed");
      return;
    }
    if (result.user) setUser(result.user);
  }

  async function onForgot(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await authApi.passwordForgot(
      email,
      turnstileToken ?? undefined,
    );
    setBusy(false);
    if (!result.success) {
      setError(result.error ?? "Failed");
      return;
    }
    setPanel("forgot-sent");
  }

  async function onReset(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await authApi.passwordReset({
      token: resetToken ?? undefined,
      password,
      passwordConfirm,
      turnstileToken: turnstileToken ?? undefined,
    });
    setBusy(false);
    if (!result.success) {
      setError(result.error ?? "Failed");
      return;
    }
    if (result.user) setUser(result.user);
  }

  const displayError = error ?? authError;

  return (
    <div className="flex min-h-dvh flex-col bg-[#f7fbfc]">
      <SiteHeader />
      <main
        id="main"
        className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12"
      >
        {status === "loading" ? (
          <p className="text-center text-sm text-[#627c86]">Checking session…</p>
        ) : (
          <div className="rounded-2xl border border-[#dcecef] bg-white p-6 shadow-[0_8px_30px_rgba(37,72,82,.06)]">
            <h1 className="font-geist text-2xl font-semibold tracking-tight text-[#4e4646]">
              Sign in
            </h1>
            <p className="mt-1 text-sm text-[#627c86]">
              Same account as{" "}
              <a className="text-[#018fa0] underline" href={getOsOrigin()}>
                Construct OS
              </a>
              .
            </p>

            {displayError ? (
              <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {displayError}
              </p>
            ) : null}

            {panel === "signin" ? (
              <div className="mt-6 space-y-3">
                <a href={authApi.getGoogleAuthUrl()} className={btnSecondary}>
                  Continue with Google
                </a>
                <form
                  onSubmit={passwordMode ? onPasswordLogin : onMagicSend}
                  className="space-y-3"
                >
                  <input
                    className={fieldClass}
                    type="email"
                    required
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                  {passwordMode ? (
                    <input
                      className={fieldClass}
                      type="password"
                      required
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                    />
                  ) : null}
                  {turnstileKey ? (
                    <Turnstile
                      siteKey={turnstileKey}
                      onSuccess={setTurnstileToken}
                    />
                  ) : null}
                  <button type="submit" className={btnPrimary} disabled={busy}>
                    {busy
                      ? "Please wait…"
                      : passwordMode
                        ? "Sign in"
                        : "Email me a code"}
                  </button>
                </form>
                <button
                  type="button"
                  className="text-sm text-[#018fa0]"
                  onClick={() => setPasswordMode((v) => !v)}
                >
                  {passwordMode ? "Use email code instead" : "Use password"}
                </button>
                <div className="flex justify-between text-sm text-[#627c86]">
                  <button
                    type="button"
                    onClick={() => setPanel("create")}
                    className="text-[#018fa0]"
                  >
                    Create account
                  </button>
                  <button
                    type="button"
                    onClick={() => setPanel("forgot")}
                    className="text-[#018fa0]"
                  >
                    Forgot password
                  </button>
                </div>
              </div>
            ) : null}

            {panel === "magic-otp" ? (
              <form onSubmit={onMagicVerify} className="mt-6 space-y-3">
                <p className="text-sm text-[#627c86]">
                  Enter the 6-digit code sent to {email}.
                </p>
                <input
                  className={fieldClass}
                  inputMode="numeric"
                  pattern="\d{6}"
                  required
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
                <button type="submit" className={btnPrimary} disabled={busy}>
                  Verify
                </button>
                <button
                  type="button"
                  className="text-sm text-[#018fa0]"
                  onClick={() => setPanel("signin")}
                >
                  Back
                </button>
              </form>
            ) : null}

            {panel === "create" ? (
              <form onSubmit={onRegister} className="mt-6 space-y-3">
                <input
                  className={fieldClass}
                  type="email"
                  required
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {turnstileKey ? (
                  <Turnstile
                    siteKey={turnstileKey}
                    onSuccess={setTurnstileToken}
                  />
                ) : null}
                <button type="submit" className={btnPrimary} disabled={busy}>
                  Continue
                </button>
                <button
                  type="button"
                  className="text-sm text-[#018fa0]"
                  onClick={() => setPanel("signin")}
                >
                  Back
                </button>
              </form>
            ) : null}

            {panel === "create-otp" ? (
              <form onSubmit={onRegisterOtp} className="mt-6 space-y-3">
                <input
                  className={fieldClass}
                  inputMode="numeric"
                  pattern="\d{6}"
                  required
                  placeholder="Verification code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
                <button type="submit" className={btnPrimary} disabled={busy}>
                  Verify email
                </button>
              </form>
            ) : null}

            {panel === "set-password" ? (
              <form onSubmit={onSetPassword} className="mt-6 space-y-3">
                <input
                  className={fieldClass}
                  type="password"
                  required
                  minLength={12}
                  placeholder="Password (12+ characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <input
                  className={fieldClass}
                  type="password"
                  required
                  minLength={12}
                  placeholder="Confirm password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                />
                <button type="submit" className={btnPrimary} disabled={busy}>
                  Create account
                </button>
              </form>
            ) : null}

            {panel === "forgot" ? (
              <form onSubmit={onForgot} className="mt-6 space-y-3">
                <input
                  className={fieldClass}
                  type="email"
                  required
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {turnstileKey ? (
                  <Turnstile
                    siteKey={turnstileKey}
                    onSuccess={setTurnstileToken}
                  />
                ) : null}
                <button type="submit" className={btnPrimary} disabled={busy}>
                  Send reset link
                </button>
                <button
                  type="button"
                  className="text-sm text-[#018fa0]"
                  onClick={() => setPanel("signin")}
                >
                  Back
                </button>
              </form>
            ) : null}

            {panel === "forgot-sent" ? (
              <p className="mt-6 text-sm text-[#627c86]">
                If that email has a password, we sent reset instructions.
              </p>
            ) : null}

            {panel === "reset" ? (
              <form onSubmit={onReset} className="mt-6 space-y-3">
                <input
                  className={fieldClass}
                  type="password"
                  required
                  minLength={12}
                  placeholder="New password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <input
                  className={fieldClass}
                  type="password"
                  required
                  minLength={12}
                  placeholder="Confirm password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                />
                {turnstileKey ? (
                  <Turnstile
                    siteKey={turnstileKey}
                    onSuccess={setTurnstileToken}
                  />
                ) : null}
                <button type="submit" className={btnPrimary} disabled={busy}>
                  Reset password
                </button>
              </form>
            ) : null}

            <p className="mt-6 text-center text-xs text-[#627c86]">
              <Link to="/" className="text-[#018fa0]">
                Back to home
              </Link>
            </p>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
