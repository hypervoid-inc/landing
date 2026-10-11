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
import { NotFoundPage } from "../not-found/not-found-page";
import {
  InlineContents,
  RailContents,
  ReadingProgress,
} from "./post-navigation";
import { CardImage } from "./card-image";
import { ResourceCard, TagList } from "./resource-card";
import { ProductHuntProof } from "../product-hunt/product-hunt-proof";
import { getBlogPost } from "../../content/blog";
import {
  getAuthor,
  listedAuthors,
  type Author,
  type AuthorId,
  type AuthorLinkIcon,
} from "../../content/authors";
import { getResourceFaqs } from "../../content/faqs";
import { getRelatedResources } from "../../content/related";
import { trackRelatedClick } from "../../components/content/related-links";
import { getResource } from "../../content/resources";
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

export function ResourcePage({ slug }: { slug: string }) {
  const entry = getResource(slug);
  if (!entry) return <NotFoundPage />;
  const post = getBlogPost(entry.slug);
  if (!post) return <NotFoundPage />;
  const image = getRoute(`/blog/${entry.slug}`)?.image;
  return (
    <ContentShell
      title={post.title}
      article
      breadcrumbs={blogBreadcrumbs}
      aside={
        <ResourceRail
          slug={entry.slug}
          contents={
            <RailContents
              headings={post.headings}
              minutes={post.readingMinutes}
            />
          }
        />
      }
      cover={
        <>
          {image && (
            // The post's own social card, the same image the blog index and a
            // shared link show, so the page opens on what the reader clicked.
            <CardImage
              src={new URL(image).pathname}
              priority
              className="aspect-[1200/630] w-full rounded-2xl border border-[#dcecef] object-cover shadow-[0_24px_60px_-34px_rgba(1,95,110,0.35)]"
            />
          )}
          <InlineContents
            headings={post.headings}
            minutes={post.readingMinutes}
          />
          <ReadingProgress />
        </>
      }
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
      <BetaCta source="blog_end">Try Construct</BetaCta>
      <RelatedResources slug={entry.slug} />
    </ContentShell>
  );
}

/**
 * The desktop rail: three onward links and a standing call to action.
 *
 * Thumbnails sit beside the title at ~96px wide (the social card's 1200×630
 * ratio), not full-column, a stacked 300px crop of the OG art reads as an ad
 * unit and crowds the CTA below.
 *
 * Product Hunt proof sits at the bottom of the rail so it lands nearer
 * mid-viewport while reading without interrupting the article itself.
 */
function ResourceRail({
  slug,
  contents,
}: {
  slug: string;
  /** The post's own table of contents, above where to read next. */
  contents: ReactNode;
}) {
  const related = getRelatedResources(slug, 3);
  return (
    <div className="space-y-6">
      {contents}
      {related.length > 0 && (
        <nav aria-labelledby="rail-heading">
          <h2
            id="rail-heading"
            className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a9aa2]"
          >
            Read next
          </h2>
          <ul className="mt-3 list-none space-y-4 p-0">
            {related.map((item) => {
              const path = `/blog/${item.slug}/`;
              const image = getRoute(path.slice(0, -1))?.image;
              return (
                <li key={item.slug}>
                  <Link
                    to={path}
                    onClick={() => trackRelatedClick("blog_rail", item.slug)}
                    className="group flex gap-3"
                  >
                    {image && (
                      <CardImage
                        src={new URL(image).pathname}
                        className="mt-0.5 aspect-[1200/630] w-[6.25rem] shrink-0 rounded-md object-cover"
                      />
                    )}
                    <span className="min-w-0">
                      <span className="block text-[14px] leading-5 text-[#4e4646] transition-colors group-hover:text-[#01b4c8]">
                        {item.title}
                      </span>
                      <span className="mt-0.5 block text-[11px] capitalize text-[#8a9aa2]">
                        {item.kind} · {formatShortDate(item.published)}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
      <div className="rounded-xl border border-[#b6ecfb] bg-[#f2fcfe] p-4 text-center">
        <p className="text-[13px] leading-5 text-[#016d79]">
          An AI employee with its own computer, memory, and tools.
        </p>
        <BetaCta source="blog_rail" className="mt-3">
          Try Construct
        </BetaCta>
      </div>
      <ProductHuntProof surface="blog-article" variant="rail" />
    </div>
  );
}

/**
 * Matches the `h2` in `mdxComponents`, so the sections appended after a post
 * body read as part of it. `.resource-content` is only a hook class with no
 * stylesheet behind it, so a bare `h2` here would render at browser default
 * beside the italic headings the article itself uses.
 */
const sectionHeading =
  "font-geist text-[22px] italic leading-tight text-[#4e4646] lg:text-[26px]";

/**
 * The end-of-post card grid. Deliberately below the closing `BetaCta`: the
 * conversion ask should not sit underneath four thumbnails.
 */
function RelatedResources({ slug }: { slug: string }) {
  const related = getRelatedResources(slug);
  if (!related.length) return null;
  return (
    <section aria-labelledby="related-heading">
      <h2 id="related-heading" className={sectionHeading}>
        Keep reading
      </h2>
      <ol className="mt-6 grid list-none gap-6 p-0 sm:grid-cols-2">
        {related.map((entry) => (
          <li key={entry.slug}>
            <ResourceCard
              entry={entry}
              onSelect={() => trackRelatedClick("blog_related", entry.slug)}
            />
          </li>
        ))}
      </ol>
    </section>
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
      <h2 id="faq-heading" className={sectionHeading}>
        Frequently asked questions
      </h2>
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
 * same URLs make as schema.org `sameAs`. The icon is decorative, the visible
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
      wide
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
        <ol className="mt-6 grid list-none gap-6 p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
      wide
      title={`Writing tagged ${label}`}
      breadcrumbTitle={label}
      breadcrumbs={blogBreadcrumbs}
      metadata={`${entries.length} Construct resources on ${label}.`}
    >
      <section aria-labelledby="tag-resources-heading">
        <h2 id="tag-resources-heading" className="sr-only">
          Resources tagged {label}
        </h2>
        <ol className="grid list-none gap-6 p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                className={`inline-block rounded-full px-3 py-1 text-[13px] transition-colors ${item === tag ? "bg-[#01b4c8] text-white" : "bg-[#effbfc] text-[#016d79] hover:bg-[#d9f6f5]"}`}
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
          {/* Underlined rather than hover-only: sitting mid-sentence, colour
              alone is not enough to mark it as a link (axe `link-in-text-block`). */}
          <a
            href={author.twitter}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#017b89] underline underline-offset-2"
          >
            {author.twitterHandle}
          </a>
        </p>
      </div>
    </div>
  );
}
