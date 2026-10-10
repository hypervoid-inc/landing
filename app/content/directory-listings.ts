export type DirectoryListing = {
  /** Stable slug, used as the `data-directory-listing` hook. */
  readonly id: string;
  /** Listing URL, exactly as the directory's embed snippet gives it. */
  readonly href: string;
  /** Self-hosted copy under `public/`, the CSP allows no directory hosts. */
  readonly image: string;
  readonly alt: string;
  /** Display size from the directory's embed snippet (the file is 2x). */
  readonly width: number;
  readonly height: number;
};

/**
 * Directories that list Construct and ask for a badge linking back. Most keep
 * a free listing only while the homepage carries the link, so the footer strip
 * renders these on `/` and nowhere else.
 *
 * To add one: save the badge as a 2x webp in `public/assets/landing/badges/`
 * and append an entry. The strip sizes and paces itself from this list.
 */
export const directoryListings: readonly DirectoryListing[] = [
  {
    id: "launch-llama",
    href: "https://tools.launchllama.co/products/construct-computer?utm_source=badge&utm_medium=referral",
    image: "/assets/landing/badges/launch-llama.webp",
    alt: "Featured on Launch Llama Tools",
    width: 204,
    height: 54,
  },
  {
    id: "huzzler",
    href: "https://huzzler.so/products/c0e4BxXfp3/construct-computer?utm_source=huzzler_product_website&utm_medium=badge&utm_campaign=free_listing",
    image: "/assets/landing/badges/huzzler.webp",
    alt: "Featured on Huzzler",
    width: 159,
    height: 55,
  },
  {
    id: "startup-fame",
    href: "https://startupfa.me/s/construct?utm_source=construct.computer",
    image: "/assets/landing/badges/startup-fame.webp",
    alt: "Construct Computer - Featured on Startup Fame",
    width: 171,
    height: 54,
  },
  // The next three are one SourceForge listing syndicated to its sister
  // sites. Their snippets load a script that injects the badge, so the href
  // here is the one that script builds, campaign parameters included.
  {
    id: "sourceforge",
    href: "https://sourceforge.net/software/product/Construct-Computer/?pk_campaign=badge&pk_source=vendor",
    image: "/assets/landing/badges/sourceforge.webp",
    alt: "Construct Computer Reviews on SourceForge",
    width: 50,
    height: 54,
  },
  {
    id: "slashdot",
    href: "https://slashdot.org/software/p/Construct-Computer/?pk_campaign=badge&pk_source=vendor",
    image: "/assets/landing/badges/slashdot.webp",
    alt: "Construct Computer Reviews on Slashdot",
    width: 48,
    height: 54,
  },
  {
    id: "top-business-software",
    href: "https://topbusinesssoftware.com/products/Construct-Computer/reviews/?pk_campaign=badge&pk_source=vendor",
    image: "/assets/landing/badges/top-business-software.webp",
    alt: "Construct Computer Reviews on Top Business Software",
    width: 54,
    height: 54,
  },
];
