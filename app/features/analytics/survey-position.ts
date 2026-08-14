/**
 * Pin PostHog popover surveys to the bottom-left corner.
 *
 * PostHog's default is bottom-right (`SurveyPosition.Right` / `"right"`), which
 * collides with Clippy. Appearance is configured per survey in the dashboard;
 * there is no init-level override, so we rewrite popover `appearance.position`
 * when surveys load and inject a shadow-DOM stylesheet so the first paint
 * cannot still land on the right (the display poll can render before our
 * callback mutates the cached definitions).
 *
 * Position values: https://posthog.com/docs/references/posthog-js/types/SurveyPosition
 * Native left offset is 30px: posthog-js `getPopoverPosition(SurveyPosition.Left)`.
 */

export const POSTHOG_SURVEY_POPUP_POSITION = "left" as const;

const SURVEY_HOST_PREFIX = "PostHogSurvey-";
const STYLE_ATTR = "data-construct-survey-position";

/** Positions that already encode a non-default placement — leave them alone. */
const PRESERVED_POSITIONS = new Set([
  "left",
  "center",
  "top_left",
  "top_right",
  "top_center",
  "middle_left",
  "middle_right",
  "middle_center",
  "next_to_trigger",
]);

type PinableSurvey = {
  type?: string;
  appearance?: { position?: string | null } | null;
};

/**
 * Shadow-DOM CSS. `.ph-survey` is `position: fixed; bottom: 0` with `right` or
 * `left` set inline. Page CSS cannot reach it. Skip anything that already set
 * `top` (top/middle/next-to-trigger placements).
 */
export const SURVEY_POPUP_LEFT_CSS = `.ph-survey:not([style*="top"]) {
  left: 30px !important;
  right: auto !important;
}`;

export function pinPopoverSurveyAppearance(surveys: PinableSurvey[]): void {
  for (const survey of surveys) {
    if (survey.type !== "popover") continue;
    const position = survey.appearance?.position ?? undefined;
    if (position && PRESERVED_POSITIONS.has(position)) continue;
    survey.appearance = {
      ...survey.appearance,
      position: POSTHOG_SURVEY_POPUP_POSITION,
    };
  }
}

export function injectSurveyPopupLeftStyles(host: Element): void {
  const shadow = host.shadowRoot;
  if (!shadow) return;
  if (shadow.querySelector(`style[${STYLE_ATTR}]`)) return;
  const style = shadow.ownerDocument.createElement("style");
  style.setAttribute(STYLE_ATTR, "");
  style.textContent = SURVEY_POPUP_LEFT_CSS;
  shadow.appendChild(style);
}

function isPostHogSurveyHost(el: Element): boolean {
  for (const cls of el.classList) {
    if (cls.startsWith(SURVEY_HOST_PREFIX)) return true;
  }
  return false;
}

export function watchPostHogSurveyHosts(root: ParentNode): () => void {
  const apply = (node: Node) => {
    if (!(node instanceof Element) || !isPostHogSurveyHost(node)) return;
    injectSurveyPopupLeftStyles(node);
  };

  root.querySelectorAll(`[class^="${SURVEY_HOST_PREFIX}"]`).forEach(apply);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach(apply);
    }
  });
  observer.observe(root, { childList: true });
  return () => observer.disconnect();
}
