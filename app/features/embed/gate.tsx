import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { ArrowRight } from "lucide-react";
import { useId, useRef, useState, type FormEvent } from "react";

import { embedSessionRequestSchema } from "../../../shared/embed-schema";
import { getTurnstileSiteKey } from "../../platform/env";
import { captureAnalytics } from "../analytics/analytics.client";
import { useClock } from "./chrome";
import { ERROR_COPY, LOCK_COPY } from "./copy";
import { EmbedMascot } from "./mascot";
import { startSession } from "./session-client";

const TURNSTILE_SITE_KEY =
  getTurnstileSiteKey() ?? (import.meta.env.DEV ? "1x00000000000000000000AA" : "");

export type LockPhase = "form" | "settingUp" | "leaving";

function todayLabel(): string {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

/**
 * The lock screen of Construct's computer: the clock, and a card that asks
 * for a first name. The Turnstile check stays invisible unless Cloudflare
 * needs a click. Once the session exists the card shows the computer being
 * set up, then the whole screen slides away like the real OS's.
 */
export function LockScreen({
  src,
  framed,
  phase,
  firstName,
  onStarted,
}: {
  src: string;
  framed: boolean;
  phase: LockPhase;
  firstName: string;
  onStarted: (session: { token: string; firstName: string; turnsLeft: number }) => void;
}) {
  const nameId = useId();
  const clock = useClock();
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const [name, setName] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const payload = embedSessionRequestSchema.safeParse({
      name: name.trim(),
      src,
      turnstileToken,
      honeypot,
    });
    if (!payload.success) {
      setError(ERROR_COPY.invalid_request!);
      return;
    }
    setSubmitting(true);
    captureAnalytics("embed_lead_submitted", { src, framed });
    const result = await startSession(payload.data);
    setSubmitting(false);
    if (!result.ok) {
      setError(ERROR_COPY[result.code] ?? ERROR_COPY.internal_error!);
      setTurnstileToken("");
      turnstileRef.current?.reset();
      return;
    }
    captureAnalytics("embed_session_started", { src, framed });
    onStarted(result);
  };

  const ready = Boolean(turnstileToken) && Boolean(TURNSTILE_SITE_KEY);

  return (
    <div className="embed-lock" data-phase={phase}>
      <div className="embed-lock-clock" aria-hidden>
        <span className="embed-lock-date">{todayLabel()}</span>
        <span className="embed-lock-time">{clock}</span>
      </div>
      {phase === "form" ? (
        <form className="embed-lock-card ph-no-capture" onSubmit={onSubmit} noValidate>
          <div className="embed-lock-head">
            <EmbedMascot mood="happy" working={false} className="embed-lock-mascot" />
            <div>
              <h1 className="embed-lock-title">{LOCK_COPY.title}</h1>
              <p className="embed-lock-body">{LOCK_COPY.body}</p>
            </div>
          </div>
          <div className="embed-lock-row">
            <label className="sr-only" htmlFor={nameId}>
              {LOCK_COPY.name}
            </label>
            <input
              id={nameId}
              name="name"
              type="text"
              autoComplete="given-name"
              required
              maxLength={80}
              placeholder={LOCK_COPY.name}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="embed-lock-input"
            />
            <button
              type="submit"
              className="embed-lock-button"
              disabled={submitting || !ready || !name.trim()}
              aria-busy={submitting || undefined}
            >
              {submitting || !ready ? LOCK_COPY.checking : LOCK_COPY.unlock}
              {!submitting && ready ? <ArrowRight size={14} strokeWidth={2.6} aria-hidden /> : null}
            </button>
          </div>
          <input
            type="text"
            name="company"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden
            value={honeypot}
            onChange={(event) => setHoneypot(event.target.value)}
            className="embed-honeypot"
          />
          {TURNSTILE_SITE_KEY ? (
            <div className="embed-turnstile">
              <Turnstile
                ref={turnstileRef}
                siteKey={TURNSTILE_SITE_KEY}
                options={{
                  action: "beta_signup",
                  theme: "light",
                  size: "normal",
                  appearance: "interaction-only",
                }}
                onSuccess={setTurnstileToken}
                onExpire={() => setTurnstileToken("")}
                onError={() => {
                  setTurnstileToken("");
                  setError(ERROR_COPY.verification_failed!);
                }}
              />
            </div>
          ) : null}
          {error ? (
            <p className="embed-lock-error" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      ) : (
        <div className="embed-lock-card embed-lock-setup" role="status">
          <EmbedMascot mood="neutral" working className="embed-lock-mascot" />
          <p className="embed-lock-setup-line">{LOCK_COPY.settingUp(firstName)}</p>
          <span className="embed-lock-bar">
            <span />
          </span>
        </div>
      )}
    </div>
  );
}
