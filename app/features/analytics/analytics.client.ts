import type { Properties } from "posthog-js";

import { scrubNetworkCapture } from "./scrub-network-capture";
import {
  pinPopoverSurveyAppearance,
  watchPostHogSurveyHosts,
} from "./survey-position";

type AnalyticsEvent =
  | "app_opened"
  | "auth_dialog_opened"
  | "beta_access_opened"
  | "beta_signup_submitted"
  | "beta_signup_granted"
  | "beta_opened"
  | "affiliate_link_clicked"
  | "clippy_shown"
  | "clippy_cta_clicked"
  | "clippy_collapsed"
  | "clippy_reopened"
  | "clippy_hidden"
  | "clippy_dragged"
  | "post_login_welcome_shown"
  | "post_login_welcome_os"
  | "post_login_welcome_dismissed"
  | "campaign_landed"
  | "campaign_banner_shown"
  | "campaign_banner_clicked"
  | "launch_page_viewed"
  | "launch_social_clicked"
  // `/launch` conversion path. `launch_cta_clicked` carries `position` so the
  // hero, codes, and footer CTAs can be compared; `launch_section_viewed`
  // carries `section` so a bounce at the hero is distinguishable from a read
  // that reached the offer and still did not convert.
  | "launch_cta_clicked"
  | "launch_walkthrough_clicked"
  | "launch_section_viewed"
  // Homepage equivalents. `position` separates the many CTAs the page carries
  // (hero, pricing cards, workflow demos, closing block) so they can be
  // compared instead of collapsing into one undifferentiated dialog-open.
  | "cta_clicked"
  | "walkthrough_clicked"
  | "promo_code_copied"
  | "ph_banner_shown"
  | "ph_badge_clicked"
  | "ph_embed_clicked"
  | "ph_cta_clicked"
  | "ph_confetti_fired"
  // `checkout_started` intentionally shares its name with the event in apps/web
  // so both surfaces form one funnel; they are separated by `source`. The `plan`
  // and `interval` property names must stay identical on both sides.
  | "checkout_started"
  | "checkout_redirected"
  | "checkout_failed"
  // Onward reading from a post. `source` separates the surfaces (end-of-post
  // grid, mid-article read-next, desktop rail) so they can be compared.
  | "related_post_clicked";

/** First-party ingest proxy — never eu.i.posthog.com in the browser. */
const POSTHOG_PROXY = "https://x.construct.computer";
/** EU cloud UI host — dashboard links only; ingest stays on `api_host`. */
const POSTHOG_UI_HOST = "https://eu.posthog.com";
/**
 * Shared with apps/web (v2 repo) — both must use the same value or the
 * cross-subdomain identity handoff silently splits into two persons.
 * Bumping this suffix forces a clean slate; only do it in lockstep, and expect
 * a one-time step-change in "new users" on the day it ships.
 */
const POSTHOG_PERSISTENCE_NAME = "construct_ph_v2";

function resolvePostHogHost(): string {
  const configured = import.meta.env.VITE_POSTHOG_HOST?.trim();
  return configured === POSTHOG_PROXY ? configured : POSTHOG_PROXY;
}

type PostHogClient =
  typeof import("posthog-js/dist/module.full.no-external").default;

let postHogPromise: Promise<PostHogClient | null> | null = null;

export function initializeAnalytics() {
  if (postHogPromise) return postHogPromise;
  postHogPromise = (async () => {
    const key = import.meta.env.VITE_POSTHOG_KEY;
    if (!import.meta.env.PROD || !key) return null;

    // Pre-bundle replay/surveys/exceptions — proxy lazy-load stuck at lazy_loading.
    const { default: posthog } =
      await import("posthog-js/dist/module.full.no-external");
    // ponytail: intentional max capture for product ops — unmask + network bodies.
    // Ceiling: PII in replay/network (incl. beta email); tighten via masks + project scrubbing.
    // Credentials are the hard line: `scrubNetworkCapture` drops password and BYOK
    // key payloads before they reach the recording. See scrub-network-capture.ts.
    //
    // Do NOT wire `sanitize-event.ts` in as `before_send`, and do not add
    // `sanitize_properties`. It strips every query string from `$current_url`,
    // which would delete the `ref`/`cid`/`sid`/`utm_*` params that campaign
    // attribution depends on, and would also break PostHog's own `$initial_utm_*`
    // parsing (it reads `$current_url`). The module is deliberately unreferenced.
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
      // Signup happens on os.construct.computer, so a host-scoped cookie would
      // sever anonymous identity (and campaign super properties) at exactly the
      // hop we need to measure. `persistence_name` is bumped alongside this so a
      // stale host-only `ph_*` cookie can't race the new domain-scoped one —
      // posthog-js reads the first match, and precedence is not guaranteed.
      // Must stay in lockstep with apps/web in the v2 repo.
      cross_subdomain_cookie: true,
      persistence_name: POSTHOG_PERSISTENCE_NAME,
      disable_session_recording: false,
      disable_surveys: false,
      enable_recording_console_log: true,
      respect_dnt: false,
      secure_cookie: true,
      session_recording: {
        maskAllInputs: false,
        // Password and BYOK key fields still mask, whatever the global setting.
        maskInputOptions: { password: true },
        maskTextSelector: null,
        recordCrossOriginIframes: true,
        recordHeaders: true,
        recordBody: true,
        maskCapturedNetworkRequestFn: scrubNetworkCapture,
        captureCanvas: { recordCanvas: true },
        collectFonts: true,
      },
      rate_limiting: {
        events_per_second: 50,
        events_burst_limit: 500,
      },
    });
    // Popovers default to bottom-right and render inside open shadow DOM, so
    // rewrite appearance.position and inject a host stylesheet. See survey-position.ts.
    posthog.onSurveysLoaded((surveys) => {
      pinPopoverSurveyAppearance(surveys);
    });
    if (document.body) {
      watchPostHogSurveyHosts(document.body);
    }
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

/**
 * Attach campaign attribution to everything this browser sends.
 *
 * `register` puts the values on every subsequent event as super properties.
 * `setPersonProperties(undefined, …)` writes the second argument as `$set_once`,
 * so first-touch values survive the `identify()` that happens at signup and land
 * on the person profile — which is what makes "this account came from campaign
 * X" answerable inside PostHog, independent of the D1 column.
 */
export function registerCampaignAttribution(
  properties: Record<string, string | number>,
): void {
  if (Object.keys(properties).length === 0) return;
  void initializeAnalytics().then((posthog) => {
    if (!posthog) return;
    posthog.register(properties);
    const initial: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(properties)) {
      initial[`initial_${key}`] = value;
    }
    posthog.setPersonProperties(undefined, initial);
  });
}

export function captureAnalytics(
  event: AnalyticsEvent,
  properties?: Properties,
) {
  void initializeAnalytics().then((posthog) =>
    posthog?.capture(event, properties),
  );
}
