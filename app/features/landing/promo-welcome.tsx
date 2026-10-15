import * as Dialog from "@radix-ui/react-dialog";
import canvasConfetti from "canvas-confetti";
import { Check, Copy, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";

import { useAuth } from "../auth/auth-provider";
import { captureAnalytics } from "../analytics/analytics.client";
import { writePromoCode } from "../analytics/campaign-attribution.client";
import { useOpenAccessDialog } from "./beta-access";
import { usePrefersReducedMotion } from "./media";

/**
 * A link that carries `?promo=CODE` (or `?code=`), such as "Start tonight" on
 * the Night Shift show in an X post, lands here with a welcome: the code,
 * what it gets you, and one button into checkout. The code itself already
 * rides the attribution cookie to checkout (campaign-attribution.ts); this
 * makes it visible. Shown once per code per tab.
 */

const PROMO_PATTERN = /^[A-Z0-9]{4,16}$/;
const SEEN_KEY = "construct.landing.promoWelcome";

type Offer = {
  title: [string, string];
  line: string;
  /** Straight into checkout on this plan; without one, the pricing page. */
  plan?: "pro";
  cta: string;
};

const OFFERS: Record<string, Offer> = {
  FREEMONTH: {
    title: ["Your free month is", "ready"],
    line: "Your first month of Construct Pro is on us. The code is saved on this browser, so checkout applies it for you.",
    plan: "pro",
    cta: "Claim my free month",
  },
  LAUNCH20: {
    title: ["Your launch discount is", "ready"],
    line: "20% off Construct Pro, billed monthly. The code is saved on this browser, so checkout applies it for you.",
    plan: "pro",
    cta: "Start Pro with 20% off",
  },
};

function offerFor(code: string): Offer {
  return (
    OFFERS[code] ?? {
      title: ["Your code is", "saved"],
      line: "It's saved on this browser and applied when you check out.",
      cta: "See plans",
    }
  );
}

function promoFromSearch(search: string): string | null {
  const params = new URLSearchParams(search);
  const raw = (params.get("promo") ?? params.get("code") ?? "")
    .trim()
    .toUpperCase();
  return PROMO_PATTERN.test(raw) ? raw : null;
}

function alreadySeen(code: string): boolean {
  try {
    return sessionStorage.getItem(SEEN_KEY) === code;
  } catch {
    return false;
  }
}

function markSeen(code: string): void {
  try {
    sessionStorage.setItem(SEEN_KEY, code);
  } catch {
    // Without storage a reload shows the welcome again, which is harmless.
  }
}

export function PromoWelcome() {
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const claimRef = useRef<HTMLButtonElement>(null);
  const { status } = useAuth();
  const openAccess = useOpenAccessDialog();
  const navigate = useNavigate();
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const found = promoFromSearch(window.location.search);
    if (!found || alreadySeen(found)) return;
    markSeen(found);
    // Analytics already stores it on load; this keeps it even when that
    // first touch was taken by an earlier campaign.
    writePromoCode(found);
    captureAnalytics("promo_welcome_shown", { code: found });
    queueMicrotask(() => setCode(found));
  }, []);

  useEffect(() => {
    if (!code || reducedMotion) return;
    const timer = window.setTimeout(() => {
      void canvasConfetti({
        particleCount: 90,
        spread: 70,
        startVelocity: 38,
        origin: { y: 0.32 },
        colors: ["#01b4c8", "#ffd23f", "#ff6154", "#ffffff"],
        // Over the dimmed page, under the card, so it never covers the text.
        zIndex: 100,
      });
    }, 220);
    return () => window.clearTimeout(timer);
  }, [code, reducedMotion]);

  if (!code) return null;
  const offer = offerFor(code);

  const close = () => {
    captureAnalytics("promo_welcome_dismissed", { code });
    setCode(null);
  };

  const claim = () => {
    captureAnalytics("promo_welcome_claimed", {
      code,
      signed_in: status === "authenticated",
    });
    setCode(null);
    if (!offer.plan) {
      navigate("/pricing/");
      return;
    }
    // Signed in: straight to checkout. Otherwise the sign-up dialog, which
    // lands on the same checkout once the account exists.
    if (status === "authenticated") navigate(`/account/?plan=${offer.plan}`);
    else
      openAccess({
        source: "promo-welcome",
        plan: offer.plan,
        intent: "start",
      });
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      captureAnalytics("promo_welcome_copied", { code });
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // The code stays on screen to copy by hand.
    }
  };

  return (
    <Dialog.Root open onOpenChange={(next) => (next ? undefined : close())}>
      <Dialog.Portal>
        <Dialog.Overlay className="beta-dialog-overlay fixed inset-0 z-[100] bg-[#235061]/40 backdrop-blur-[2px]" />
        <Dialog.Content
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            claimRef.current?.focus({ preventScroll: true });
          }}
          className="beta-dialog-content fixed left-1/2 top-1/2 z-[101] w-[calc(100%_-_2rem)] max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-[28px] border border-[#d9f8ff]/80 bg-white px-8 pb-8 pt-9 text-center font-sans text-[#4e4646] shadow-[0_24px_80px_rgba(1,180,200,.18)] focus:outline-none"
        >
          <Dialog.Close
            aria-label="Close dialog"
            className="absolute right-5 top-5 rounded-full p-1 text-[#627c86] hover:bg-[#f3f3f3]"
          >
            <X aria-hidden className="h-5 w-5" />
          </Dialog.Close>
          <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#01b4c8]">
            Welcome in
          </p>
          <Dialog.Title className="mt-2 text-balance text-[26px] leading-8">
            {offer.title[0]}{" "}
            <span className="font-serif italic text-[#01b4c8]">
              {offer.title[1]}
            </span>
          </Dialog.Title>
          <Dialog.Description className="mt-3 text-pretty text-[15px] leading-[21px] text-[#627c86]">
            {offer.line}
          </Dialog.Description>

          <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-[#9fe6ef] bg-[#f3fdff] py-3 pl-5 pr-3">
            <span className="font-mono text-[20px] font-semibold tracking-[0.12em] text-[#235061]">
              {code}
            </span>
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[13px] font-medium text-[#235061] shadow-[0_1px_0_rgba(35,80,97,.12),0_0_0_1px_rgba(35,80,97,.12)] hover:text-[#01b4c8]"
            >
              {copied ? (
                <Check aria-hidden className="h-4 w-4 text-[#01b4c8]" />
              ) : (
                <Copy aria-hidden className="h-4 w-4" />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <button
            ref={claimRef}
            type="button"
            onClick={claim}
            className="beta-access-cta mt-7 h-[52px] w-full text-lg"
          >
            {offer.cta}
          </button>
          <button
            type="button"
            className="mt-3 w-full text-sm text-[#627c86] hover:text-[#01b4c8]"
            onClick={close}
          >
            Look around first
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
