import type { ReactNode } from "react";

import { affiliateProgramUrl } from "../../content/landing";
import { captureAnalytics } from "../../features/analytics/analytics.client";

export function AffiliateLink({
  children,
  className = "",
  label,
  placement,
}: {
  children: ReactNode;
  className?: string;
  label?: string;
  placement: "header" | "hero" | "footer" | "affiliates" | "affiliates_top" | "affiliates_bottom";
}) {
  return (
    <a
      href={affiliateProgramUrl}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className={className}
      onClick={() => captureAnalytics("affiliate_link_clicked", { placement })}
    >
      {children}
    </a>
  );
}
