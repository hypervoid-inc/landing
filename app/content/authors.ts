export const authorIds = ["construct-team", "ankush", "nischal"] as const;

export type AuthorId = (typeof authorIds)[number];

export type AuthorLinkIcon =
  "website" | "x" | "linkedin" | "github" | "discord";

/**
 * An off-site profile. Every `href` is also emitted as schema.org `sameAs`.
 * `icon` stays a plain key so this module holds no React imports; the mapping
 * to real components lives in the component layer.
 */
export type AuthorLink = {
  readonly label: string;
  readonly href: string;
  readonly icon: AuthorLinkIcon;
};

export type Author = {
  readonly id: AuthorId;
  readonly name: string;
  readonly role: string;
  readonly bio: string;
  readonly image: string;
  readonly profileUrl: string;
  readonly twitter: string;
  readonly twitterHandle: string;
  readonly links: readonly AuthorLink[];
  readonly schemaType: "Organization" | "Person";
};

export const authors: Record<AuthorId, Author> = {
  "construct-team": {
    id: "construct-team",
    name: "Construct Team",
    role: "Editorial team",
    bio: "The team building and documenting Construct Computer.",
    image: "/icon-192.png",
    profileUrl: "/authors/construct-team/",
    twitter: "https://x.com/use_construct",
    twitterHandle: "@use_construct",
    links: [
      { label: "X", href: "https://x.com/use_construct", icon: "x" },
      {
        label: "LinkedIn",
        href: "https://linkedin.com/company/construct-computer",
        icon: "linkedin",
      },
      {
        label: "Discord",
        href: "https://discord.gg/puArEQHYN9",
        icon: "discord",
      },
    ],
    schemaType: "Organization",
  },
  ankush: {
    id: "ankush",
    name: "Ankush",
    role: "Author",
    bio: "Writes about Construct, AI agents, and developer tools.",
    image: "/authors/ankush.webp",
    profileUrl: "/authors/ankush/",
    twitter: "https://x.com/ankushKun_",
    twitterHandle: "@ankushKun_",
    links: [
      { label: "Website", href: "https://ankush.one", icon: "website" },
      { label: "X", href: "https://x.com/ankushKun_", icon: "x" },
      {
        label: "LinkedIn",
        href: "https://linkedin.com/in/ankushKun",
        icon: "linkedin",
      },
    ],
    schemaType: "Person",
  },
  nischal: {
    id: "nischal",
    name: "Nischal",
    role: "Author",
    bio: "Writes about Construct, AI agents, and building useful software.",
    image: "/authors/nischal.webp",
    profileUrl: "/authors/nischal/",
    twitter: "https://x.com/naik_nischal",
    twitterHandle: "@naik_nischal",
    links: [
      { label: "X", href: "https://x.com/naik_nischal", icon: "x" },
      {
        label: "LinkedIn",
        href: "https://linkedin.com/in/nischal-naik-a188b0288",
        icon: "linkedin",
      },
    ],
    schemaType: "Person",
  },
};

/**
 * Everyone with an indexable `/authors/<id>/` page, in the order they appear
 * on `/authors/`. The organizational byline gets a profile like anyone else.
 */
export const listedAuthors: readonly Author[] = [
  authors.ankush,
  authors.nischal,
  authors["construct-team"],
];

/** Deduplicated `sameAs` set: the X handle plus every listed profile link. */
export function authorSameAs(author: Author): string[] {
  return [
    ...new Set([author.twitter, ...author.links.map(({ href }) => href)]),
  ];
}

export const defaultAuthor = authors["construct-team"];

export function getAuthor(id: AuthorId): Author {
  return authors[id];
}
