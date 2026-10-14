import type { MetaDescriptor } from "react-router";

import { EmbedApp } from "../features/embed/embed-app";
import { playerCardMeta } from "../lib/player-card";
import { siteUrl } from "../lib/route-manifest";

const TITLE = "Try Construct live";
const DESCRIPTION =
  "Give Construct's AI employee a task and watch it work on its own little desktop. Two minutes, no account.";
const IMAGE = `${siteUrl}/og/home.jpg?v=2`;

export function meta(): MetaDescriptor[] {
  return [
    { title: `${TITLE} · Construct Computer` },
    { name: "description", content: DESCRIPTION },
    // The frame inside a post, not a page to rank.
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
    ...playerCardMeta("embed"),
    { name: "twitter:site", content: "@use_construct" },
    { name: "twitter:title", content: TITLE },
    { name: "twitter:description", content: DESCRIPTION },
    { name: "twitter:image", content: IMAGE },
  ];
}

export default EmbedApp;
