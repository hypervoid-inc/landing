/**
 * What people have said about Construct in public, shown on the homepage.
 *
 * Only real posts go here: public, linked, and quoted word for word. An
 * excerpt is one or more spans copied from `fullText` exactly as written,
 * typos included; spans are joined with an ellipsis when shown, and nothing is
 * ever reworded, fixed or added. The unit test checks every span against the
 * full post. These are not marked up as Review or AggregateRating structured
 * data, which search engines do not allow for reviews a site picks itself.
 */

export type TestimonialPlatform = "X";

export type Testimonial = {
  /** Stable key, also used for the DOM id. */
  id: string;
  /** Display name exactly as it appears on the profile. */
  name: string;
  /** Public handle including the @. */
  handle: string;
  platform: TestimonialPlatform;
  /** The original post. */
  url: string;
  /** ISO date the post went out (UTC). */
  date: string;
  /** The whole post, verbatim, so the excerpt can be checked against it. */
  fullText: string;
  /** Verbatim spans of `fullText`, in order. */
  excerpt: readonly string[];
  /** Short neutral note on what the person was doing. */
  context?: string;
  /**
   * Profile photo copied into public/ (the CSP blocks images from X), as a
   * root-relative path. Without one the card shows the name's initial.
   */
  avatar?: string;
};

export const testimonials: readonly Testimonial[] = [
  {
    id: "itsaditya-malware-forensics",
    name: "Aditya 🦀",
    handle: "@ItsAditya_xyz",
    platform: "X",
    url: "https://x.com/ItsAditya_xyz/status/2097901534046769562",
    date: "2026-09-10",
    fullText:
      "I was seconds away from loosing everything. Got one of my product's repos infected through someone (possibly hacked?). It was interesting case because the code that was forced pushed had obfuscated js code.\n\nDoing any forensic in my own device would have been recipe for disaster for both me and the product and possibly it's users.\n\nAsked ChatGPT, and Claude about the code, they all panicked and refused the actual logic of the malicious code. Decided to  @use_construct as they provide cloud VM with GLM, was able to decode the code.\n\nIt was taking all .envs and browser cookies, wallets etc through node script.",
    excerpt: [
      "Doing any forensic in my own device would have been recipe for disaster for both me and the product and possibly it's users.",
      "Decided to  @use_construct as they provide cloud VM with GLM, was able to decode the code.",
    ],
    context: "Picking apart malicious code from a compromised repo",
    avatar: "/assets/landing/testimonials/itsaditya-xyz.webp",
  },
  {
    id: "a-kraken-head-managing-agents",
    name: "Swapnil",
    handle: "@a_kraken_head",
    platform: "X",
    url: "https://x.com/a_kraken_head/status/2091532475751354647",
    date: "2026-08-23",
    fullText:
      "The most unique way of managing agents i've ever seen in an AI product.",
    excerpt: [
      "The most unique way of managing agents i've ever seen in an AI product.",
    ],
    context: "Reacting to the Construct launch post",
    avatar: "/assets/landing/testimonials/a-kraken-head.webp",
  },
];
