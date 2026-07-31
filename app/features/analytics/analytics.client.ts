import type { Properties } from "posthog-js";

type AnalyticsEvent =
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

/** EU cloud UI host — toolbar / replay assets; ingest stays on `api_host` proxy. */
const POSTHOG_UI_HOST = "https://eu.posthog.com";

let postHogPromise: Promise<typeof import("posthog-js").default | null> | null =
  null;

export function initializeAnalytics() {
  if (postHogPromise) return postHogPromise;
  postHogPromise = (async () => {
    const key = import.meta.env.VITE_POSTHOG_KEY;
    if (!import.meta.env.PROD || !key) return null;

    const { default: posthog } = await import("posthog-js");
    // ponytail: intentional max capture for product ops — unmask + network bodies.
    // Ceiling: PII in replay/network (incl. beta email); tighten via masks + project scrubbing.
    posthog.init(key, {
      api_host:
        import.meta.env.VITE_POSTHOG_HOST || "https://x.construct.computer",
      ui_host: POSTHOG_UI_HOST,
      defaults: "2026-05-30",
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

export function captureAnalytics(
  event: AnalyticsEvent,
  properties?: Properties,
) {
  void initializeAnalytics().then((posthog) =>
    posthog?.capture(event, properties),
  );
}
