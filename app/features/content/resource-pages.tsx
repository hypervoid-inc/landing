import { Link } from "react-router";

import {
  ComparisonTable,
  WhenToChoose,
} from "../../components/content/comparison-table";
import {
  ContentShell,
  formatDate,
  List,
  Section,
} from "../../components/content/content-shell";
import { mdxComponents } from "../../components/content/mdx-components";
import { SiteFooter, SiteHeader } from "../../components/layout/site-layout";
import { getBlogPost } from "../../content/blog";
import { getComparison } from "../../content/comparisons";
import { getGuide } from "../../content/guides";
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
      title="AI Employee Resources"
      metadata="Articles, guides, and comparisons for choosing and operating AI that completes real work."
    >
      <div className="space-y-4">
        <p>
          An AI employee accepts an outcome, chooses tools, and completes
          multi-step work from a persistent workspace. This library explains
          that model and compares it with chat assistants, coding agents,
          copilots, and fixed automations.
        </p>
        <p>
          Every resource is listed below in publication order. Labels identify
          practical guides, editorial articles, and product comparisons without
          splitting them across separate URL trees.
        </p>
      </div>
      <section aria-labelledby="all-resources-heading">
        <h2
          id="all-resources-heading"
          className="font-geist mb-6 text-[28px] italic text-[#4e4646]"
        >
          All resources
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
        <p className="text-[12px] uppercase tracking-[0.08em] text-[#8a9aa2]">
          {entry.kind} · {formatDate(entry.date)}
        </p>
        <h3 className="font-geist mt-2 text-[24px] italic leading-tight text-[#4e4646]">
          <Link to={path} className="group-hover:text-[#01b4c8]">
            {entry.title}
          </Link>
        </h3>
        <p className="mt-3 text-[15px] leading-6">{entry.description}</p>
      </div>
    </article>
  );
}

export function ResourcePage({ slug }: { slug: string }) {
  const entry = getResource(slug);
  if (!entry) return <NotFoundPage />;
  if (entry.kind === "article") return <ArticlePage entry={entry} />;
  if (entry.kind === "guide") return <GuidePage entry={entry} />;
  return <ComparisonPage entry={entry} />;
}

function ArticlePage({ entry }: { entry: ResourceEntry }) {
  const post = getBlogPost(entry.sourceSlug);
  if (!post) return <NotFoundPage />;
  return (
    <ContentShell
      title={post.title}
      article
      breadcrumbs={blogBreadcrumbs}
      metadata={
        <>
          Published <time dateTime={post.date}>{formatDate(post.date)}</time>
          {post.updated && (
            <>
              {" "}
              · Updated{" "}
              <time dateTime={post.updated}>{formatDate(post.updated)}</time>
            </>
          )}{" "}
          · {post.author}
        </>
      }
    >
      <post.Content components={mdxComponents} />
    </ContentShell>
  );
}

function GuidePage({ entry }: { entry: ResourceEntry }) {
  const page = getGuide(entry.sourceSlug);
  if (!page) return <NotFoundPage />;
  return (
    <ContentShell
      title={page.title}
      article
      breadcrumbs={blogBreadcrumbs}
      metadata={
        <>
          Updated{" "}
          <time dateTime={page.updated}>{formatDate(page.updated)}</time>
          {" · "}
          {page.summary}
        </>
      }
    >
      {page.sections.map((section) => (
        <Section key={section.title} title={section.title}>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          {section.bullets && (
            <List>
              {section.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </List>
          )}
        </Section>
      ))}
      <RelatedResources resources={page.relatedResources} />
    </ContentShell>
  );
}

function ComparisonPage({ entry }: { entry: ResourceEntry }) {
  const page = getComparison(entry.sourceSlug);
  if (!page) return <NotFoundPage />;
  return (
    <ContentShell
      title={page.title}
      article
      breadcrumbs={blogBreadcrumbs}
      metadata={
        <>
          Updated{" "}
          <time dateTime={page.updated}>{formatDate(page.updated)}</time>
          {" · "}
          {page.summary}
        </>
      }
    >
      <Section title="Comparison basis">
        <p>{page.methodology}</p>
      </Section>
      <Section title="Side by side">
        <ComparisonTable
          competitor={page.competitor}
          rows={page.comparisonTable}
        />
      </Section>
      {page.sections.map((section) => (
        <Section key={section.title} title={section.title}>
          <p>{section.body}</p>
        </Section>
      ))}
      <Section title="When to choose">
        <WhenToChoose
          competitor={page.competitor}
          construct={page.whenToChoose.construct}
          competitorReasons={page.whenToChoose.competitor}
        />
      </Section>
      <Section title="Sources">
        <List>
          {page.sources.map((source) => (
            <li key={source.url}>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#01b4c8] hover:underline"
              >
                {source.label}
              </a>
            </li>
          ))}
        </List>
      </Section>
      <RelatedResources
        resources={[
          ...page.relatedResources,
          { label: "All AI employee resources", path: "/blog/" },
        ]}
      />
    </ContentShell>
  );
}

function RelatedResources({
  resources,
}: {
  resources: readonly { label: string; path: string }[];
}) {
  return (
    <Section title="Related resources">
      <List>
        {resources.map((resource) => (
          <li key={resource.path}>
            <Link to={resource.path} className="text-[#01b4c8] hover:underline">
              {resource.label}
            </Link>
          </li>
        ))}
      </List>
    </Section>
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
