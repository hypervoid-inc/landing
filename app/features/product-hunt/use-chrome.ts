import { useSyncExternalStore } from "react";

import {
  readSiteChromeHeightPx,
  subscribeSiteChromeHeight,
} from "./chrome";

export function useSiteChromeHeight(fallback = 56) {
  return useSyncExternalStore(
    (onStoreChange) => subscribeSiteChromeHeight(() => onStoreChange()),
    () => readSiteChromeHeightPx(fallback),
    () => fallback,
  );
}
