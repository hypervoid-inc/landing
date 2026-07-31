import { Link } from "react-router";
import type { ReactNode } from "react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  DiscordIcon,
  GithubIcon,
  GlobeIcon,
  Linkedin01Icon,
  NewTwitterIcon,
} from "@hugeicons/core-free-icons";

import {
  ContentShell,
  formatDate,
  formatShortDate,
} from "../../components/content/content-shell";
import { BetaCta } from "../../components/content/beta-cta";
import { mdxComponents } from "../../components/content/mdx-components";
import { SiteFooter, SiteHeader } from "../../components/layout/site-layout";
import { getBlogPost } from "../../content/blog";
import {
  getAuthor,
  listedAuthors,
  type Author,
  type AuthorId,
  type AuthorLinkIcon,
} from "../../content/authors";
import { getResourceFaqs } from "../../content/faqs";
import {
  getResource,
  resourceEntries,
  type ResourceEntry,
} from "../../content/resources";
import {
  getRoute,
  hubTags,
  resourcesByAuthor,
  resourcesByTag,
  tagLabel,
} from "../../lib/route-manifest";

const blogBreadcrumbs = [
  { label: "Home", to: "/" },
  { label: "Blog", to: "/blog/" },
];

export function BlogIndexPage() {
  return (
    <ContentShell
      title="Construct insights and guides"
      breadcrumbTitle="Blog"
      metadata="Practical writing from Construct on AI agents, workflows, memory, and tools that get work done."
    >
      <section aria-labelledby="all-resources-heading">
        <h2
          id="all-resources-heading"
          className="font-geist mb-6 text-[28px] italic text-[#4e4646]"
        >
          Latest
        </h2>
        <ol className="grid list-none gap-6 p-0 sm:grid-cols-2">
          {resourceEntries.map((entry) => (
            <li key={entry.slug}>
              <ResourceCard entry={entry} />
            </li>
          ))}
        </ol>
      </section>
      <nav aria-label="Browse" className="flex flex-wrap gap-x-6 gap-y-2">
        <Link to="/authors/" className="text-[#017b89] hover:underline">
          Meet the authors
        </Link>
        {hubTags.map((tag) => (
          <Link
            key={tag}
            to={`/blog/tag/${tag}/`}
            className="text-[#017b89] hover:underline"
          >
            {tagLabel(tag)}
          </Link>
        ))}
      </nav>
    </ContentShell>
  );
}

function ResourceCard({ entry }: { entry: ResourceEntry }) {
  const path = `/blog/${entry.slug}/`;
  const image = getRoute(path.slice(0, -1))?.image;
  return (
    <article className="group h-full overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white transition-colors hover:border-[#8adcdf]">
      {image && (
        <Link to={path} tabIndex={-1} aria-hidden="true">
          <img
            src={new URL(image).pathname}
            alt=""
            width="1200"
            height="630"
            loading="lazy"
            className="aspect-[1200/630] w-full object-cover"
          />
        </Link>
      )}
      <div className="p-6">
        <h3 className="font-geist text-[24px] italic leading-tight text-[#4e4646]">
          <Link to={path} className="group-hover:text-[#01b4c8]">
            {entry.title}
          </Link>
        </h3>
        <p className="resource-card-meta mt-2 overflow-hidden text-ellipsis whitespace-nowrap text-[12px] capitalize text-[#526b75]">
          {entry.kind} · {formatShortDate(entry.published)} ·{" "}
          {entry.author.name}
        </p>
        <p className="mt-3 line-clamp-3 text-[15px] leading-6">
          {entry.description}
        </p>
        <TagList tags={entry.tags} className="mt-4" />
      </div>
    </article>
  );
}

export function ResourcePage({ slug }: { slug: string }) {
  const entry = getResource(slug);
  if (!entry) return <NotFoundPage />;
  const post = getBlogPost(entry.slug);
  if (!post) return <NotFoundPage />;
  return (
    <ContentShell
      title={post.title}
      article
      breadcrumbs={blogBreadcrumbs}
      metadata={
        <>
          <AuthorByline author={entry.author}>
            Published{" "}
            <time dateTime={post.published}>{formatDate(post.published)}</time>
            {post.updated && (
              <>
                {" "}
                · Updated{" "}
                <time dateTime={post.updated}>{formatDate(post.updated)}</time>
              </>
            )}
          </AuthorByline>
          <TagList tags={entry.tags} className="mt-4" />
        </>
      }
    >
      <post.Content components={mdxComponents} />
      <ResourceFaq slug={entry.slug} />
      {/* Rendered here rather than authored so every post closes on one. */}
      <BetaCta source="blog_end">Get beta access</BetaCta>
    </ContentShell>
  );
}

