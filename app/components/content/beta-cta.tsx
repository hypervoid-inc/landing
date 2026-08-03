import type { ReactNode } from "react";

import { StartLink } from "../../features/landing/beta-access";

/**
 * Inline call to action for MDX bodies. Authors place these at roughly even
 * intervals down a post so one is in view at most scroll positions, which is
 * the whole point: a single CTA at the end only reaches readers who finish.
 *
 * Deliberately a formatted link rather than a banner or card. The house voice
 * does not interrupt an argument to sell, and a boxed advert mid-paragraph
 * reads as one. Resolved through `mdxComponents`, so MDX needs no import.
 */
export function BetaCta({
  children,
  source = "blog_inline",
}: {
  children?: ReactNode;
  source?: string;
}) {
  return (
    <p className="my-8 text-center">
      <StartLink
        source={source}
        className="inline-flex items-center gap-2.5 rounded-full border border-[#b6ecfb] bg-[#f2fcfe] py-2 pl-4 pr-5 text-[15px] font-medium text-[#017b89] no-underline transition-colors hover:bg-[#e8faff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#01b4c8]"
      >
        <MascotEyes />
        {children ?? "Try Construct"}
        <span aria-hidden="true">&rarr;</span>
      </StartLink>
    </p>
  );
}

/**
 * The animated build loops forever, so it is swapped for a single frame when
 * the reader has asked for less motion. Both are decorative next to the link's
 * own text, hence the empty alt.
 *
 * The negative block margin is deliberate: the mascot is taller than the pill's
 * text line and is allowed to overflow top and bottom, contributing only its
 * shrunken box to layout so the pill height stays put.
 */
function MascotEyes() {
  return (
    <picture>
      <source
        media="(prefers-reduced-motion: reduce)"
        srcSet="/assets/construct/mascot-eyes-static.webp"
      />
      <img
        src="/assets/construct/mascot-eyes.webp"
        alt=""
        width={34}
        height={36}
        loading="lazy"
        decoding="async"
        className="-my-2.5 h-9 w-auto shrink-0"
      />
    </picture>
  );
}
