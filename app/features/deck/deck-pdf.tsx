import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useId, useRef, useState, type FormEvent } from "react";

import { deckSendRequestSchema, type DeckSendResponse } from "../../../shared/deck-schema";
import { getTurnstileSiteKey } from "../../platform/env";
import {
  captureAnalytics,
  identifyAnalyticsUser,
  registerDeckRecipient,
} from "../analytics/analytics.client";
import { notePdf } from "./deck-activity";
import { recipientFromSearch } from "./deck-tracking";
import { DECK_VERSION } from "./slides";

const TURNSTILE_SITE_KEY =
  getTurnstileSiteKey() ?? (import.meta.env.DEV ? "1x00000000000000000000AA" : "");

/** What a refusal from /api/deck/send means to the person asking. */
const FAILURES: Record<string, string> = {
  invalid_request: "Check the address and try again.",
  undeliverable_email: "That address can't take mail. Try another.",
  too_many_requests: "We've sent it a few times already. Check your inbox, or try again later.",
};
const FAILED = "It didn't go out. Try again in a minute.";

type Status = "idle" | "sending" | "sent";

/**
 * "Download PDF": the deck goes out by email from hello@construct.computer
 * (functions/api/deck/send.ts), and the address becomes who this person is in
 * PostHog, so their replay and slide times carry it. The email links back to
 * the deck with the recipient id the reply names, which goes on the person
 * too, so opening that link on any device points back here. Opened from the
 * deck's bar (deck-viewer).
 */
export function DeckPdf({
  slide,
  open,
  onOpenChange,
}: {
  slide: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [problem, setProblem] = useState("");
  const [token, setToken] = useState("");
  const turnstile = useRef<TurnstileInstance | null>(null);
  const honeypot = useRef<HTMLInputElement>(null);
  const emailId = useId();

  function change(next: boolean) {
    onOpenChange(next);
    if (next) return;
    if (status === "sent") {
      setStatus("idle");
      setToken("");
    }
    setProblem("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const recipient = recipientFromSearch(window.location.search);
    const parsed = deckSendRequestSchema.safeParse({
      email,
      turnstileToken: token,
      ...(recipient ? { r: recipient } : {}),
      ...(honeypot.current?.value ? { honeypot: honeypot.current.value } : {}),
    });
    if (!parsed.success) {
      setProblem(FAILURES.invalid_request!);
      return;
    }
    setStatus("sending");
    setProblem("");
    captureAnalytics("deck_pdf_requested", { deck_version: DECK_VERSION, slide });

    let reason = "network";
    try {
      const response = await fetch("/api/deck/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (response.ok) {
        const reply = (await response.json().catch(() => null)) as DeckSendResponse | null;
        identifyAnalyticsUser({ id: parsed.data.email, email: parsed.data.email });
        if (reply?.r) registerDeckRecipient(reply.r);
        captureAnalytics("deck_pdf_sent", { deck_version: DECK_VERSION, slide });
        notePdf("sent", parsed.data.email.split("@")[1]);
        setEmail(parsed.data.email);
        setStatus("sent");
        return;
      }
      const body = (await response.json().catch(() => null)) as {
        error?: { code?: string };
      } | null;
      reason = body?.error?.code ?? `http_${response.status}`;
    } catch {
      // Offline or blocked; `reason` stays "network".
    }
    captureAnalytics("deck_pdf_failed", { deck_version: DECK_VERSION, slide, reason });
    notePdf("failed");
    setProblem(FAILURES[reason] ?? FAILED);
    setStatus("idle");
    // A Turnstile token works once.
    setToken("");
    turnstile.current?.reset();
  }

  return (
    <Dialog.Root open={open} onOpenChange={change}>
      <Dialog.Portal>
        <Dialog.Overlay className="beta-dialog-overlay fixed inset-0 z-[100] bg-black/50 backdrop-blur-[2px]" />
        <Dialog.Content
          aria-describedby={undefined}
          className="beta-dialog-content fixed top-1/2 left-1/2 z-[101] w-[calc(100%_-_2rem)] max-w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-[28px] bg-white px-8 pt-9 pb-8 text-center font-sans text-[#4e4646] shadow-[0_24px_80px_rgba(0,0,0,.35)] focus:outline-none"
        >
          <Dialog.Close
            aria-label="Close"
            className="absolute top-5 right-5 cursor-pointer rounded-full p-1 text-[#627c86] hover:bg-[#f3f3f3]"
          >
            <X aria-hidden className="size-5" />
          </Dialog.Close>

          {status === "sent" ? (
            <>
              <Dialog.Title className="text-balance text-[24px] leading-8 text-[#0d1630]">
                Sent to {email}
              </Dialog.Title>
              <Dialog.Close className="beta-access-cta mt-7 h-[52px] w-full text-lg">Done</Dialog.Close>
            </>
          ) : (
            <form onSubmit={submit} noValidate>
              <Dialog.Title className="text-balance text-[24px] leading-8 text-[#0d1630]">
                Get the deck as a PDF
              </Dialog.Title>
              <label htmlFor={emailId} className="sr-only">
                Email
              </label>
              <input
                id={emailId}
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                placeholder="you@fund.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-6 w-full rounded-full border border-[#d7dee2] bg-white px-5 py-3 text-base text-[#0d1630] outline-none placeholder:text-[#8a9aa2] focus:border-[#01b4c8]"
              />
              <input
                ref={honeypot}
                name="company"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden
                className="absolute -left-[9999px] size-px opacity-0"
              />
              {TURNSTILE_SITE_KEY ? (
                <div className="flex justify-center [&:has(iframe)]:mt-4">
                  <Turnstile
                    ref={turnstile}
                    siteKey={TURNSTILE_SITE_KEY}
                    options={{ action: "beta_signup", theme: "light", size: "normal", appearance: "interaction-only" }}
                    onSuccess={setToken}
                    onExpire={() => setToken("")}
                    onError={() => setToken("")}
                  />
                </div>
              ) : null}
              <button
                type="submit"
                disabled={status === "sending" || !token || !email.trim()}
                className="beta-access-cta mt-5 h-[52px] w-full text-lg disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === "sending" ? "Sending" : "Email me the PDF"}
              </button>
              {problem ? (
                <p role="alert" className="mt-3 text-sm text-[#b42318]">
                  {problem}
                </p>
              ) : null}
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
