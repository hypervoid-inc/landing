import * as Dialog from "@radix-ui/react-dialog";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { Cloud, FolderOpen, History, X } from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router";

import canvasConfetti from "canvas-confetti";

const confetti = (overrides?: Parameters<typeof canvasConfetti>[0]) =>
  canvasConfetti({ particleCount: 200, spread: 360, ...overrides });

if (typeof document !== "undefined") {
  (window as unknown as Record<string, unknown>).confetti = confetti;
}

import { betaSignupSchema } from "../../../shared/beta-signup-schema";
import { getOsOrigin } from "../../platform/env";
import { AuthSignInForm } from "../auth/auth-sign-in-form";
import { useAuth } from "../auth/auth-provider";
import {
  clearPostLoginWelcome,
  consumePostLoginWelcome,
  peekPostLoginWelcome,
  shouldOpenPostLoginWelcomePreview,
} from "../auth/post-login-welcome";
import { captureAnalytics } from "../analytics/analytics.client";
import { readAttributionCookie } from "../analytics/campaign-attribution.client";
import { usePrefersReducedMotion } from "./media";
import "./beta-access.css";

const STORAGE_KEY = "construct_beta_access_v1";
const TURNSTILE_SITE_KEY =
  import.meta.env.VITE_TURNSTILE_SITE_KEY ||
  (import.meta.env.DEV ? "1x00000000000000000000AA" : "");
const referrals = [
  ["twitter", "X / Twitter"],
  ["reddit", "Reddit"],
  ["hackernews", "Hacker News"],
  ["producthunt", "Product Hunt"],
  ["linkedin", "LinkedIn"],
  ["discord", "Discord"],
  ["other", "Other"],
] as const;

export type AccessDialogMode = "auth" | "updates";

/**
 * `start` reframes the auth dialog for people who have never had an account —
 * campaign traffic landing on /launch. Same Google + email-code plumbing; it
 * only stops the copy from implying a prior Construct OS account is required.
 */
export type AccessDialogIntent = "signin" | "start";

export type OpenAccessDialogOptions = {
  mode: AccessDialogMode;
  source: string;
  plan?: string;
  intent?: AccessDialogIntent;
};

type OpenAccessDialog = (options: OpenAccessDialogOptions) => void;

const BetaAccessContext = createContext<OpenAccessDialog>(() => undefined);

/**
 * Read-only companion to BetaAccessContext. Kept separate so widening it never
 * re-renders every BetaLink on the page each time the dialog opens.
 */
const BetaDialogOpenContext = createContext(false);

export function useBetaDialogOpen() {
  return useContext(BetaDialogOpenContext);
}

export function useOpenAccessDialog(): OpenAccessDialog {
  return useContext(BetaAccessContext);
}

export function hasBetaAccess() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as {
      granted?: unknown;
    } | null;
    return value?.granted === true;
  } catch {
    return false;
  }
}

/**
 * Warm CTAs: hero, header, workflows, Clippy, blog. Anonymous users get the
 * on-site auth dialog; signed-in users go straight to OS.
 */
export function StartLink({
  children,
  className = "",
  label,
  source = "unknown",
  authedChildren,
  intent,
  onClick: onBeforeClick,
}: {
  children: ReactNode;
  className?: string;
  label?: string;
  source?: string;
  /** When signed in, render this instead of `children` (e.g. "Open OS"). */
  authedChildren?: ReactNode;
  /** `start` = audience has no account yet (campaign landing pages). */
  intent?: AccessDialogIntent;
  onClick?: () => void;
}) {
  const { status } = useAuth();
  const openDialog = useContext(BetaAccessContext);
  const osOrigin = getOsOrigin();
  const authenticated = status === "authenticated";

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onBeforeClick?.();
    if (authenticated) {
      captureAnalytics("app_opened", { source });
      return;
    }
    event.preventDefault();
    captureAnalytics("auth_dialog_opened", {
      source,
      ...(intent ? { intent } : {}),
    });
    openDialog({ mode: "auth", source, intent });
  };

  return (
    <a
      href={osOrigin}
      target={authenticated ? "_blank" : undefined}
      rel={authenticated ? "noreferrer" : undefined}
      aria-label={label}
      className={className}
      onClick={onClick}
    >
      {authenticated && authedChildren != null ? authedChildren : children}
    </a>
  );
}

