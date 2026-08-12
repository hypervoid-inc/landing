import type { MetaDescriptor } from "react-router";
import { LaunchPage } from "../features/landing/launch-page";
import { siteUrl } from "../lib/route-manifest";

export function meta(): MetaDescriptor[] {
  return [
    { title: "Launch offer · Construct Computer" },
    {
      name: "description",
      content:
        "An AI employee with its own computer. Hand it the list before bed and it works through the night. Start a free Pro trial and claim your launch pricing.",
    },
    // Kept out of search so it doesn't compete with `/`, and because the offer
    // is time-boxed to the campaign.
    { name: "robots", content: "noindex, nofollow" },
    { tagName: "link", rel: "canonical", href: `${siteUrl}/launch/` },
  ];
}

export default LaunchPage;
