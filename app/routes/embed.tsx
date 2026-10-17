import type { LinksFunction, MetaDescriptor } from "react-router";

import { NightShiftApp } from "../features/night-shift/night-shift-app";
import { siteUrl } from "../lib/route-manifest";

const TITLE = "Night Shift, a playable short";
const DESCRIPTION =
  "Hand your Construct agents the work at 11 pm, pull the chain and go to bed. A one minute night shift you play right in the post.";
const IMAGE = `${siteUrl}/og/home.jpg?v=4`;

export const links: LinksFunction = () => [
  {
    rel: "preload",
    href: "/assets/show/fonts/sora-latin-wght-normal.woff2",
    as: "font",
    type: "font/woff2",
    crossOrigin: "anonymous",
  },
  { rel: "preload", href: "/assets/show/sky-day.webp", as: "image" },
  { rel: "preload", href: "/assets/show/crt.webp", as: "image" },
];

export function meta(): MetaDescriptor[] {
  return [
    { title: `${TITLE} · Construct Computer` },
    { name: "description", content: DESCRIPTION },
    { name: "robots", content: "noindex, nofollow" },
    { tagName: "link", rel: "canonical", href: `${siteUrl}/embed/` },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "Construct Computer" },
    { property: "og:title", content: TITLE },
    { property: "og:description", content: DESCRIPTION },
    { property: "og:url", content: `${siteUrl}/embed/` },
    { property: "og:image", content: IMAGE },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    // X gets the player card instead (functions/player-card.ts).
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:image", content: IMAGE },
    { name: "twitter:site", content: "@use_construct" },
    { name: "twitter:title", content: TITLE },
    { name: "twitter:description", content: DESCRIPTION },
  ];
}

export default NightShiftApp;
