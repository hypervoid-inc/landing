import { useEffect } from "react";

import { initializeAnalytics } from "./analytics.client";

export function Analytics() {
  useEffect(() => {
    const initialize = () => void initializeAnalytics();
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(initialize);
      return () => window.cancelIdleCallback(id);
    }
    const id = globalThis.setTimeout(initialize, 1);
    return () => globalThis.clearTimeout(id);
  }, []);

  return null;
}
