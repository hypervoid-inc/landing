import type { MetaDescriptor } from "react-router";

import { siteUrl } from "../lib/route-manifest";

// Figma's /slides/ embed is its file viewer, the only one with the thumbnail
// rail. The /deck/ one is the presentation view, with no list of slides.
const DECK_EMBED =
  "https://embed.figma.com/slides/ml8KWViv95ZR9Lj72h5lcY/Constrct-Computer?embed-host=construct&footer=false&theme=dark";

export function meta(): MetaDescriptor[] {
  return [
    { title: "Construct Computer deck" },
    // Shared by link with investors, not a page for search or AI answers.
    // robots.txt also disallows it, and _headers sends the same as
    // X-Robots-Tag.
    {
      name: "robots",
      content: "noindex, nofollow, noarchive, nosnippet, noimageindex",
    },
    { tagName: "link", rel: "canonical", href: `${siteUrl}/deck/` },
  ];
}

export default function Deck() {
  return (
    <main className="fixed inset-0 bg-black">
      <iframe
        src={DECK_EMBED}
        title="Construct Computer deck"
        className="h-full w-full border-0"
        allow="fullscreen"
        allowFullScreen
      />
    </main>
  );
}
