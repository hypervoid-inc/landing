import * as Dialog from "@radix-ui/react-dialog";
import { Cloud, FolderOpen, History, X } from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
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

import { getAppUrl } from "../../platform/env";
import { AuthSignInForm } from "../auth/auth-sign-in-form";
import { useAuth } from "../auth/auth-provider";
import {
  clearPostLoginWelcome,
  consumePostLoginWelcome,
  peekPostLoginWelcome,
  shouldOpenPostLoginWelcomePreview,
} from "../auth/post-login-welcome";
import { captureAnalytics } from "../analytics/analytics.client";
import { usePrefersReducedMotion } from "./media";
import "./beta-access.css";

/** The dialog only signs people in; the field stays so callers still compile. */
export type AccessDialogMode = "auth";

/**
 * `start` reframes the auth dialog for people who have never had an account.
 * Same Google + email-code plumbing; it only stops the copy from implying a
 * prior Construct account is required.
 *
 * This is the default for every `StartLink`, because those are the warm CTAs
 * on marketing surfaces where the reader is by definition not signed in.
 * `signin` is for surfaces a returning user reaches deliberately: /login, and
 * the post-OAuth handoff.
 */
export type AccessDialogIntent = "signin" | "start";

export type OpenAccessDialogOptions = {
  mode?: AccessDialogMode;
  source: string;
  plan?: string;
  intent?: AccessDialogIntent;
  /** Opens the app on this prompt once the reader is signed in. */
  prompt?: string;
};

type OpenAccessDialog = (options: OpenAccessDialogOptions) => void;

const BetaAccessContext = createContext<OpenAccessDialog>(() => undefined);

/**
 * Read-only companion to BetaAccessContext. Kept separate so widening it never
 * re-renders every StartLink on the page each time the dialog opens.
 */
const BetaDialogOpenContext = createContext(false);

export function useBetaDialogOpen() {
  return useContext(BetaDialogOpenContext);
}

