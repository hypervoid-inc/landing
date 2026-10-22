import type { ReactNode } from "react";

import { StartLink } from "../../features/landing/beta-access";
import { trialThenPrice } from "../../features/landing/merge-pricing-catalog";
import type {
  BillingInterval,
  PaidPlanId,
} from "../../platform/api/schemas";

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
  className = "my-8",
  eager = false,
  plan,
  interval,
}: {
  children?: ReactNode;
  source?: string;
  /** Wrapper spacing. Overridden by the desktop rail, where `my-8` is too much
   * air inside a small card. */
  className?: string;
  /** Load the mascot right away. Only for a CTA on the first screen, where a
   * lazy image pops in after the pill is already painted. */
  eager?: boolean;
  /** Set on a CTA that names a price or a trial, so sign-up ends at checkout
   * for that plan instead of the welcome dialog. */
  plan?: PaidPlanId;
  interval?: BillingInterval;
}) {
  // A trial CTA says what the trial turns into, so it is never a surprise.
  const then = plan ? trialThenPrice(plan, interval) : null;
  return (
    <p className={`${className} text-center`}>
      <StartLink
        source={source}
        plan={plan}
        interval={interval}
        className="inline-flex items-center gap-2.5 rounded-full border border-[#b6ecfb] bg-[#f2fcfe] py-2 pl-4 pr-5 text-[15px] font-medium text-[#017b89] no-underline transition-colors hover:bg-[#e8faff]"
      >
        <MascotEyes eager={eager} />
        {children ?? "Try Construct"}
        <span aria-hidden="true">&rarr;</span>
      </StartLink>
      {then ? (
        <span className="mt-1.5 block text-[13px] leading-5 text-[#016d79]">
          {`Then ${then} unless you cancel.`}
        </span>
      ) : null}
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
function MascotEyes({ eager }: { eager: boolean }) {
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
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        className="-my-2.5 h-9 w-auto shrink-0"
      />
    </picture>
  );
}
