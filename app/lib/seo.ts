import type { MetaDescriptor } from "react-router";
import { landingFaq } from "../content/landing";
import { getResourceFaqs, type FaqItem } from "../content/faqs";
import { authorSameAs, listedAuthors, type Author } from "../content/authors";
import type { CanonicalRoute } from "./route-manifest";
import {
  resourcesByAuthor,
  resourcesByTag,
  routeDisplayTitle as displayTitle,
  siteUrl,
} from "./route-manifest";

type JsonLd = Record<string, unknown>;

const editorialKinds = ["blog-post", "guide", "comparison"];

function isEditorial(route: CanonicalRoute): boolean {
  return editorialKinds.includes(route.kind);
}

function faqPageJsonLd(items: readonly FaqItem[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

/**
 * The profile entity for an author. Organizational bylines describe the company
 * itself, so they must not claim `Person`, `jobTitle`, or `worksFor`.
 */
function authorEntityJsonLd(author: Author): JsonLd {
  const person = author.schemaType === "Person";
  return {
    "@context": "https://schema.org",
    "@type": author.schemaType,
    "@id": `${siteUrl}${author.profileUrl}#${person ? "person" : "team"}`,
    name: author.name,
    description: author.bio,
    url: new URL(author.profileUrl, siteUrl).toString(),
    image: new URL(author.image, siteUrl).toString(),
    sameAs: authorSameAs(author),
    ...(person
      ? {
          jobTitle: author.role,
          worksFor: { "@id": `${siteUrl}/#organization` },
        }
      : { parentOrganization: { "@id": `${siteUrl}/#organization` } }),
  };
}

function itemListJsonLd(
  entries: readonly { slug: string; title: string }[],
): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: entries.map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: entry.title,
      url: `${siteUrl}/blog/${entry.slug}/`,
    })),
  };
}

function editorialAuthor(route: CanonicalRoute): Author {
  if (!route.author) throw new Error(`Missing author for ${route.path}`);
  return route.author;
}

export function organizationJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteUrl}/#organization`,
    name: "Construct Computer",
    alternateName: "Construct",
    description:
      "Construct Computer builds a supervised workspace for an AI employee that researches, operates tools, creates files, and runs recurring work through connected apps.",
    url: siteUrl,
    logo: {
      "@type": "ImageObject",
      url: `${siteUrl}/icon-512.png`,
      width: 512,
      height: 512,
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "support@construct.computer",
        url: `${siteUrl}/support/`,
        availableLanguage: "English",
      },
      {
        "@type": "ContactPoint",
        contactType: "sales",
        email: "enterprise@construct.computer",
        availableLanguage: "English",
      },
    ],
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
  const parent =
    isEditorial(route) || route.kind === "tag"
      ? { name: "Blog", path: "/blog" }
      : route.kind === "author"
        ? { name: "Authors", path: "/authors" }
        : null;
  const items = [
    { name: "Home", url: `${siteUrl}/` },
    ...(parent
      ? [{ name: parent.name, url: `${siteUrl}${parent.path}/` }]
      : []),
    {
      name: displayTitle(route),
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
    values.push(
      websiteJsonLd(),
      softwareApplicationJsonLd(),
      faqPageJsonLd(landingFaq),
    );
  } else values.push(breadcrumbs(route));

  if (isEditorial(route)) {
    const author = editorialAuthor(route);
    const slug = route.path.replace("/blog/", "");
    values.push({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: displayTitle(route),
      description: route.description,
      inLanguage: "en-US",
      ...(route.published ? { datePublished: route.published } : {}),
      dateModified: route.lastModified ?? route.published,
      author: {
        "@type": author.schemaType,
        name: author.name,
        url: new URL(author.profileUrl, siteUrl).toString(),
        image: new URL(author.image, siteUrl).toString(),
        sameAs: authorSameAs(author),
      },
      keywords: route.tags,
      articleSection: route.kind === "comparison" ? "Comparison" : "Guide",
      publisher: { "@id": `${siteUrl}/#organization` },
      isPartOf: { "@id": `${siteUrl}/#website` },
      image: route.image,
      mainEntityOfPage: { "@type": "WebPage", "@id": route.canonical },
    });
    const faqs = getResourceFaqs(slug);
    if (faqs.length) values.push(faqPageJsonLd(faqs));
  }

  if (route.kind === "author-index") {
    values.push({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": `${route.canonical}#collection`,
      name: displayTitle(route),
      description: route.description,
      isPartOf: { "@id": `${siteUrl}/#website` },
      mainEntity: {
        "@type": "ItemList",
        itemListElement: listedAuthors.map((author, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: author.name,
          url: new URL(author.profileUrl, siteUrl).toString(),
        })),
      },
    });
  }

  if (route.kind === "author") {
    const author = editorialAuthor(route);
    values.push(
      {
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        "@id": `${route.canonical}#profile`,
        mainEntity: {
          "@id": `${siteUrl}${author.profileUrl}#${author.schemaType === "Person" ? "person" : "team"}`,
        },
        isPartOf: { "@id": `${siteUrl}/#website` },
      },
      authorEntityJsonLd(author),
      itemListJsonLd(resourcesByAuthor(author.id)),
    );
  }

  if (route.kind === "tag") {
    values.push(
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "@id": `${route.canonical}#collection`,
        name: displayTitle(route),
        description: route.description,
        isPartOf: { "@id": `${siteUrl}/#website` },
      },
      itemListJsonLd(resourcesByTag(route.tags?.[0] ?? "")),
    );
  }

  return values;
}

export function routeMeta(route: CanonicalRoute): MetaDescriptor[] {
  const article = isEditorial(route);
  const author = article ? editorialAuthor(route) : undefined;
  return [
    { title: route.title },
    { name: "description", content: route.description },
    { name: "robots", content: "index, follow, max-image-preview:large" },
    { tagName: "link", rel: "canonical", href: route.canonical },
    { property: "og:type", content: article ? "article" : "website" },
    { property: "og:site_name", content: "Construct Computer" },
    { property: "og:locale", content: "en_US" },
    { property: "og:title", content: displayTitle(route) },
    { property: "og:description", content: route.description },
    { property: "og:url", content: route.canonical },
    { property: "og:image", content: route.image },
    { property: "og:image:type", content: "image/jpeg" },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    {
      property: "og:image:alt",
      content: displayTitle(route),
    },
    ...(article && route.published
      ? [{ property: "article:published_time", content: route.published }]
      : []),
    ...(article && route.lastModified
      ? [{ property: "article:modified_time", content: route.lastModified }]
      : []),
    ...(article
      ? (route.tags ?? []).map((tag) => ({
          property: "article:tag",
          content: tag,
        }))
      : []),
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:site", content: "@use_construct" },
    ...(author
      ? [{ name: "twitter:creator", content: author.twitterHandle }]
      : []),
    { name: "twitter:title", content: displayTitle(route) },
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
