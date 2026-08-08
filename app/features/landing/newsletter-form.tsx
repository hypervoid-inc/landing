import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { useId, useRef, useState, type FormEvent } from "react";

import { betaSignupSchema } from "../../../shared/beta-signup-schema";
import { captureAnalytics } from "../analytics/analytics.client";
import { readAttributionCookie } from "../analytics/campaign-attribution.client";

const STORAGE_KEY = "construct_beta_access_v1";
const TURNSTILE_SITE_KEY =
  import.meta.env.VITE_TURNSTILE_SITE_KEY ||
  (import.meta.env.DEV ? "1x00000000000000000000AA" : "");

function errorMessage(code?: string) {
  if (code === "invalid_email") return "Please enter a valid email address.";
  if (code === "verification_failed")
    return "Please complete the verification and try again.";
  if (code === "origin_rejected") return "This signup page is not trusted.";
  if (code === "rate_limited")
    return "Too many attempts. Please try again in a little while.";
  if (code === "payload_too_large" || code === "invalid_request")
    return "Please check your name and email.";
  return "Signup is temporarily unavailable. Please try again soon.";
}

/**
 * Inline footer newsletter signup — email + required person name + Turnstile.
 */
export function NewsletterForm() {
  const emailId = useId();
  const nameId = useId();
  const errorId = useId();
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const normalized = email.trim().toLowerCase();
    if (!normalized || !normalized.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!TURNSTILE_SITE_KEY) {
      setError("Signup is temporarily unavailable. Please try again soon.");
      return;
    }

    setSubmitting(true);
    try {
      const attr = readAttributionCookie();
      const payload = betaSignupSchema.safeParse({
        email: normalized,
        name: name.trim(),
        ctaSource: "footer",
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
        setError("Please enter your name and a valid email.");
        return;
      }

      captureAnalytics("beta_signup_submitted", { source: "footer" });
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
        // Convenience gate only.
      }
      captureAnalytics("beta_signup_granted", { source: "footer" });
      setDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
      setTurnstileToken("");
      turnstileRef.current?.reset();
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <p className="mt-1 max-w-[280px] text-left text-[13px] leading-[1.55] text-[#014e59] sm:max-w-xs sm:text-sm">
        You&apos;re on the list
        {email.trim() ? (
          <>
            , <span className="font-medium">{email.trim().toLowerCase()}</span>
          </>
        ) : null}
        .
      </p>
    );
  }

  return (
    <form
      className="mt-1 flex w-full max-w-[280px] flex-col gap-2 sm:max-w-xs"
      onSubmit={onSubmit}
      noValidate
    >
      <label className="sr-only" htmlFor={nameId}>
        Name
      </label>
      <input
        id={nameId}
        name="name"
        type="text"
        autoComplete="name"
        required
        maxLength={200}
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-full border border-[#d7dee2] bg-white px-4 py-2.5 text-[13px] text-[#4e4646] outline-none placeholder:text-[#8a9aa2] focus:border-[#01b4c8]"
      />
      <label className="sr-only" htmlFor={emailId}>
        Email address
      </label>
      <input
        id={emailId}
        name="email"
        type="email"
        autoComplete="email"
        required
        maxLength={254}
        placeholder="you@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-full border border-[#d7dee2] bg-white px-4 py-2.5 text-[13px] text-[#4e4646] outline-none placeholder:text-[#8a9aa2] focus:border-[#01b4c8]"
      />
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        className="absolute -left-[9999px] h-px w-px overflow-hidden opacity-0"
      />
      {TURNSTILE_SITE_KEY ? (
        <div className="flex justify-start [&_.cf-turnstile]:origin-left [&_.cf-turnstile]:scale-[0.85]">
          <Turnstile
            ref={turnstileRef}
            siteKey={TURNSTILE_SITE_KEY}
            options={{ action: "beta_signup", theme: "light", size: "normal" }}
            onSuccess={setTurnstileToken}
            onExpire={() => setTurnstileToken("")}
            onError={() => {
              setTurnstileToken("");
              setError("Please complete the verification and try again.");
            }}
          />
        </div>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-left text-[12px] text-[#b42318]">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={submitting || !turnstileToken || !TURNSTILE_SITE_KEY}
        className="site-cta inline-flex w-full items-center justify-center rounded-full bg-black px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_4px_rgba(0,0,0,.15)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Subscribing…" : "Subscribe"}
      </button>
      <p className="text-left text-[11px] leading-[1.45] text-[#8a9aa2]">
        Product updates only. No drip sequence.
      </p>
    </form>
  );
}
