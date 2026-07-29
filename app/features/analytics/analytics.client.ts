import type { Properties } from "posthog-js";

import { sanitizeEvent, sanitizeUrl } from "./sanitize-event";

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

let postHogPromise: Promise<typeof import("posthog-js").default | null> | null =
  null;

export function initializeAnalytics() {
  if (postHogPromise) return postHogPromise;
  postHogPromise = (async () => {
    const key = import.meta.env.VITE_POSTHOG_KEY;
    if (!import.meta.env.PROD || !key) return null;

    const { default: posthog } = await import("posthog-js");
    posthog.init(key, {
      api_host:
        import.meta.env.VITE_POSTHOG_HOST || "https://x.construct.computer",
      ui_host: "https://us.posthog.com",
      defaults: "2026-05-30",
      capture_pageview: "history_change",
      capture_pageleave: true,
      capture_heatmaps: true,
      capture_exceptions: false,
      cross_subdomain_cookie: false,
      disable_session_recording: false,
      enable_recording_console_log: false,
      person_profiles: "identified_only",
      respect_dnt: true,
      secure_cookie: true,
      session_recording: {
        blockSelector: "[data-private]",
        maskAllInputs: true,
        maskCapturedNetworkRequestFn: (request) => ({
          ...request,
          name: String(sanitizeUrl(request.name)),
          requestBody: null,
          requestHeaders: undefined,
          responseBody: null,
          responseHeaders: undefined,
        }),
      },
      before_send: (event) => (event ? sanitizeEvent(event) : null),
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