/**
 * Visible counterpart to the `FAQPage` JSON-LD in `routeJsonLd`. Both read the
 * same `resourceFaqs` entry, so the rendered answers always match the markup.
 */
function ResourceFaq({ slug }: { slug: string }) {
  const faqs = getResourceFaqs(slug);
  if (!faqs.length) return null;
  return (
    <section aria-labelledby="faq-heading">
      <h2 id="faq-heading">Frequently asked questions</h2>
      <dl className="mt-6 space-y-6">
        {faqs.map((faq) => (
          <div key={faq.question}>
            <dt className="font-medium text-[#4e4646]">{faq.question}</dt>
            <dd className="mt-2">{faq.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

const linkIcons: Record<AuthorLinkIcon, IconSvgElement> = {
  website: GlobeIcon,
  x: NewTwitterIcon,
  linkedin: Linkedin01Icon,
  github: GithubIcon,
  discord: DiscordIcon,
};

/**
 * Off-site profiles for one author. `rel="me"` states the identity claim these
 * same URLs make as schema.org `sameAs`. The icon is decorative — the visible
 * label carries the accessible name.
 */
function AuthorLinks({
  author,
  className,
}: {
  author: Author;
  className?: string;
}) {
  if (!author.links.length) return null;
  return (
    <ul
      aria-label={`${author.name} elsewhere`}
      className={`flex flex-wrap items-center gap-x-4 gap-y-1 ${className ?? ""}`}
    >
      {author.links.map((link) => (
        <li key={link.href}>
          <a
            href={link.href}
            target="_blank"
            rel="me noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[#017b89] hover:underline"
          >
            <HugeiconsIcon
              icon={linkIcons[link.icon]}
              size={16}
              strokeWidth={1.8}
              className="shrink-0"
              aria-hidden
            />
            {link.label}
          </a>
        </li>
      ))}
    </ul>
  );
}

export function AuthorsIndexPage() {
  return (
    <ContentShell
      title="Authors"
      metadata="The people and team writing Construct's articles, guides, and comparisons."
    >
      <ul className="grid list-none gap-6 p-0 sm:grid-cols-2">
        {listedAuthors.map((author) => {
          const count = resourcesByAuthor(author.id).length;
          return (
            <li key={author.id}>
              <article className="h-full rounded-2xl border border-[#e5e7eb] bg-white p-6 transition-colors hover:border-[#8adcdf]">
                <div className="flex items-center gap-3">
                  <img
                    src={author.image}
                    alt={author.name}
                    width="56"
                    height="56"
                    loading="lazy"
                    className="h-14 w-14 rounded-full object-cover"
                  />
                  <div className="min-w-0">
                    <h2 className="font-geist text-[22px] italic leading-tight text-[#4e4646]">
                      <Link
                        to={author.profileUrl}
                        className="hover:text-[#01b4c8]"
                      >
                        {author.name}
                      </Link>
                    </h2>
                    <p className="text-[12px] text-[#526b75]">
                      {author.role} · {count}{" "}
                      {count === 1 ? "resource" : "resources"}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-[15px] leading-6">{author.bio}</p>
                <AuthorLinks author={author} className="mt-4 text-[13px]" />
              </article>
            </li>
          );
        })}
      </ul>
    </ContentShell>
  );
}

export function AuthorPage({ id }: { id: string }) {
  const author = getAuthor(id as AuthorId);
  if (!author) return <NotFoundPage />;
  const entries = resourcesByAuthor(author.id);
  return (
    <ContentShell
      title={author.name}
      breadcrumbs={[
        { label: "Home", to: "/" },
        { label: "Authors", to: "/authors/" },
      ]}
      metadata={
        <div className="flex items-center gap-3">
          <img
            src={author.image}
            alt={author.name}
            width="64"
            height="64"
            className="h-16 w-16 rounded-full object-cover"
          />
          <div>
            <p className="font-medium text-[#4e4646]">{author.role}</p>
            <p>{author.bio}</p>
            <AuthorLinks author={author} className="mt-2" />
          </div>
        </div>
      }
    >
      <section aria-labelledby="author-resources-heading">
        <h2 id="author-resources-heading">
          {entries.length} {entries.length === 1 ? "resource" : "resources"} by{" "}
          {author.name}
        </h2>
        <ol className="mt-6 grid list-none gap-6 p-0 sm:grid-cols-2">
          {entries.map((entry) => (
            <li key={entry.slug}>
              <ResourceCard entry={entry} />
            </li>
          ))}
        </ol>
      </section>
    </ContentShell>
  );
}

export function TagPage({ tag }: { tag: string }) {
  if (!hubTags.includes(tag)) return <NotFoundPage />;
  const entries = resourcesByTag(tag);
  const label = tagLabel(tag);
  return (
    <ContentShell
      title={`Writing tagged ${label}`}
      breadcrumbTitle={label}
      breadcrumbs={blogBreadcrumbs}
      metadata={`${entries.length} Construct resources on ${label}.`}
    >
      <section aria-labelledby="tag-resources-heading">
        <h2 id="tag-resources-heading" className="sr-only">
          Resources tagged {label}
        </h2>
        <ol className="grid list-none gap-6 p-0 sm:grid-cols-2">
          {entries.map((entry) => (
            <li key={entry.slug}>
              <ResourceCard entry={entry} />
            </li>
          ))}
        </ol>
      </section>
      <nav aria-label="All topics">
        <h2>Browse all topics</h2>
        <ul className="mt-4 flex list-none flex-wrap gap-2 p-0">
          {hubTags.map((item) => (
            <li key={item}>
              <Link
                to={`/blog/tag/${item}/`}
                aria-current={item === tag ? "page" : undefined}
                className={`inline-block rounded-full px-3 py-1 text-[13px] ${item === tag ? "bg-[#01b4c8] text-white" : "bg-[#effbfc] text-[#016d79] hover:bg-[#d9f6f5]"}`}
              >
                {tagLabel(item)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </ContentShell>
  );
}

function TagList({
  tags,
  className,
}: {
  tags?: readonly string[];
  className?: string;
}) {
  if (!tags?.length) return null;
  return (
    <ul
      aria-label="Resource tags"
      className={`flex flex-wrap gap-2 ${className ?? ""}`}
    >
      {tags.map((tag) => (
        <li key={tag}>
          {hubTags.includes(tag) ? (
            <Link
              to={`/blog/tag/${tag}/`}
              className="inline-block rounded-full bg-[#effbfc] px-2.5 py-1 text-[11px] leading-4 text-[#016d79] hover:bg-[#d9f6f5]"
            >
              {tag}
            </Link>
          ) : (
            <span className="inline-block rounded-full bg-[#effbfc] px-2.5 py-1 text-[11px] leading-4 text-[#016d79]">
              {tag}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

function AuthorByline({
  author,
  children,
}: {
  author: Author;
  children: ReactNode;
}) {
  const externalProfile = author.profileUrl.startsWith("http");
  return (
    <div
      role="group"
      aria-label="About the author"
      className="flex items-center gap-3"
    >
      <img
        src={author.image}
        alt={author.name}
        width="48"
        height="48"
        className="h-12 w-12 rounded-full object-cover"
      />
      <div className="min-w-0">
        <p>
          {externalProfile ? (
            <a
              href={author.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[#4e4646] hover:text-[#01b4c8]"
            >
              {author.name}
            </a>
          ) : (
            <Link
              to={author.profileUrl}
              className="font-medium text-[#4e4646] hover:text-[#01b4c8]"
            >
              {author.name}
            </Link>
          )}{" "}
          · {author.role}
        </p>
        <p>{author.bio}</p>
        <p>
          {children} ·{" "}
          <a
            href={author.twitter}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#017b89] hover:underline"
          >
            {author.twitterHandle}
          </a>
        </p>
      </div>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main
        id="main"
        className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-5 py-16"
      >
        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[#01b4c8]">
          404
        </p>
        <h1 className="font-geist mt-4 text-[40px] italic leading-tight text-[#4e4646] sm:text-[52px]">
          Page not found
        </h1>
        <p className="mt-5 max-w-xl leading-7 text-[#627c86]">
          We couldn’t find the page you’re looking for. It may have moved, or
          the link could be out of date.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            to="/"
            className="rounded-full bg-[#01b4c8] px-6 py-3 text-sm font-medium text-white"
          >
            Back to home
          </Link>
          <Link
            to="/support/"
            className="text-sm text-[#01b4c8] hover:underline"
          >
            Contact support
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
