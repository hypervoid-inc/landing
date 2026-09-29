import { getResource, resourceEntries } from "./resources";
import { useCases } from "./use-cases";
import { getRoute, ogName } from "../lib/route-manifest";

export type NavLink = {
  readonly label: string;
  readonly href: string;
  readonly description: string;
  readonly image: string;
};

export type NavMenu = {
  readonly id: "blog" | "use-cases" | "company";
  readonly label: string;
  readonly kind: "mega" | "list";
  /**
   * Makes the trigger itself a link. Clicking it goes here; the menu still
   * opens on hover, or with ArrowDown from the keyboard.
   */
  readonly href?: string;
  /** Small overline naming the list, such as "Latest posts". */
  readonly heading?: string;
  readonly items: readonly NavLink[];
  /** A "see everything" link set apart below the items. */
  readonly footer?: { readonly label: string; readonly href: string };
};

export type NavItem =
  | { readonly kind: "link"; readonly label: string; readonly href: string }
  | NavMenu;

function previewFor(path: string, label: string): NavLink {
  const href = path.endsWith("/") ? path : `${path}/`;
  const route = getRoute(path.endsWith("/") ? path.slice(0, -1) : path);
  const resource = path.startsWith("/blog/")
    ? getResource(path.replace(/^\/blog\//, "").replace(/\/$/, ""))
    : undefined;
  const description = resource?.description ?? route?.description ?? label;
  const image = route
    ? new URL(route.image).pathname
    : `/og/${ogName(path.endsWith("/") ? path.slice(0, -1) : path)}.jpg`;
  return { label, href, description, image };
}

const companyNavOrder = [
  ["About", "/about/"],
  ["Careers", "/careers/"],
  ["Affiliates", "/affiliates/"],
  ["Support", "/support/"],
] as const;

const companyItems: readonly NavLink[] = companyNavOrder.map(([label, href]) =>
  previewFor(href, label),
);

/** How many of the newest posts the Blog menu lists. */
export const BLOG_MENU_POSTS = 7;

/**
 * The newest posts, newest first. `resourceEntries` is already in that order
 * (the /blog/ grid uses it too) and excludes drafts, so the menu can never
 * disagree with the index or leak an unpublished post.
 */
const blogItems: readonly NavLink[] = resourceEntries
  .slice(0, BLOG_MENU_POSTS)
  .map((entry) => previewFor(`/blog/${entry.slug}/`, entry.title));

const useCaseItems: readonly NavLink[] = useCases.map((entry) =>
  previewFor(`/use-cases/${entry.slug}/`, entry.navLabel),
);

export const primaryNav: readonly NavItem[] = [
  { kind: "link", label: "Pricing", href: "/pricing/" },
  {
    id: "blog",
    label: "Blog",
    kind: "mega",
    href: "/blog/",
    heading: "Latest posts",
    items: blogItems,
    footer: { label: "All posts", href: "/blog/" },
  },
  {
    id: "use-cases",
    label: "Use Cases",
    kind: "list",
    items: useCaseItems,
  },
  {
    id: "company",
    label: "Company",
    kind: "list",
    items: companyItems,
  },
];

export function navItemIsCurrent(pathname: string, item: NavItem): boolean {
  const current =
    pathname.endsWith("/") && pathname.length > 1
      ? pathname.slice(0, -1)
      : pathname;
  if (item.kind === "link") {
    const path = item.href.slice(0, -1);
    return current === path;
  }
  if (item.id === "blog") {
    return current === "/blog" || current.startsWith("/blog/");
  }
  if (item.id === "use-cases") {
    return current === "/use-cases" || current.startsWith("/use-cases/");
  }
  return item.items.some((link) => {
    const path = link.href.endsWith("/") ? link.href.slice(0, -1) : link.href;
    return current === path || current.startsWith(`${path}/`);
  });
}

/**
 * Whether a single destination is the page being viewed, for `aria-current`.
 * Exact match only: on a post, "All posts" is not the current page, and the
 * Blog trigger carries the section highlight instead (`navItemIsCurrent`).
 */
export function navLinkIsCurrent(pathname: string, href: string): boolean {
  const path = href.endsWith("/") ? href.slice(0, -1) : href;
  const current =
    pathname.endsWith("/") && pathname.length > 1
      ? pathname.slice(0, -1)
      : pathname;
  return current === path;
}
