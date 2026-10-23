import type { MetaDescriptor } from "react-router";

import { DeckViewer } from "../features/deck/deck-viewer";
import { DECK_RAISE, DECK_VERSION, slides } from "../features/deck/slides";
import { siteUrl } from "../lib/route-manifest";

const TITLE = "Construct Computer pre-seed deck";
const DESCRIPTION = `AI employees for small teams, each with its own desktop. The product, the market and our ${DECK_RAISE} pre-seed round, in ${slides.length} slides.`;
// Made from the slides by `pnpm deck:slides`, so it changes with the deck.
const IMAGE = `${siteUrl}/og/deck.jpg?v=${DECK_VERSION}`;

export function meta(): MetaDescriptor[] {
  return [
    { title: TITLE },
    { name: "description", content: DESCRIPTION },
    // Shared by link with investors, not a page for search or AI answers.
    // robots.txt keeps crawlers out but lets link-preview bots in, so the link
    // unfurls into this card in DMs; _headers sends the same as X-Robots-Tag.
    { name: "robots", content: "noindex, nofollow" },
    { tagName: "link", rel: "canonical", href: `${siteUrl}/deck/` },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "Construct Computer" },
    { property: "og:title", content: TITLE },
    { property: "og:description", content: DESCRIPTION },
    { property: "og:url", content: `${siteUrl}/deck/` },
    { property: "og:image", content: IMAGE },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    {
      property: "og:image:alt",
      content: "Construct's pre-seed deck: the cover slide in front of two more, beside the words Pre-seed deck.",
    },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:site", content: "@use_construct" },
    { name: "twitter:title", content: TITLE },
    { name: "twitter:description", content: DESCRIPTION },
    { name: "twitter:image", content: IMAGE },
  ];
}

export default function Deck() {
  return <DeckViewer />;
}
