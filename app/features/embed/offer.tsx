import { Check, Copy } from "lucide-react";
import { useId, useState, type FormEvent } from "react";

import { embedClaimRequestSchema } from "../../../shared/embed-schema";
import { captureAnalytics } from "../analytics/analytics.client";
import { EmbedMascot } from "./mascot";
import { ERROR_COPY, OFFER_COPY, WALL_COPY } from "./copy";
import { claimOffer } from "./session-client";

/**
 * The exit offer: once the person has seen Construct work, their email
 * buys a code for a free first month of the top plan. Shown over the
 * desktop when the shift ends, when they reach for the exit, or when they
 * click through to the product.
 */
export function Offer({
  token,
  firstName,
  src,
  framed,
  href,
  onDismiss,
}: {
  token: string;
  firstName: string;
  src: string;
  framed: boolean;
  href: string;
  onDismiss: (() => void) | null;
}) {
  const emailId = useId();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const payload = embedClaimRequestSchema.safeParse({
      token,
      email: email.trim().toLowerCase(),
      ...(firstName ? { name: firstName } : {}),
    });
    if (!payload.success) {
      setError(ERROR_COPY.invalid_email!);
      return;
    }
    setBusy(true);
    captureAnalytics("embed_email_submitted", { src, framed });
    const result = await claimOffer(payload.data);
    setBusy(false);
    if (!result.ok) {
      setError(ERROR_COPY[result.code] ?? ERROR_COPY.internal_error!);
      return;
    }
    captureAnalytics("embed_code_revealed", { src, framed });
    setCode(result.code);
  };

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      captureAnalytics("embed_code_copied", { src, framed });
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // The code is on screen; a blocked clipboard changes nothing.
    }
  };

  return (
    <section className="embed-offer ph-no-capture" aria-label={OFFER_COPY.eyebrow}>
      <div className="embed-offer-head">
        <EmbedMascot mood="happy" working={false} className="embed-offer-mascot" />
        <div>
          <p className="embed-offer-eyebrow">{OFFER_COPY.eyebrow}</p>
          <h2 className="embed-offer-title">{OFFER_COPY.title}</h2>
        </div>
      </div>
      {code ? (
        <div className="embed-offer-code">
          <span className="embed-offer-code-label">{OFFER_COPY.codeLabel}</span>
          <span className="embed-offer-code-row">
            <code className="embed-offer-code-value">{code}</code>
            <button type="button" className="embed-offer-copy" onClick={() => void copy()}>
              {copied ? <Check size={13} strokeWidth={3} aria-hidden /> : <Copy size={13} strokeWidth={2.4} aria-hidden />}
              {copied ? OFFER_COPY.copied : OFFER_COPY.copy}
            </button>
          </span>
          <a
            className="embed-button embed-button-primary"
            href={href}
            target="_blank"
            rel="noreferrer"
            onClick={() => captureAnalytics("embed_cta_clicked", { src, framed, position: "offer" })}
          >
            {OFFER_COPY.redeem}
          </a>
          <p className="embed-offer-fine">{OFFER_COPY.fine}</p>
        </div>
      ) : (
        <form className="embed-offer-form" onSubmit={onSubmit} noValidate>
          <p className="embed-offer-body">{OFFER_COPY.body}</p>
          <div className="embed-offer-row">
            <label className="sr-only" htmlFor={emailId}>
              Email address
            </label>
            <input
              id={emailId}
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              placeholder={OFFER_COPY.email}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="embed-offer-input"
            />
            <button type="submit" className="embed-button embed-button-primary" disabled={busy || !email.trim()} aria-busy={busy || undefined}>
              {busy ? OFFER_COPY.sending : OFFER_COPY.submit}
            </button>
          </div>
          {error ? (
            <p className="embed-offer-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="embed-offer-foot">
            <span className="embed-offer-fine">{OFFER_COPY.fine}</span>
            {onDismiss ? (
              <button type="button" className="embed-offer-later" onClick={onDismiss}>
                {OFFER_COPY.later}
              </button>
            ) : (
              <a className="embed-offer-later" href={href} target="_blank" rel="noreferrer">
                {WALL_COPY.cta}
              </a>
            )}
          </div>
        </form>
      )}
    </section>
  );
}
