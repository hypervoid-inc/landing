import { Turnstile } from "@marsidev/react-turnstile";
import { useState, type ReactNode } from "react";

import { buttonVariants } from "../../components/ui/primitives";
import { cn } from "../../lib/cn";
import * as authApi from "../../platform/api/auth";
import { getTurnstileSiteKey } from "../../platform/env";
import { AuthPanelFrame } from "./auth-panel-frame";
import { useAuth } from "./auth-provider";
import { markPostLoginWelcome } from "./post-login-welcome";

type SignInPanel = "signin" | "magic-otp";

function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={18}
      height={18}
      aria-hidden
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

const pageField = cn(
  "w-full rounded-[var(--radius-control)] border border-[var(--color-line)] bg-white",
  "px-3 py-2.5 text-sm text-[var(--color-ink)] outline-none",
  "transition-[border-color] duration-[var(--dur-hover)]",
  "placeholder:text-[var(--color-ink-subtle)]",
  "focus:border-[var(--color-brand)]",
);
const pagePrimary = cn(
  buttonVariants({ variant: "primary", full: true }),
  "relative z-0 min-h-11 no-underline",
);
const pageSecondary = cn(
  buttonVariants({ variant: "secondary", full: true }),
  "min-h-11 gap-2.5 no-underline",
);

const dialogField = cn(
  "h-11 w-full rounded-xl border border-[#c5e8ef] bg-[#f8feff] px-3 text-[15px] text-[#4e4646]",
  "outline-none transition-[border-color] placeholder:text-[#63afc2]",
  "focus:border-[#01b4c8]",
);
const dialogPrimary =
  "beta-access-cta relative z-0 h-[52px] w-full text-lg disabled:opacity-60";
const dialogSecondary =
  "inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-[#c5e8ef] bg-[#f8feff] text-[15px] font-semibold text-[#014e59] transition-colors hover:border-[#01b4c8] hover:bg-[#effbfc]";

export type AuthSignInFormProps = {
  /** Visual chrome: full login page vs beta dialog. */
  appearance?: "page" | "dialog";
  /** Extra links under the form (create account / forgot) — login page only. */
  footer?: ReactNode;
  /** Called after magic/password sign-in succeeds (Google leaves the page). */
  onSuccess?: () => void;
  /** Surface external error (e.g. auth provider return error). */
  externalError?: string | null;
  /**
   * When set (landing auth dialog), persist a welcome flag before Google or
   * magic-email leave so the OS handoff can reopen after return.
   */
  postLoginWelcome?: { source: string; plan?: string };
  className?: string;
};

/**
 * Google + email magic code + password — shared by /login and the on-site
 * auth dialog so those paths cannot drift apart.
 */
export function AuthSignInForm({
  appearance = "page",
  footer,
  onSuccess,
  externalError,
  postLoginWelcome,
  className,
}: AuthSignInFormProps) {
  const { setUser, clearError, refresh } = useAuth();
  const [panel, setPanel] = useState<SignInPanel>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [passwordMode, setPasswordMode] = useState(false);
  const turnstileKey = getTurnstileSiteKey();

  const field = appearance === "dialog" ? dialogField : pageField;
  const btnPrimary = appearance === "dialog" ? dialogPrimary : pagePrimary;
  const btnSecondary =
    appearance === "dialog" ? dialogSecondary : pageSecondary;
  const linkClass =
    appearance === "dialog"
      ? "text-sm text-[#01b4c8]"
      : "text-sm text-[#018fa0]";

  const displayError = error ?? externalError ?? null;

  function markWelcomeIfNeeded() {
    if (!postLoginWelcome) return;
    markPostLoginWelcome(postLoginWelcome);
  }

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
    // Email magic links leave the page; flag bridges the return.
    markWelcomeIfNeeded();
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
    onSuccess?.();
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
    onSuccess?.();
  }

  return (
    <div className={cn("text-center", className)}>
      {displayError ? (
        <p
          role="alert"
          className={
            appearance === "dialog"
              ? "mb-3 text-left text-[13px] leading-[18px] text-[#c44]"
              : "mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-left text-sm text-red-800"
          }
        >
          {displayError}
        </p>
      ) : null}

      <AuthPanelFrame
        panelKey={panel}
        depth={panel === "signin" ? 0 : 1}
        clip={false}
      >
        {panel === "signin" ? (
          <div
            className={
              appearance === "dialog" ? "mt-7 space-y-3" : "mt-6 space-y-3"
            }
          >
            <a
              href={authApi.getGoogleAuthUrl()}
              className={btnSecondary}
              onClick={() => markWelcomeIfNeeded()}
            >
              <GoogleLogo className="shrink-0" />
              Continue with Google
            </a>
            <form
              onSubmit={passwordMode ? onPasswordLogin : onMagicSend}
              className="space-y-3"
            >
              <input
                className={field}
                type="email"
                required
                placeholder={
                  appearance === "dialog" ? "you@company.com" : "Email"
                }
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus={appearance === "dialog"}
              />
              {passwordMode ? (
                <input
                  className={field}
                  type="password"
                  required
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              ) : null}
              {turnstileKey ? (
                <div className="flex w-full justify-center [&_.cf-turnstile]:mx-auto">
                  <Turnstile
                    siteKey={turnstileKey}
                    options={{
                      theme: "light",
                      size: "flexible",
                    }}
                    onSuccess={setTurnstileToken}
                  />
                </div>
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
              className={cn(linkClass, "mx-auto block")}
              onClick={() => setPasswordMode((v) => !v)}
            >
              {passwordMode ? "Use email code instead" : "Use password"}
            </button>
            {footer}
          </div>
        ) : null}

        {panel === "magic-otp" ? (
          <form
            onSubmit={onMagicVerify}
            className={
              appearance === "dialog" ? "mt-7 space-y-3" : "mt-6 space-y-3"
            }
          >
            <p className="text-sm text-[#627c86]">
              Enter the 6-digit code sent to {email}.
            </p>
            <input
              className={cn(field, "text-center tracking-[0.2em]")}
              inputMode="numeric"
              pattern="\d{6}"
              required
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              autoFocus
            />
            <button type="submit" className={btnPrimary} disabled={busy}>
              {busy ? "Please wait…" : "Verify"}
            </button>
            <button
              type="button"
              className={cn(linkClass, "mx-auto block")}
              onClick={() => setPanel("signin")}
            >
              Back
            </button>
          </form>
        ) : null}
      </AuthPanelFrame>
    </div>
  );
}