/**
 * Email capture for cold surfaces (footer product updates). Keeps referral
 * source; opens updates mode of the shared dialog chrome.
 */
export function BetaLink({
  children,
  className = "",
  label,
  source = "unknown",
  onClick: onBeforeClick,
}: {
  children: ReactNode;
  className?: string;
  label?: string;
  source?: string;
  onClick?: () => void;
}) {
  const openDialog = useContext(BetaAccessContext);
  const osOrigin = getOsOrigin();
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onBeforeClick?.();
    if (hasBetaAccess()) {
      captureAnalytics("beta_opened", { source });
      return;
    }
    event.preventDefault();
    captureAnalytics("beta_access_opened", { source });
    openDialog({ mode: "updates", source });
  };

  return (
    <a
      href={osOrigin}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className={className}
      onClick={onClick}
    >
      {children}
    </a>
  );
}

function errorMessage(code?: string) {
  if (code === "invalid_email") return "Please enter a valid email address.";
  if (code === "disposable_email")
    return "Please use a non-disposable email address.";
  if (code === "no_mx") return "That email domain doesn't look valid.";
  if (code === "mailbox_not_found")
    return "We couldn't verify that email address. Check for typos or use your work email.";
  if (code === "verification_unavailable")
    return "Email verification is temporarily unavailable. Please try again in a moment.";
  if (code === "invalid_referral_source")
    return "Please tell us where you heard about Construct.";
  if (code === "rate_limited")
    return "Too many attempts. Please try again in a little while.";
  if (code === "verification_failed")
    return "Please complete the verification and try again.";
  if (code === "origin_rejected") return "This signup page is not trusted.";
  if (code === "payload_too_large" || code === "invalid_request")
    return "Please check your email and referral details.";
  return "Signup is temporarily unavailable. Please try again soon.";
}

