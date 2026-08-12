import type { MetaDescriptor } from "react-router";
import { LaunchPage } from "../features/landing/launch-page";
import { siteUrl } from "../lib/route-manifest";

export function meta(): MetaDescriptor[] {
  return [
    { title: "Launch offer · Construct Computer" },
    {
      name: "description",
      content:
        "Seven days of Construct Pro, free — plus launch discounts. Follow or upvote us on Product Hunt and start your trial.",
    },
    // Kept out of search so it doesn't compete with `/`, and because the offer
    // is time-boxed to the campaign.
    { name: "robots", content: "noindex, nofollow" },
    { tagName: "link", rel: "canonical", href: `${siteUrl}/launch/` },
  ];
}

export default LaunchPage;
