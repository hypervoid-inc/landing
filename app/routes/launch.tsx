import type { MetaDescriptor } from "react-router";
import { LaunchPage } from "../features/landing/launch-page";
import { siteUrl } from "../lib/route-manifest";

export function meta(): MetaDescriptor[] {
  return [
    { title: "Launch offer · Construct Computer" },
    {
      name: "description",
      content:
        "A team of AI agents that work like hires. Hand them tonight's list before bed and they work through it overnight. Start a 7-day Pro trial and claim your launch pricing.",
    },
    // Kept out of search so it doesn't compete with `/`, and because the offer
    // is time-boxed to the campaign.
    { name: "robots", content: "noindex, nofollow" },
    { tagName: "link", rel: "canonical", href: `${siteUrl}/launch/` },
  ];
}

export default LaunchPage;
