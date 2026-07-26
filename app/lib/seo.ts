import type { MetaDescriptor } from "react-router";
import { landingFaq } from "../content/landing";
import type { CanonicalRoute } from "./route-manifest";
import { siteUrl } from "./route-manifest";

type JsonLd = Record<string, unknown>;

export function organizationJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteUrl}/#organization`,
    name: "Construct Computer",
    alternateName: "Construct",
    url: siteUrl,
    sameAs: [
      "https://x.com/use_construct",
      "https://github.com/construct-computer",
      "https://linkedin.com/company/construct-computer",
      "https://discord.gg/puArEQHYN9",
    ],
  };
}

export function websiteJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    name: "Construct Computer",
    url: `${siteUrl}/`,
    publisher: { "@id": `${siteUrl}/#organization` },
  };
}

export function softwareApplicationJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${siteUrl}/#software`,
    name: "Construct Computer",
    applicationCategory: "ProductivityApplication",
    operatingSystem: "Web",
    url: `${siteUrl}/`,
    publisher: { "@id": `${siteUrl}/#organization` },
  };
}

function breadcrumbs(route: CanonicalRoute): JsonLd {
  const parent = ["blog-post", "guide", "comparison"].includes(route.kind)
    ? { name: "Blog", path: "/blog" }
    : null;
  const items = [
    { name: "Home", url: `${siteUrl}/` },
    ...(parent
      ? [{ name: parent.name, url: `${siteUrl}${parent.path}/` }]
      : []),
    {
      name: route.title.replace(" - Construct Computer", ""),
      url: route.canonical,
    },
  ];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function routeJsonLd(route: CanonicalRoute): JsonLd[] {
  const values = [organizationJsonLd()];
  if (route.kind === "home") {
    values.push(websiteJsonLd(), softwareApplicationJsonLd(), {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: landingFaq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    });
  } else values.push(breadcrumbs(route));
  if (["blog-post", "guide", "comparison"].includes(route.kind)) {
    values.push({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: route.title.replace(" - Construct Computer", ""),
      description: route.description,
      ...(route.published ? { datePublished: route.published } : {}),
      ...(route.lastModified ? { dateModified: route.lastModified } : {}),
      author: {
        "@type": "Organization",
        name: route.author ?? "Construct Team",
        url: `${siteUrl}/about/`,
      },
      publisher: { "@id": `${siteUrl}/#organization` },
      image: route.image,
      mainEntityOfPage: { "@type": "WebPage", "@id": route.canonical },
    });
  }
  return values;
}

export function routeMeta(route: CanonicalRoute): MetaDescriptor[] {
  const article = ["blog-post", "guide", "comparison"].includes(route.kind);
  return [
    { title: route.title },
    { name: "description", content: route.description },
    { name: "robots", content: "index, follow, max-image-preview:large" },
    { tagName: "link", rel: "canonical", href: route.canonical },
    { property: "og:type", content: article ? "article" : "website" },
    { property: "og:site_name", content: "Construct Computer" },
    { property: "og:locale", content: "en_US" },
    { property: "og:title", content: route.title },
    { property: "og:description", content: route.description },
    { property: "og:url", content: route.canonical },
    { property: "og:image", content: route.image },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    {
      property: "og:image:alt",
      content: `${route.title} — Construct Computer`,
    },
    ...(article && route.published
      ? [{ property: "article:published_time", content: route.published }]
      : []),
    ...(article && route.lastModified
      ? [{ property: "article:modified_time", content: route.lastModified }]
      : []),
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:site", content: "@use_construct" },
    { name: "twitter:title", content: route.title },
    { name: "twitter:description", content: route.description },
    { name: "twitter:image", content: route.image },
    { "script:ld+json": routeJsonLd(route) as never },
  ];
}

export const notFoundMeta: MetaDescriptor[] = [
  { title: "Page not found - Construct Computer" },
  {
    name: "description",
    content:
      "The page you requested does not exist on construct.computer. Return to the homepage or contact support for help.",
  },
  { name: "robots", content: "noindex, follow" },
];
