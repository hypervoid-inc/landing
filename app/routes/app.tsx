import type { LinksFunction, MetaDescriptor } from "react-router";

import { AppChooserPage } from "../features/app-chooser/app-chooser-page";
import { siteUrl } from "../lib/route-manifest";

export const links: LinksFunction = () => [
  {
    rel: "preload",
    href: "/assets/app-chooser/desktop-wallpaper.webp",
    as: "image",
  },
  {
    rel: "preload",
    href: "/assets/app-chooser/dashboard-wallpaper.webp",
    as: "image",
  },
];

export function meta(): MetaDescriptor[] {
  return [
    { title: "Open Construct Computer" },
    {
      name: "description",
      content:
        "Open Construct Computer your way: the Desktop, which feels like a Mac, or the Dashboard, which feels like the apps you already use.",
    },
    // A doorway for people who already have an account (emails link here),
    // not a page for search.
    { name: "robots", content: "noindex, nofollow" },
    { tagName: "link", rel: "canonical", href: `${siteUrl}/app/` },
  ];
}

export default AppChooserPage;