function AccessDialog({
  open,
  mode,
  source,
  plan,
  intent = "signin",
  initialPhase = "form",
  onOpenChange,
}: {
  open: boolean;
  mode: AccessDialogMode;
  source: string;
  plan?: string;
  intent?: AccessDialogIntent;
  initialPhase?: "form" | "success";
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const emailId = useId();
  const errorId = useId();
  const otherId = useId();
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const otherRef = useRef<HTMLInputElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const [phase, setPhase] = useState<"form" | "success">(initialPhase);
  const [email, setEmail] = useState("");
  const [referral, setReferral] = useState("");
  const [other, setOther] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const osOrigin = getOsOrigin();
  const welcomeShown = useRef(false);

  useEffect(() => {
    if (mode !== "updates" || phase !== "form") return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key === "Tab" || e.key === "Escape" || e.key === "Enter") return;
      const filled = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email.trim().toLowerCase(),
      );
      if (referral === "other" && filled) {
        otherRef.current?.focus();
      } else {
        emailRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [mode, phase, email, referral]);

  useEffect(() => {
    if (phase !== "success" || reducedMotion) return;
    const colors = [
      "#01b4c8",
      "#4cd8ff",
      "#d9f8ff",
      "#4e4646",
      "#627c86",
      "#ffffff",
    ];
    const side = (x: number, count: number) =>
      confetti({
        particleCount: count,
        spread: 74,
        ticks: 140,
        gravity: 0.82,
        decay: 0.92,
        startVelocity: 38,
        origin: { x, y: 0.68 },
        colors,
      });

    side(0, 90);
    side(1, 90);
    confetti({
      particleCount: 120,
      spread: 110,
      startVelocity: 48,
      ticks: 140,
      gravity: 0.9,
      decay: 0.91,
      origin: { x: 0.5, y: 0.52 },
      colors,
    });

    const burst = window.setTimeout(() => {
      side(0.15, 55);
      side(0.85, 55);
    }, 200);
    const finale = window.setTimeout(() => {
      confetti({
        particleCount: 80,
        spread: 360,
        startVelocity: 28,
        ticks: 160,
        gravity: 0.75,
        decay: 0.94,
        origin: { x: 0.5, y: 0.45 },
        colors,
      });
    }, 420);

    return () => {
      window.clearTimeout(burst);
      window.clearTimeout(finale);
    };
  }, [phase, reducedMotion]);

  useEffect(() => {
    if (mode !== "auth" || phase !== "success" || welcomeShown.current) return;
    welcomeShown.current = true;
    captureAnalytics("post_login_welcome_shown", { source });
  }, [mode, phase, source]);

  const dismissWelcome = () => {
    if (mode === "auth" && phase === "success") {
      captureAnalytics("post_login_welcome_dismissed", { source });
    }
    onOpenChange(false);
  };

  const handleAuthSuccess = () => {
    // In-dialog success owns the welcome UI; drop the leave-bridge flag.
    clearPostLoginWelcome();
    if (plan) {
      onOpenChange(false);
      navigate(`/account?plan=${plan}`, { replace: true });
      return;
    }
    setPhase("success");
  };

  const submitUpdates = async (event: FormEvent) => {
    event.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ||
      normalized.length > 254
    ) {
      setError(errorMessage("invalid_email"));
      return;
    }
    if (
      !referral ||
      (referral === "other" &&
        (other.trim().length < 2 || other.trim().length > 120))
    ) {
      setError(
        referral === "other"
          ? "Please tell us where you heard about us."
          : errorMessage("invalid_referral_source"),
      );
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const attr = readAttributionCookie();
      const payload = betaSignupSchema.safeParse({
        email: normalized,
        ctaSource: source,
        referral,
        referralOther: referral === "other" ? other.trim() : undefined,
        turnstileToken,
        honeypot,
        meta: {
          subscribedVia: "landing_footer",
          ...(attr?.r ? { campaignRef: attr.r } : {}),
          ...(attr?.c ? { campaignId: attr.c } : {}),
          ...(attr?.s ? { campaignSubscriberId: attr.s } : {}),
          ...(attr?.us ? { utmSource: attr.us } : {}),
          ...(attr?.um ? { utmMedium: attr.um } : {}),
          ...(attr?.uc ? { utmCampaign: attr.uc } : {}),
          ...(attr?.uo ? { utmContent: attr.uo } : {}),
          ...(attr?.p ? { promoCode: attr.p } : {}),
          ...(attr?.lp ? { landingPath: attr.lp } : {}),
        },
      });
      if (!payload.success) {
        setError("Please check your email, referral, and verification.");
        return;
      }

      captureAnalytics("beta_signup_submitted", {
        source,
        referral_source: payload.data.referral,
      });
      const response = await fetch("/api/beta-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload.data),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: { code?: string };
        };
        setError(errorMessage(body.error?.code));
        setTurnstileToken("");
        turnstileRef.current?.reset();
        return;
      }
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ granted: true, grantedAt: Date.now() }),
        );
      } catch {
        // Browser storage is a convenience gate, not access control.
      }
      captureAnalytics("beta_signup_granted", {
        source,
        referral_source: payload.data.referral,
      });
      setPhase("success");
    } catch {
      setError("Something went wrong. Please try again.");
      setTurnstileToken("");
      turnstileRef.current?.reset();
    } finally {
      setSubmitting(false);
    }
  };

  const canDismiss =
    phase === "form" || (mode === "auth" && phase === "success");
  const firstName =
    user?.displayName?.trim().split(/\s+/)[0] ||
    user?.username ||
    null;
  const successName =
    mode === "updates"
      ? email.trim().toLowerCase()
      : firstName;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!canDismiss && !next) return;
        if (!next) {
          dismissWelcome();
          return;
        }
        onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="beta-dialog-overlay fixed inset-0 z-[100] bg-[#235061]/40 backdrop-blur-[2px]" />
        <Dialog.Content
          onEscapeKeyDown={(event) => !canDismiss && event.preventDefault()}
          onPointerDownOutside={(event) => {
            // Welcome: force an intentional Stay / X — don't treat the dim
            // backdrop as dismiss.
            if (mode === "auth" && phase === "success") {
              event.preventDefault();
              return;
            }
            if (!canDismiss) event.preventDefault();
          }}
          onInteractOutside={(event) => {
            if (mode === "auth" && phase === "success") {
              event.preventDefault();
            }
          }}
          className="beta-dialog-content fixed left-1/2 top-1/2 z-[101] w-[calc(100%_-_2rem)] max-w-[420px] -translate-x-1/2 -translate-y-1/2 overflow-visible rounded-[28px] border border-[#d9f8ff]/80 bg-white px-8 py-9 font-sans text-[#4e4646] shadow-[0_24px_80px_rgba(1,180,200,.18)] focus:outline-none"
        >
          {phase === "form" && mode === "auth" ? (
            <>
              <Dialog.Close
                aria-label="Close dialog"
                className="absolute right-5 top-5 rounded-full p-1 text-[#627c86] hover:bg-[#f3f3f3]"
              >
                <X aria-hidden className="h-5 w-5" />
              </Dialog.Close>
              <Dialog.Title className="text-balance text-center text-[26px] leading-8">
                {intent === "start" ? (
                  <>
                    Create your{" "}
                    <span className="font-serif italic text-[#01b4c8]">
                      Construct
                    </span>{" "}
                    account
                  </>
                ) : (
                  <>
                    Start with{" "}
                    <span className="font-serif italic text-[#01b4c8]">
                      Construct
                    </span>
                  </>
                )}
              </Dialog.Title>
              <Dialog.Description className="mt-3 text-center text-[15px] leading-[21px] text-[#627c86]">
                {intent === "start"
                  ? "Continue with Google, or get a code by email. If you're new, this creates your account."
                  : "Sign in with the same account you use for Construct OS."}
              </Dialog.Description>
              <AuthSignInForm
                appearance="dialog"
                onSuccess={handleAuthSuccess}
                postLoginWelcome={{ source, plan }}
              />
              <p className="mt-4 text-center text-[12px] leading-[17px] text-[#627c86]">
                {intent === "start" ? (
                  <>
                    Already have an account? The same buttons sign you in.{" "}
                    <a
                      href={plan ? `/login?plan=${plan}` : "/login"}
                      className="whitespace-nowrap text-[#01b4c8] underline underline-offset-2"
                    >
                      Full sign-in page
                    </a>
                  </>
                ) : (
                  <>
                    Need a password reset or to create an account?{" "}
                    <a
                      href={plan ? `/login?plan=${plan}` : "/login"}
                      className="whitespace-nowrap text-[#01b4c8] underline underline-offset-2"
                    >
                      Full sign-in page
                    </a>
                  </>
                )}
              </p>
            </>
          ) : null}

          {phase === "form" && mode === "updates" ? (
            <>
              <Dialog.Close
                aria-label="Close dialog"
                className="absolute right-5 top-5 rounded-full p-1 text-[#627c86] hover:bg-[#f3f3f3]"
              >
                <X aria-hidden className="h-5 w-5" />
              </Dialog.Close>
              <Dialog.Title className="text-balance text-center text-[26px] leading-8">
                Follow what{" "}
                <span className="font-serif italic text-[#01b4c8]">
                  Construct
                </span>{" "}
                ships
              </Dialog.Title>
              <Dialog.Description className="mt-3 text-center text-[15px] leading-[21px] text-[#627c86]">
                New capabilities, real agent runs, and what we learned building
                them. No drip sequence.
              </Dialog.Description>
              <form className="mt-7 space-y-4" onSubmit={submitUpdates}>
                <label htmlFor={emailId} className="sr-only">
                  Email address
                </label>
                <input
                  ref={emailRef}
                  id={emailId}
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={submitting}
                  aria-invalid={!!error || undefined}
                  aria-describedby={error ? errorId : undefined}
                  className="h-11 w-full rounded-xl border border-[#c5e8ef] bg-[#f8feff] px-3 text-[15px] outline-none focus:border-[#01b4c8]"
                  placeholder="you@company.com"
                />
                <fieldset className="space-y-2.5">
                  <legend className="text-sm leading-5 text-[#627c86]">
                    Where did you learn about Construct?
                  </legend>
                  <div className="flex flex-wrap gap-1.5">
                    {referrals.map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={referral === id}
                        disabled={submitting}
                        onClick={() => setReferral(id)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium ${referral === id ? "border-[#4cd8ff] bg-[#4cd8ff] font-black text-white" : "border-[#c5e8ef] bg-[#f8feff]"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {referral === "other" && (
                    <>
                      <label htmlFor={otherId} className="sr-only">
                        Where did you hear about us?
                      </label>
                      <input
                        ref={otherRef}
                        id={otherId}
                        value={other}
                        onChange={(event) => setOther(event.target.value)}
                        className="h-11 w-full rounded-xl border border-[#c5e8ef] bg-[#f8feff] px-3 text-[15px] outline-none focus:border-[#01b4c8]"
                        placeholder="Where did you hear about us?"
                      />
                    </>
                  )}
                </fieldset>
                <div className="absolute -left-[10000px]" aria-hidden="true">
                  <label htmlFor={`${emailId}-website`}>Website</label>
                  <input
                    id={`${emailId}-website`}
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={honeypot}
                    onChange={(event) => setHoneypot(event.target.value)}
                  />
                </div>
                {TURNSTILE_SITE_KEY ? (
                  <Turnstile
                    ref={turnstileRef}
                    siteKey={TURNSTILE_SITE_KEY}
                    options={{
                      action: "beta_signup",
                      appearance: "interaction-only",
                      refreshExpired: "auto",
                      size: "flexible",
                      theme: "light",
                    }}
                    onSuccess={setTurnstileToken}
                    onExpire={() => setTurnstileToken("")}
                    onError={() => {
                      setTurnstileToken("");
                      setError(
                        "Verification is unavailable. Please try again.",
                      );
                    }}
                  />
                ) : (
                  <p role="alert" className="text-[13px] text-[#c44]">
                    Signup verification is not configured.
                  </p>
                )}
                <p className="text-[12px] leading-[17px] text-[#627c86]">
                  By continuing, you agree to receive product update email. See
                  our{" "}
                  <a
                    href="/privacy/"
                    className="text-[#01b4c8] underline underline-offset-2"
                  >
                    Privacy Policy
                  </a>
                  .
                </p>
                {error && (
                  <p
                    id={errorId}
                    role="alert"
                    className="text-[13px] leading-[18px] text-[#c44]"
                  >
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={
                    submitting ||
                    !turnstileToken ||
                    !referral ||
                    (referral === "other" &&
                      (other.trim().length < 2 || other.trim().length > 120))
                  }
                  className="beta-access-cta h-[52px] w-full text-lg disabled:opacity-60"
                >
                  {submitting ? "Submitting…" : "Continue"}
                </button>
              </form>
            </>
          ) : null}

          {phase === "success" && mode === "auth" ? (
            <div className="text-center">
              <Dialog.Close
                aria-label="Close dialog"
                className="absolute right-5 top-5 rounded-full p-1 text-[#627c86] hover:bg-[#f3f3f3]"
              >
                <X aria-hidden className="h-5 w-5" />
              </Dialog.Close>
              <Dialog.Title className="text-balance text-[26px] leading-8">
                Welcome
                {successName ? (
                  <>
                    ,{" "}
                    <span className="font-serif italic text-[#01b4c8]">
                      {successName}
                    </span>
                  </>
                ) : null}
              </Dialog.Title>
              <Dialog.Description className="mt-3 text-[15px] leading-[21px] text-[#627c86]">
                Construct OS is your persistent cloud workspace — agents, files,
                and work that keeps running.
              </Dialog.Description>
              <ul className="mt-6 space-y-3 text-left text-[14px] leading-5 text-[#4e4646]">
                <li className="flex gap-3">
                  <Cloud
                    aria-hidden
                    className="mt-0.5 size-[18px] shrink-0 text-[#01b4c8]"
                    strokeWidth={1.75}
                  />
                  <span>Always-on agents that keep working while you&apos;re away</span>
                </li>
                <li className="flex gap-3">
                  <FolderOpen
                    aria-hidden
                    className="mt-0.5 size-[18px] shrink-0 text-[#01b4c8]"
                    strokeWidth={1.75}
                  />
                  <span>Your files and browser in one place</span>
                </li>
                <li className="flex gap-3">
                  <History
                    aria-hidden
                    className="mt-0.5 size-[18px] shrink-0 text-[#01b4c8]"
                    strokeWidth={1.75}
                  />
                  <span>Pick up exactly where you left off</span>
                </li>
              </ul>
              {user && !user.onboardingCompleted ? (
                <p className="mt-4 text-[13px] leading-[18px] text-[#627c86]">
                  You&apos;ll finish setup there.
                </p>
              ) : null}
              <a
                href={osOrigin}
                onClick={() => {
                  captureAnalytics("post_login_welcome_os", { source });
                  captureAnalytics("app_opened", { source });
                }}
                className="beta-access-cta mt-8 h-[52px] w-full text-lg"
              >
                Open Construct OS
              </a>
              <button
                type="button"
                className="mt-3 w-full text-sm text-[#627c86] hover:text-[#01b4c8]"
                onClick={dismissWelcome}
              >
                Stay on the site
              </button>
            </div>
          ) : null}

          {phase === "success" && mode === "updates" ? (
            <div className="text-center">
              <Dialog.Title className="text-balance text-2xl leading-[30px]">
                You&apos;re on the list,{" "}
                <span className="font-serif italic text-[#01b4c8]">
                  {email.trim().toLowerCase()}
                </span>
              </Dialog.Title>
              <Dialog.Description className="mt-3 text-[15px] leading-[21px] text-[#627c86]">
                No need to wait for the next one. Construct is ready now.
              </Dialog.Description>
              <a
                href={osOrigin}
                target="_blank"
                rel="noreferrer"
                onClick={() => {
                  captureAnalytics("app_opened", { source });
                  onOpenChange(false);
                }}
                className="beta-access-cta mt-8 h-[52px] w-full text-lg"
              >
                Open Construct
              </a>
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function BetaAccessProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState("unknown");
  const [mode, setMode] = useState<AccessDialogMode>("auth");
  const [plan, setPlan] = useState<string | undefined>();
  const [intent, setIntent] = useState<AccessDialogIntent>("signin");
  const [initialPhase, setInitialPhase] = useState<"form" | "success">("form");
  const handledWelcome = useRef(false);
  const previewOpened = useRef(false);

  // Local-only: `?welcome=1` previews the handoff without auth.
  useEffect(() => {
    if (previewOpened.current) return;
    if (typeof window === "undefined") return;
    if (!shouldOpenPostLoginWelcomePreview(window.location.search)) return;
    previewOpened.current = true;
    queueMicrotask(() => {
      setMode("auth");
      setSource("url-preview");
      setPlan(undefined);
      setIntent("signin");
      setInitialPhase("success");
      setOpen(true);
    });
  }, []);

  useEffect(() => {
    if (status === "anonymous") {
      // Don't wipe a local URL preview — only clear leave-bridge flags.
      if (peekPostLoginWelcome()) clearPostLoginWelcome();
      handledWelcome.current = false;
      return;
    }
    if (status !== "authenticated" || handledWelcome.current) return;
    if (!peekPostLoginWelcome()) return;

    handledWelcome.current = true;
    const payload = consumePostLoginWelcome();
    if (!payload) return;

    if (payload.plan) {
      navigate(`/account?plan=${payload.plan}`, { replace: true });
      return;
    }

    // Defer past the effect body — opening the dialog is a reaction to auth
    // settling + sessionStorage, not derived render state.
    queueMicrotask(() => {
      setMode("auth");
      setSource(payload.source || "oauth-return");
      setPlan(undefined);
      setIntent("signin");
      setInitialPhase("success");
      setOpen(true);
    });
  }, [status, navigate]);

  return (
    <BetaAccessContext.Provider
      value={(options) => {
        setMode(options.mode);
        setSource(options.source);
        setPlan(options.plan);
        setIntent(options.intent ?? "signin");
        setInitialPhase("form");
        setOpen(true);
      }}
    >
      <BetaDialogOpenContext.Provider value={open}>
        {children}
        {open && (
          <AccessDialog
            key={`${mode}-${source}-${plan ?? ""}-${intent}-${initialPhase}`}
            open
            mode={mode}
            source={source}
            plan={plan}
            intent={intent}
            initialPhase={initialPhase}
            onOpenChange={setOpen}
          />
        )}
      </BetaDialogOpenContext.Provider>
    </BetaAccessContext.Provider>
  );
}
