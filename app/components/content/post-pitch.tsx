import type { ComponentProps } from "react";

import type { BlogFrontmatter } from "../../content/schema";
import { pricingPlans } from "../../content/landing";
import { BetaCta } from "./beta-cta";
import { mdxComponents } from "./mdx-components";

/**
 * Said for a comparison post that has no `pitch` of its own. A reader comparing
 * products is deciding, so every comparison opens on one, written or not.
 */
export const COMPARISON_PITCH =
  "Construct gives each of your AI agents a cloud computer with a browser, a terminal, files, and memory, so the work carries on after you close your laptop.";

const entryPrice = pricingPlans[0].price;

/** The pitch a post opens on, or none for an ordinary article or guide. */
export function postPitch(
  post: Pick<BlogFrontmatter, "kind" | "pitch">,
): string | undefined {
  return (
    post.pitch ?? (post.kind === "comparison" ? COMPARISON_PITCH : undefined)
  );
}

/**
 * The call to action a buying-intent post opens on: one line on what Construct
 * does differently for this reader, and the same link the rail and the end of
 * the post use. It sits under the byline, above the cover, so a reader on a
 * phone sees it on the first screen, where the rail is hidden and an authored
 * CTA lands below the image and the contents.
 *
 * Styled as the rail card, and like it a link rather than a form: the reader
 * came to choose a product, not to subscribe to anything.
 */
export function PostPitch({ pitch }: { pitch: string }) {
  return (
    <aside
      aria-label="About Construct"
      className="mt-6 rounded-xl border border-[#b6ecfb] bg-[#f2fcfe] p-4 text-center sm:flex sm:items-center sm:gap-5 sm:px-5 sm:text-left"
    >
      <p className="text-[14px] leading-6 text-[#016d79] sm:flex-1">{pitch}</p>
      <BetaCta source="blog_top" className="mt-3 sm:mt-0 sm:shrink-0" eager>
        {`Start with Construct for ${entryPrice}`}
      </BetaCta>
    </aside>
  );
}

/**
 * Posts author their own `blog_top` CTA under the opening paragraphs. Once
 * `PostPitch` has made that ask above the cover, a second one a screen later
 * repeats it, and two links on one source would blur the click counts. The
 * inline and closing CTAs further down are untouched.
 */
function BodyCta(props: ComponentProps<typeof BetaCta>) {
  return props.source === "blog_top" ? null : <BetaCta {...props} />;
}

/** `mdxComponents` for a post that opens on `PostPitch`. */
export const pitchedMdxComponents = { ...mdxComponents, BetaCta: BodyCta };
