import type { Properties } from "posthog-js";

type AnalyticsEvent =
  | "app_opened"
  | "beta_access_opened"
  | "beta_signup_submitted"
  | "beta_signup_granted"
  | "beta_opened"
  | "affiliate_link_clicked"
  | "clippy_shown"
  | "clippy_advanced"
  | "clippy_cta_clicked"
  | "clippy_collapsed"
  | "clippy_reopened"
  | "clippy_hidden"
  | "clippy_dragged";

/** First-party ingest proxy — never eu.i.posthog.com in the browser. */
const POSTHOG_PROXY = "https://x.construct.computer";
/** EU cloud UI host — dashboard links only; ingest stays on `api_host`. */
const POSTHOG_UI_HOST = "https://eu.posthog.com";

function resolvePostHogHost(): string {
  const configured = import.meta.env.VITE_POSTHOG_HOST?.trim();
  return configured === POSTHOG_PROXY ? configured : POSTHOG_PROXY;
}

type PostHogClient = typeof import("posthog-js/dist/module.full.no-external").default;

let postHogPromise: Promise<PostHogClient | null> | null = null;

export function initializeAnalytics() {
  if (postHogPromise) return postHogPromise;
  postHogPromise = (async () => {
    const key = import.meta.env.VITE_POSTHOG_KEY;
    if (!import.meta.env.PROD || !key) return null;

    // Pre-bundle replay/surveys/exceptions — proxy lazy-load stuck at lazy_loading.
    const { default: posthog } = await import(
      "posthog-js/dist/module.full.no-external"
    );
    // ponytail: intentional max capture for product ops — unmask + network bodies.
    // Ceiling: PII in replay/network (incl. beta email); tighten via masks + project scrubbing.
    posthog.init(key, {
      api_host: resolvePostHogHost(),
      ui_host: POSTHOG_UI_HOST,
      defaults: "2026-05-30",
      disable_external_dependency_loading: true,
      person_profiles: "always",
      autocapture: true,
      capture_pageview: "history_change",
      capture_pageleave: true,
      capture_performance: true,
      capture_exceptions: true,
      capture_heatmaps: true,
      capture_dead_clicks: true,
      cross_subdomain_cookie: false,
      disable_session_recording: false,
      disable_surveys: false,
      enable_recording_console_log: true,
      respect_dnt: false,
      secure_cookie: true,
      session_recording: {
        maskAllInputs: false,
        maskTextSelector: null,
        recordCrossOriginIframes: true,
        recordHeaders: true,
        recordBody: true,
        captureCanvas: { recordCanvas: true },
        collectFonts: true,
      },
      rate_limiting: {
        events_per_second: 50,
        events_burst_limit: 500,
      },
    });
    return posthog;
  })();
  return postHogPromise;
}

/** Prefer email so landing + OS persons match in session replay. */
export function identifyAnalyticsUser(user: {
  id: string;
  email: string | null;
}): void {
  void initializeAnalytics().then((posthog) => {
    if (!posthog) return;
    const email = user.email?.trim().toLowerCase() ?? "";
    const distinctId = email.includes("@") ? email : user.id;
    if (!distinctId) return;
    posthog.identify(distinctId, {
      ...(email.includes("@") ? { email } : {}),
      user_id: user.id,
    });
  });
}

export function resetAnalyticsUser(): void {
  void initializeAnalytics().then((posthog) => posthog?.reset());
}

export function captureAnalytics(
  event: AnalyticsEvent,
  properties?: Properties,
) {
  void initializeAnalytics().then((posthog) =>
    posthog?.capture(event, properties),
  );
}
