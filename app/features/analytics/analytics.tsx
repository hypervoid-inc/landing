import { useEffect } from "react";

import {
  captureAnalytics,
  initializeAnalytics,
  registerCampaignAttribution,
} from "./analytics.client";
import { captureCampaignOnLoad } from "./campaign-attribution.client";
import { toAnalyticsProperties } from "./campaign-attribution";

export function Analytics() {
  useEffect(() => {
    // Persist attribution synchronously, before the idle callback below.
    // Someone who clicks the hero CTA a couple of hundred milliseconds after
    // load must still carry the campaign cookie to os.construct.computer;
    // PostHog initialisation can wait, this cannot.
    const { attribution, isFirstTouch } = captureCampaignOnLoad();

    const initialize = () => {
      void initializeAnalytics();
      if (!attribution) return;
      const properties = toAnalyticsProperties(attribution);
      registerCampaignAttribution(properties);
      if (isFirstTouch) {
        captureAnalytics("campaign_landed", {
          ...properties,
          is_first_touch: true,
        });
      }
    };

    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(initialize);
      return () => window.cancelIdleCallback(id);
    }
    const id = globalThis.setTimeout(initialize, 1);
    return () => globalThis.clearTimeout(id);
  }, []);

  return null;
}
