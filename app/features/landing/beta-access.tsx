import * as Dialog from "@radix-ui/react-dialog";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { X } from "lucide-react";
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

import { betaSignupSchema } from "../../../shared/beta-signup-schema";
import { captureAnalytics } from "../analytics/analytics.client";
import { usePrefersReducedMotion } from "./media";
import "./beta-access.css";

const BETA_URL = "https://os.construct.computer";
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

const BetaAccessContext = createContext<(source: string) => void>(
  () => undefined,
);

/**
 * Read-only companion to BetaAccessContext. Kept separate so widening it never
 * re-renders every BetaLink on the page each time the dialog opens.
 */
const BetaDialogOpenContext = createContext(false);

export function useBetaDialogOpen() {
  return useContext(BetaDialogOpenContext);
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
  /** Runs before the access branch, for callers that track their own funnel. */
  onClick?: () => void;
}) {
  const requestAccess = useContext(BetaAccessContext);
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onBeforeClick?.();
    if (hasBetaAccess()) {
      captureAnalytics("beta_opened", { source });
      return;
    }
    event.preventDefault();
    captureAnalytics("beta_access_opened", { source });
    requestAccess(source);
  };

  return (
    <a
      href={BETA_URL}
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

function BetaAccessDialog({
  open,
  source,
  onOpenChange,
}: {
  open: boolean;
  source: string;
  onOpenChange: (open: boolean) => void;
}) {
  const emailId = useId();
  const errorId = useId();
  const otherId = useId();
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const otherRef = useRef<HTMLInputElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const [phase, setPhase] = useState<"form" | "granting" | "success">("form");
  const [email, setEmail] = useState("");
  const [referral, setReferral] = useState("");
  const [other, setOther] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [steps, setSteps] = useState(0);

  useEffect(() => {
    if (phase !== "granting") return;
    const delays = reducedMotion ? [0, 100, 200] : [0, 900, 1800];
    const timers = delays.map((delay, index) =>
      window.setTimeout(() => setSteps(index + 1), delay),
    );
    timers.push(
      window.setTimeout(() => setPhase("success"), reducedMotion ? 300 : 2600),
    );
    return () => timers.forEach(window.clearTimeout);
  }, [phase, reducedMotion]);

  useEffect(() => {
    if (phase !== "form") return;
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
  }, [phase, email, referral]);

  const submit = async (event: FormEvent) => {
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
      const payload = betaSignupSchema.safeParse({
        email: normalized,
        ctaSource: source,
        referral,
        referralOther: referral === "other" ? other.trim() : undefined,
        turnstileToken,
        honeypot,
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
      setPhase("granting");
    } catch {
      setError("Something went wrong. Please try again.");
      setTurnstileToken("");
      turnstileRef.current?.reset();
    } finally {
      setSubmitting(false);
    }
  };

  const stepLabels = [
    `Verifying ${email.trim().toLowerCase()}`,
    "Provisioning your cloud computer",
    "Granting beta access",
  ];

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) =>
        phase === "form" || next ? onOpenChange(next) : undefined
      }
    >
      <Dialog.Portal>
        <Dialog.Overlay className="beta-dialog-overlay fixed inset-0 z-[100] bg-[#235061]/40 backdrop-blur-[2px]" />
        <Dialog.Content
          data-private
          onEscapeKeyDown={(event) =>
            phase !== "form" && event.preventDefault()
          }
          onPointerDownOutside={(event) =>
            phase !== "form" && event.preventDefault()
          }
          className="beta-dialog-content fixed left-1/2 top-1/2 z-[101] w-[calc(100%_-_2rem)] max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-[28px] border border-[#d9f8ff]/80 bg-white px-8 py-9 font-sans text-[#4e4646] shadow-[0_24px_80px_rgba(1,180,200,.18)] focus:outline-none"
        >
          {phase === "form" && (
            <>
              <Dialog.Close
                aria-label="Close dialog"
                className="absolute right-5 top-5 rounded-full p-1 text-[#627c86] hover:bg-[#f3f3f3] focus-visible:outline-2 focus-visible:outline-[#01b4c8]"
              >
                <X aria-hidden className="h-5 w-5" />
              </Dialog.Close>
              <Dialog.Title className="text-balance text-center text-[26px] leading-8">
                Get{" "}
                <span className="font-serif italic text-[#01b4c8]">
                  beta access
                </span>
              </Dialog.Title>
              <Dialog.Description className="mt-3 text-center text-[15px] leading-[21px] text-[#627c86]">
                Enter your email to continue.
              </Dialog.Description>
              <form
                data-ph-no-autocapture
                className="mt-7 space-y-4"
                onSubmit={submit}
              >
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
                  By continuing, you agree to receive transactional beta-access
                  email. See our{" "}
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
          )}
          {phase === "granting" && (
            <>
              <Dialog.Title className="text-center text-[22px] leading-7">
                Setting things up…
              </Dialog.Title>
              <Dialog.Description className="sr-only">
                Preparing beta access
              </Dialog.Description>
              <ul aria-live="polite" className="mt-8 space-y-4">
                {stepLabels.map((label, index) => (
                  <li
                    key={label}
                    className={`flex items-center gap-3 text-[15px] ${steps > index ? "text-[#4e4646]" : "text-[#becace] opacity-50"}`}
                  >
                    <span
                      aria-hidden
                      className={`grid h-6 w-6 place-items-center rounded-full text-xs ${steps > index ? "bg-[#4cd8ff] font-black text-white" : "border border-[#c5e8ef]"}`}
                    >
                      {steps > index ? "✓" : index + 1}
                    </span>
                    {label}
                  </li>
                ))}
              </ul>
            </>
          )}
          {phase === "success" && (
            <div className="text-center">
              <Dialog.Title className="text-balance text-2xl leading-[30px]">
                Beta access granted to{" "}
                <span className="font-serif italic text-[#01b4c8]">
                  {email.trim().toLowerCase()}
                </span>
              </Dialog.Title>
              <Dialog.Description className="mt-3 text-[15px] leading-[21px] text-[#627c86]">
                Your cloud computer is ready when you are.
              </Dialog.Description>
              <a
                href={BETA_URL}
                target="_blank"
                rel="noreferrer"
                onClick={() => {
                  captureAnalytics("beta_opened", { source });
                  onOpenChange(false);
                }}
                className="beta-access-cta mt-8 h-[52px] w-full text-lg"
              >
                Open Construct
              </a>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function BetaAccessProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState("unknown");

  return (
    <BetaAccessContext.Provider
      value={(nextSource) => {
        setSource(nextSource);
        setOpen(true);
      }}
    >
      <BetaDialogOpenContext.Provider value={open}>
        {children}
        {open && (
          <BetaAccessDialog open source={source} onOpenChange={setOpen} />
        )}
      </BetaDialogOpenContext.Provider>
    </BetaAccessContext.Provider>
  );
}
