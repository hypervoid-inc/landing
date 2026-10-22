import {
  createElement,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type MouseEvent,
} from "react";

import {
  AccountMenuAvatar,
  accountDisplayName,
} from "../../components/layout/user-menu";
import {
  captureAnalytics,
  captureAnalyticsBeforeLeave,
} from "../analytics/analytics.client";
import { useAuth } from "../auth/auth-provider";
import {
  mascotLayerSrc,
  mascotLayerStyle,
  type MascotLayer,
} from "../content/mascot-layers";
import { trackPointer } from "../show/mascot";
import { HUGE_ICONS } from "./hugeicons";
import { DashboardPreview, DesktopPreview } from "./shell-previews";
import { useChooserTheme } from "./theme";
import {
  continuationParams,
  parseShellCookie,
  returnKind,
  returnShell,
  serializeShellCookie,
  shellUrl,
  type ReturnKind,
  type Shell,
} from "./shell-choice";
import "./app-chooser.css";

/** Each app's own default: Construct OS opens on Fuji at dusk, Zen Mode on the
 * blurred landscape under its paper tint, day or night with the theme. */
const DESKTOP_WALLPAPER = "/assets/app-chooser/desktop-wallpaper.webp";
const DASHBOARD_WALLPAPER = "/assets/app-chooser/dashboard-wallpaper.webp";
const DASHBOARD_WALLPAPER_NIGHT =
  "/assets/app-chooser/dashboard-wallpaper-night.webp";

/** Zen Mode's own theme toggle glyphs: the sun offers light, the moon dark. */
function ThemeIcon({ dark }: { dark: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      {HUGE_ICONS[dark ? "Sun03Icon" : "Moon02Icon"].map(([tag, attrs], i) =>
        createElement(tag, { key: i, ...attrs }),
      )}
    </svg>
  );
}

function MascotLayerImg({ name }: { name: MascotLayer }) {
  return (
    <img
      src={mascotLayerSrc(name)}
      alt=""
      draggable={false}
      style={mascotLayerStyle(name)}
    />
  );
}

/**
 * The glass mascot, blinking and watching the pointer. Decorative: fills a
 * square box. The sockets shift with the gaze and the pupils twice as far,
 * as in the Night Shift show.
 */
function Mascot() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    return trackPointer(document.documentElement, node);
  }, []);

  return (
    <span ref={ref} className="ac-mascot" aria-hidden="true">
      <MascotLayerImg name="body-construct" />
      <MascotLayerImg name="gloss" />
      <span className="ac-mascot-face">
        <MascotLayerImg name="sockets" />
        <span className="ac-mascot-eyes">
          <MascotLayerImg name="eyes" />
        </span>
      </span>
    </span>
  );
}

function Arrow() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 8h9.5M8.5 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Wordmark({ variant }: { variant: "head" | "door" }) {
  return (
    <a
      href="/"
      className={`ac-wordmark ac-wordmark--${variant}`}
      aria-label="Construct Computer home"
    >
      <span>Construct</span>
      <span>Computer</span>
    </a>
  );
}

const subscribeNever = () => () => {};

function readPrompt(): string | null {
  return new URLSearchParams(window.location.search).get("prompt");
}

/** A string snapshot, since useSyncExternalStore compares by identity. */
function readSearch(): string {
  return window.location.search;
}

function readUserAgent(): string {
  return navigator.userAgent;
}

const SHELL_NAME: Record<Shell, string> = {
  dashboard: "Dashboard",
  desktop: "Desktop",
};

/** The one-line note for a visitor coming back from Dodo or a link. */
const RETURN_NOTE: Record<ReturnKind, string | null> = {
  paid: "Payment received. Your plan turns on in a few seconds.",
  declined: "Your payment didn't go through. Nothing was charged.",
  card: "Payment method updated.",
  canceled: "Checkout canceled. Nothing was charged.",
  billing: "Back from billing. Pick an app to carry on.",
  link: null,
};

function readLastShell(): Shell | null {
  // A blocked cookie jar only costs the "Last used" badge.
  try {
    return parseShellCookie(document.cookie);
  } catch {
    return null;
  }
}

