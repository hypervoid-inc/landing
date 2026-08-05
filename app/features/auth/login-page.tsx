import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Turnstile } from "@marsidev/react-turnstile";

import { SiteFooter, SiteHeader } from "../../components/layout/site-layout";
import { Banner, buttonVariants } from "../../components/ui/primitives";
import { cn } from "../../lib/cn";
import * as authApi from "../../platform/api/auth";
import { getOsOrigin, getTurnstileSiteKey } from "../../platform/env";
import { AuthPanelFrame, PANEL_DEPTH } from "./auth-panel-frame";
import { AuthSignInForm } from "./auth-sign-in-form";
import { useAuth } from "./auth-provider";

type Panel =
  | "signin"
  | "create"
  | "create-otp"
  | "set-password"
  | "forgot"
  | "forgot-sent"
  | "reset";

const fieldClass = cn(
  "w-full rounded-[var(--radius-control)] border border-[var(--color-line)] bg-white",
  "px-3 py-2.5 text-sm text-[var(--color-ink)] outline-none",
  "transition-[border-color] duration-[var(--dur-hover)]",
  "placeholder:text-[var(--color-ink-subtle)] focus:border-[var(--color-brand)]",
);
const btnPrimary = cn(
  buttonVariants({ variant: "primary", full: true }),
  "min-h-11 no-underline",
);

export function LoginPage() {
  const { status, user, setUser, error: authError, clearError } = useAuth();
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
          <div className="overflow-visible rounded-2xl border border-[#dcecef] bg-white p-6 shadow-[0_8px_30px_rgba(37,72,82,.06)]">
            <h1 className="text-center font-geist text-2xl font-semibold tracking-tight text-[#4e4646]">
              Sign in
            </h1>
            <p className="mt-1 text-center text-sm text-[#627c86]">
              Same account as{" "}
              <a className="text-[#018fa0] underline" href={getOsOrigin()}>
                Construct OS
              </a>
              .
            </p>

            {panel !== "signin" && displayError ? (
              <Banner tone="error">{displayError}</Banner>
            ) : null}

            {panel === "signin" ? (
              <AuthSignInForm
                appearance="page"
                externalError={authError}
                footer={
                  <div className="flex justify-center gap-6 text-sm text-[#627c86]">
                    <button
                      type="button"
                      onClick={() => {
                        clearError();
                        setError(null);
                        setPanel("create");
                      }}
                      className="text-[#018fa0]"
                    >
                      Create account
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        clearError();
                        setError(null);
                        setPanel("forgot");
                      }}
                      className="text-[#018fa0]"
                    >
                      Forgot password
                    </button>
                  </div>
                }
              />
            ) : (
              <AuthPanelFrame
                panelKey={panel}
                depth={PANEL_DEPTH[panel] ?? 0}
                clip={false}
              >
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
              </AuthPanelFrame>
            )}

            <p className="mt-6 text-center text-xs text-[var(--color-ink-muted)]">
              <Link to="/" className="text-[var(--color-brand-strong)]">
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