export function useOpenAccessDialog(): OpenAccessDialog {
  return useContext(BetaAccessContext);
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
  intent = "start",
  prompt,
  onClick: onBeforeClick,
}: {
  children: ReactNode;
  className?: string;
  label?: string;
  source?: string;
  /** When signed in, render this instead of `children` (e.g. "Open Construct"). */
  authedChildren?: ReactNode;
  /** Defaults to `start`: these CTAs are aimed at people without an account. */
  intent?: AccessDialogIntent;
  /**
   * Open the app on this prompt, which it shows and asks before running. A
   * new reader signs up first and the prompt goes with them.
   */
  prompt?: string;
  onClick?: () => void;
}) {
  const { status } = useAuth();
  const openDialog = useContext(BetaAccessContext);
  const appOrigin = getAppUrl(prompt);
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
    openDialog({ mode: "auth", source, intent, prompt });
  };

  return (
    <a
      href={appOrigin}
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

function AccessDialog({
  open,
  source,
  plan,
  intent = "signin",
  initialPhase = "form",
  prompt,
  onOpenChange,
}: {
  open: boolean;
  source: string;
  plan?: string;
  intent?: AccessDialogIntent;
  prompt?: string;
  initialPhase?: "form" | "success";
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const reducedMotion = usePrefersReducedMotion();
  const [phase, setPhase] = useState<"form" | "success">(initialPhase);
  const welcomeShown = useRef(false);

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
    if (phase !== "success" || welcomeShown.current) return;
    welcomeShown.current = true;
    captureAnalytics("post_login_welcome_shown", { source });
  }, [phase, source]);

  const dismissWelcome = () => {
    if (phase === "success") {
      captureAnalytics("post_login_welcome_dismissed", { source });
    }
    onOpenChange(false);
  };

  const handleAuthSuccess = () => {
    // In-dialog success owns the welcome UI; drop the leave-bridge flag.
    clearPostLoginWelcome();
    if (plan) {
      onOpenChange(false);
      navigate(`/account/?plan=${plan}`, { replace: true });
      return;
    }
    setPhase("success");
  };

  const successName =
    user?.displayName?.trim().split(/\s+/)[0] || user?.username || null;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
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
          onPointerDownOutside={(event) => {
            // Welcome: force an intentional Stay / X, don't treat the dim
            // backdrop as dismiss.
            if (phase === "success") event.preventDefault();
          }}
          onInteractOutside={(event) => {
            if (phase === "success") {
              event.preventDefault();
            }
          }}
          className="beta-dialog-content fixed left-1/2 top-1/2 z-[101] w-[calc(100%_-_2rem)] max-w-[420px] -translate-x-1/2 -translate-y-1/2 overflow-visible rounded-[28px] border border-[#d9f8ff]/80 bg-white px-8 py-9 font-sans text-[#4e4646] shadow-[0_24px_80px_rgba(1,180,200,.18)] focus:outline-none"
          {...(phase === "form" && intent === "start"
            ? { "aria-describedby": undefined }
            : {})}
        >
          {phase === "form" ? (
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
              {intent === "start" ? null : (
                <Dialog.Description className="mt-3 text-center text-[15px] leading-[21px] text-[#627c86]">
                  Sign in with the same account you use for Construct.
                </Dialog.Description>
              )}
              <AuthSignInForm
                appearance="dialog"
                onSuccess={handleAuthSuccess}
                postLoginWelcome={{ source, plan, prompt }}
                askHeardAbout={intent === "start"}
              />
              <p className="mt-4 text-center text-[12px] leading-[17px] text-[#627c86]">
                {intent === "start" ? (
                  <>
                    Already have an account? The same buttons sign you in.{" "}
                    <a
                      href={plan ? `/login/?plan=${plan}` : "/login/"}
                      className="whitespace-nowrap text-[#01b4c8] underline underline-offset-2"
                    >
                      Full sign-in page
                    </a>
                  </>
                ) : (
                  <>
                    Need a password reset or to create an account?{" "}
                    <a
                      href={plan ? `/login/?plan=${plan}` : "/login/"}
                      className="whitespace-nowrap text-[#01b4c8] underline underline-offset-2"
                    >
                      Full sign-in page
                    </a>
                  </>
                )}
              </p>
            </>
          ) : null}

          {phase === "success" ? (
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
                Construct is your persistent cloud workspace, agents, files, and
                work that keeps running.
              </Dialog.Description>
              <ul className="mt-6 space-y-3 text-left text-[14px] leading-5 text-[#4e4646]">
                <li className="flex gap-3">
                  <Cloud
                    aria-hidden
                    className="mt-0.5 size-[18px] shrink-0 text-[#01b4c8]"
                    strokeWidth={1.75}
                  />
                  <span>
                    Always-on agents that keep working while you&apos;re away
                  </span>
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
              {prompt ? (
                <p className="mt-4 text-[13px] leading-[18px] text-[#627c86]">
                  Your prompt from the post will be waiting, ready to run.
                </p>
              ) : null}
              <a
                href={getAppUrl(prompt)}
                onClick={() => {
                  captureAnalytics("post_login_welcome_os", { source });
                  captureAnalytics("app_opened", { source });
                }}
                className="beta-access-cta mt-8 h-[52px] w-full text-lg"
              >
                Open Construct
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
  const [plan, setPlan] = useState<string | undefined>();
  const [prompt, setPrompt] = useState<string | undefined>();
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
      setSource("url-preview");
      setPlan(undefined);
      setIntent("signin");
      setInitialPhase("success");
      setOpen(true);
    });
  }, []);

  useEffect(() => {
    if (status === "anonymous") {
      // Don't wipe a local URL preview, only clear leave-bridge flags.
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
      navigate(`/account/?plan=${payload.plan}`, { replace: true });
      return;
    }

    // Defer past the effect body, opening the dialog is a reaction to auth
    // settling + sessionStorage, not derived render state.
    queueMicrotask(() => {
      setSource(payload.source || "oauth-return");
      setPlan(undefined);
      setPrompt(payload.prompt);
      setIntent("signin");
      setInitialPhase("success");
      setOpen(true);
    });
  }, [status, navigate]);

  return (
    <BetaAccessContext.Provider
      value={(options) => {
        setSource(options.source);
        setPlan(options.plan);
        setPrompt(options.prompt);
        // Signup-first unless a caller explicitly asks otherwise. Callers that
        // reach this directly (pricing cards) are marketing CTAs too, and the
        // returning-user paths below set `signin` for themselves.
        setIntent(options.intent ?? "start");
        setInitialPhase("form");
        setOpen(true);
      }}
    >
      <BetaDialogOpenContext.Provider value={open}>
        {children}
        {open && (
          <AccessDialog
            key={`${source}-${plan ?? ""}-${intent}-${initialPhase}`}
            open
            source={source}
            plan={plan}
            intent={intent}
            initialPhase={initialPhase}
            prompt={prompt}
            onOpenChange={setOpen}
          />
        )}
      </BetaDialogOpenContext.Provider>
    </BetaAccessContext.Provider>
  );
}