function rememberShell(shell: Shell) {
  try {
    document.cookie = serializeShellCookie(shell, window.location.hostname);
  } catch {
    // Same as above: the badge is a convenience, opening the app is not.
  }
}

function isPlainClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

/**
 * `/app/`: pick the dashboard (Zen Mode, recommended, on the left) or the
 * desktop (Construct OS). The link emails use for "open Construct". It can
 * also take a browser back from the billing portal when it was opened from
 * an unknown origin, and from a Dodo checkout once billingReturnUrl points
 * here (a ponytail in apps/api/src/platform/urls.ts; today it does not): a
 * return with a remembered app goes straight back to it, otherwise the
 * visitor picks and the return params ride along.
 * No site chrome: the page exists to open an app. Works signed in or out,
 * since each app signs people in at its own front door and one session
 * covers both.
 */
export function AppChooserPage() {
  const { status, user, logout } = useAuth();
  const { theme, chosen, toggle } = useChooserTheme();
  // Null on the server and for the hydrating render, which both see the one
  // prerendered file; the query and the cookie only exist in the browser.
  const prompt = useSyncExternalStore(subscribeNever, readPrompt, () => null);
  const search = useSyncExternalStore(subscribeNever, readSearch, () => "");
  const userAgent = useSyncExternalStore(subscribeNever, readUserAgent, () => "");
  const lastShell = useSyncExternalStore(
    subscribeNever,
    readLastShell,
    () => null,
  );
  const continuation = useMemo(() => continuationParams(search), [search]);
  const returning = continuation ? returnKind(continuation) : null;
  const forwardTo = continuation ? returnShell(lastShell, userAgent) : null;
  const viewed = useRef(false);
  const forwarded = useRef(false);

  const signedIn = status === "authenticated";

  // A return goes back to the app this browser used last, before the sign-in
  // check: the app signs people in itself.
  useEffect(() => {
    if (!forwardTo || forwarded.current) return;
    forwarded.current = true;
    const href = shellUrl(forwardTo, prompt, continuation);
    void captureAnalyticsBeforeLeave("app_opened", {
      source: "app_chooser_return",
      shell: forwardTo,
      returning,
    }).then(() => window.location.replace(href));
  }, [forwardTo, prompt, continuation, returning]);

  useEffect(() => {
    if (forwardTo || status === "loading" || viewed.current) return;
    viewed.current = true;
    captureAnalytics("app_chooser_viewed", {
      signed_in: signedIn,
      last_used: lastShell,
      returning,
    });
  }, [forwardTo, status, signedIn, lastShell, returning]);

  const open = (shell: Shell) => (event: MouseEvent<HTMLAnchorElement>) => {
    rememberShell(shell);
    const properties = {
      source: "app_chooser",
      shell,
      signed_in: signedIn,
      returning,
    };
    if (!isPlainClick(event)) {
      captureAnalytics("app_opened", properties);
      return;
    }
    // Same-tab navigation unloads PostHog, so hand the event off first
    // (capped at 400ms) and then go.
    event.preventDefault();
    const href = event.currentTarget.href;
    void captureAnalyticsBeforeLeave("app_opened", properties).then(() =>
      window.location.assign(href),
    );
  };

  const desktopHref = shellUrl("desktop", prompt, continuation);
  const dashboardHref = shellUrl("dashboard", prompt, continuation);
  const defaultNote =
    status === "anonymous"
      ? "You'll sign in on the next screen. Same account in both."
      : "Same account, same agents in both. Switch any time.";
  const note = forwardTo
    ? `Taking you back to the ${SHELL_NAME[forwardTo]}...`
    : (returning && RETURN_NOTE[returning]) || defaultNote;
  const name = user ? accountDisplayName(user) : "";

  return (
    <div className="ac" data-theme={chosen ?? undefined}>
      <button
        type="button"
        className="ac-theme"
        aria-label={
          theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
        }
        onClick={() => toggle()}
      >
        <ThemeIcon dark={theme === "dark"} />
      </button>
      <header className="ac-head">
        <Wordmark variant="head" />
        <span className="ac-head-mascot">
          <Mascot />
        </span>
        <h1 className="ac-title">
          How do you like to <em>work?</em>
        </h1>
        <p className="ac-head-note" aria-live="polite">
          {note}
        </p>
      </header>

      <main className="ac-doors">
        <section
          className="ac-door ac-door--dashboard"
          aria-labelledby="ac-dashboard-name"
        >
          <img
            className="ac-door-bg ac-door-bg--zen"
            src={DASHBOARD_WALLPAPER}
            alt=""
          />
          <img
            className="ac-door-bg ac-door-bg--zen ac-night"
            src={DASHBOARD_WALLPAPER_NIGHT}
            alt=""
          />
          <div className="ac-door-inner">
            <Wordmark variant="door" />
            <a
              className="ac-stage"
              href={dashboardHref}
              tabIndex={-1}
              aria-hidden="true"
              onClick={open("dashboard")}
            >
              <DashboardPreview />
            </a>
            <div className="ac-copy">
              <div className="ac-eyebrow-row">
                <p className="ac-eyebrow">Zen Mode</p>
                <span className="ac-badge ac-badge--recommended">
                  Recommended
                </span>
                {lastShell === "dashboard" ? (
                  <span className="ac-badge ac-badge--last">Last used</span>
                ) : null}
                <span className="ac-badge ac-badge--phone">
                  Best on your phone
                </span>
              </div>
              <h2 id="ac-dashboard-name" className="ac-name">
                Dashboard
              </h2>
              <p className="ac-blurb">
                Feels like the apps you already use. A calm sidebar, one page at
                a time, and it works on your phone. Just ask, and your agents
                take it from there.
              </p>
              <div className="ac-actions">
                <a
                  className="ac-cta"
                  href={dashboardHref}
                  onClick={open("dashboard")}
                >
                  Open Dashboard
                  <Arrow />
                </a>
                <span className="ac-hint">Any screen</span>
              </div>
            </div>
          </div>
        </section>

        <section
          className="ac-door ac-door--desktop"
          aria-labelledby="ac-desktop-name"
        >
          <img className="ac-door-bg" src={DESKTOP_WALLPAPER} alt="" />
          <div className="ac-door-inner">
            <div className="ac-account" aria-live="polite">
              {signedIn && user ? (
                <div className="ac-account-pill">
                  <AccountMenuAvatar user={user} name={name} />
                  <span className="ac-account-text">
                    <span className="ac-account-label">Signed in as </span>
                    <strong>{name}</strong>
                  </span>
                  <button
                    type="button"
                    className="ac-account-switch"
                    onClick={() => void logout()}
                  >
                    Not you?
                  </button>
                </div>
              ) : null}
            </div>
            <a
              className="ac-stage"
              href={desktopHref}
              tabIndex={-1}
              aria-hidden="true"
              onClick={open("desktop")}
            >
              <DesktopPreview />
            </a>
            <div className="ac-copy">
              <div className="ac-eyebrow-row">
                <p className="ac-eyebrow">Construct OS</p>
                {lastShell === "desktop" ? (
                  <span className="ac-badge ac-badge--last">Last used</span>
                ) : null}
              </div>
              <h2 id="ac-desktop-name" className="ac-name">
                Desktop
              </h2>
              <p className="ac-blurb">
                Feels like a Mac. Windows, a dock and Spotlight, with Browser,
                Terminal, Files and Email side by side. Best when you like lots
                open at once.
              </p>
              <div className="ac-actions ac-actions--desktop">
                <a
                  className="ac-cta ac-cta--quiet"
                  href={desktopHref}
                  onClick={open("desktop")}
                >
                  Open Desktop
                  <Arrow />
                </a>
                <span className="ac-hint">Laptop or bigger</span>
              </div>
              <p className="ac-small-screen">
                Construct OS needs a laptop or desktop. Open this page there
                when you want it.
              </p>
            </div>
          </div>
        </section>
      </main>

      <div className="ac-seam" aria-hidden="true">
        <span className="ac-seam-glow" />
        <div className="ac-seam-mark">
          <span className="ac-seam-mascot">
            <Mascot />
          </span>
          <span className="ac-seam-or">or</span>
        </div>
      </div>
      <p className="ac-foot">{note}</p>
    </div>
  );
}
