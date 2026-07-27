export const authorIds = ["construct-team", "ankush", "nischal"] as const;

export type AuthorId = (typeof authorIds)[number];

export type Author = {
  readonly id: AuthorId;
  readonly name: string;
  readonly role: string;
  readonly bio: string;
  readonly image: string;
  readonly profileUrl: string;
  readonly twitter: string;
  readonly twitterHandle: string;
  readonly schemaType: "Organization" | "Person";
};

export const authors: Record<AuthorId, Author> = {
  "construct-team": {
    id: "construct-team",
    name: "Construct Team",
    role: "Editorial team",
    bio: "The team building and documenting Construct Computer.",
    image: "/icon-192.png",
    profileUrl: "/about/",
    twitter: "https://x.com/use_construct",
    twitterHandle: "@use_construct",
    schemaType: "Organization",
  },
  ankush: {
    id: "ankush",
    name: "Ankush",
    role: "Author",
    bio: "Writes about Construct, AI agents, and developer tools.",
    image: "/authors/ankush.webp",
    profileUrl: "https://x.com/ankushKun_",
    twitter: "https://x.com/ankushKun_",
    twitterHandle: "@ankushKun_",
    schemaType: "Person",
  },
  nischal: {
    id: "nischal",
    name: "Nischal",
    role: "Author",
    bio: "Writes about Construct, AI agents, and building useful software.",
    image: "/authors/nischal.webp",
    profileUrl: "https://x.com/naik_nischal",
    twitter: "https://x.com/naik_nischal",
    twitterHandle: "@naik_nischal",
    schemaType: "Person",
  },
};

export const defaultAuthor = authors["construct-team"];

export function getAuthor(id: AuthorId): Author {
  return authors[id];
}
