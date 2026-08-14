import { comparisonLinks } from "./landing";
import { getResource } from "./resources";
import { useCases } from "./use-cases";
import { getRoute, ogName } from "../lib/route-manifest";

export type NavLink = {
  readonly label: string;
  readonly href: string;
  readonly description: string;
  readonly image: string;
};

export type NavMenu = {
  readonly id: "resources" | "use-cases" | "company";
  readonly label: string;
  readonly kind: "mega" | "list";
  readonly items: readonly NavLink[];
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

const resourceItems: readonly NavLink[] = [
  previewFor("/blog/", "Blog"),
  ...comparisonLinks
    .filter(([, href]) => href !== "/blog/")
    .map(([label, href]) => previewFor(href, label)),
];

const useCaseItems: readonly NavLink[] = useCases.map((entry) =>
  previewFor(`/use-cases/${entry.slug}/`, entry.navLabel),
);

export const primaryNav: readonly NavItem[] = [
  { kind: "link", label: "Pricing", href: "/pricing/" },
  {
    id: "resources",
    label: "Resources",
    kind: "mega",
    items: resourceItems,
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
  if (item.id === "resources") {
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

export function navLinkIsCurrent(pathname: string, href: string): boolean {
  const path = href.endsWith("/") ? href.slice(0, -1) : href;
  const current =
    pathname.endsWith("/") && pathname.length > 1
      ? pathname.slice(0, -1)
      : pathname;
  if (path === "/blog") {
    return current === "/blog" || current.startsWith("/blog/");
  }
  return current === path;
}
