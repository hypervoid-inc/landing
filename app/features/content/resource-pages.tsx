import { Link } from "react-router";
import type { ReactNode } from "react";

import {
  ContentShell,
  formatDate,
  formatShortDate,
} from "../../components/content/content-shell";
import { mdxComponents } from "../../components/content/mdx-components";
import { SiteFooter, SiteHeader } from "../../components/layout/site-layout";
import { getBlogPost } from "../../content/blog";
import type { Author } from "../../content/authors";
import {
  getResource,
  resourceEntries,
  type ResourceEntry,
} from "../../content/resources";
import { getRoute } from "../../lib/route-manifest";

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
          {entry.kind} · {formatShortDate(entry.published)} · {entry.author.name}
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
        <li
          key={tag}
          className="rounded-full bg-[#effbfc] px-2.5 py-1 text-[11px] leading-4 text-[#016d79]"
        >
          {tag}
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
          <a
            href={author.profileUrl}
            target={externalProfile ? "_blank" : undefined}
            rel={externalProfile ? "noopener noreferrer" : undefined}
            className="font-medium text-[#4e4646] hover:text-[#01b4c8]"
          >
            {author.name}
          </a>{" "}
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
