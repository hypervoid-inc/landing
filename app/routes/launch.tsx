import type { MetaDescriptor } from "react-router";
import { LaunchPage } from "../features/landing/launch-page";
import { siteUrl } from "../lib/route-manifest";

export function meta(): MetaDescriptor[] {
  return [
    { title: "Pre-launch offer · Construct Computer" },
    {
      name: "description",
      content:
        "Seven days of Construct Pro, free. Plus 20% off your first month or 40% off a full year before we go live on Product Hunt.",
    },
    // Kept out of search so it doesn't compete with `/`, and because the offer
    // is time-boxed to the campaign.
    { name: "robots", content: "noindex, nofollow" },
    { tagName: "link", rel: "canonical", href: `${siteUrl}/launch/` },
  ];
}

export default LaunchPage;
