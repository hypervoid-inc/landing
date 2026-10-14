import type { LinksFunction, MetaDescriptor } from "react-router";

import { EpisodeApp } from "../features/episode/episode-app";
import { playerCardMeta } from "../lib/player-card";
import { siteUrl } from "../lib/route-manifest";

const TITLE = "Episode 01: The Night Shift";
const DESCRIPTION =
  "A one minute manga you play in the post: a founder, a list, and an AI employee that takes the night shift.";
const IMAGE = `${siteUrl}/og/home.jpg?v=2`;

export const links: LinksFunction = () => [
  { rel: "preload", href: "/assets/show/fonts/sora-latin-wght-normal.woff2", as: "font", type: "font/woff2", crossOrigin: "anonymous" },
  { rel: "preload", href: "/assets/show/sky-day.webp", as: "image" },
  { rel: "preload", href: "/assets/show/crt.webp", as: "image" },
];

export function meta(): MetaDescriptor[] {
  return [
    { title: `${TITLE} · Construct Computer` },
    { name: "description", content: DESCRIPTION },
    { name: "robots", content: "noindex, nofollow" },
    { tagName: "link", rel: "canonical", href: `${siteUrl}/embed2/` },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "Construct Computer" },
    { property: "og:title", content: TITLE },
    { property: "og:description", content: DESCRIPTION },
    { property: "og:url", content: `${siteUrl}/embed2/` },
    { property: "og:image", content: IMAGE },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    ...playerCardMeta("embed2", "/embed2/"),
    { name: "twitter:site", content: "@use_construct" },
    { name: "twitter:title", content: TITLE },
    { name: "twitter:description", content: DESCRIPTION },
    { name: "twitter:image", content: IMAGE },
  ];
}

export default EpisodeApp;
