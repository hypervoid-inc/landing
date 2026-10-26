import { useState, useSyncExternalStore, type CSSProperties } from "react";
import { Link } from "react-router";

import {
  ContentShell,
  formatShortDate,
} from "../../components/content/content-shell";
import { contentDate } from "../../content/content-date";
import {
  resourceEntries,
  scheduledEntries,
  type ResourceEntry,
} from "../../content/resources";
import { getRoute, hubTags, tagLabel } from "../../lib/route-manifest";
import { captureAnalytics } from "../analytics/analytics.client";
import { PeekingMascot } from "./blog-mascot";
import { CardImage } from "./card-image";
import { ResourceCard } from "./resource-card";

type Topic = {
  /** Also the `?topic=` value, so a filtered view can be linked to. */
  readonly id: string;
  readonly label: string;
  readonly matches: (entry: ResourceEntry) => boolean;
};

const KIND_TOPICS: readonly Topic[] = [
  {
    id: "comparisons",
    label: "Comparisons",
    matches: (entry) => entry.kind === "comparison",
  },
  { id: "guides", label: "Guides", matches: (entry) => entry.kind === "guide" },
  {
    id: "articles",
    label: "Articles",
    matches: (entry) => entry.kind === "article",
  },
];

/** How many tag chips follow the kinds, most-used tags first. */
const TAG_TOPICS = 6;

const ALL: Topic = { id: "all", label: "All", matches: () => true };

/**
 * All, the three kinds, then the most-used hub tags. A tag that only repeats
 * a kind ("comparison") is left out, since the kind chip already covers it.
 */
const topics: readonly Topic[] = [
  ALL,
  ...KIND_TOPICS,
  ...hubTags
    .filter((tag) => tag !== "comparison")
    .map((tag) => ({
      tag,
      count: resourceEntries.filter((entry) => entry.tags.includes(tag)).length,
    }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, TAG_TOPICS)
    .map(({ tag }): Topic => ({
      id: tag,
      label: tagLabel(tag),
      matches: (entry) => entry.tags.includes(tag),
    })),
];

/** The query string only changes through `choose`, which tracks it itself. */
const ignore = () => () => {};

function readTopic(): string {
  const id = new URLSearchParams(window.location.search).get("topic");
  return topics.some((topic) => topic.id === id) ? id! : ALL.id;
}

export function BlogIndexPage() {
  const [lead, ...rest] = resourceEntries;
  // The prerender has no query string, so it renders "all"; the client then
  // reads `?topic=` after hydration, and a chip the reader picks wins.
  const linkedTopic = useSyncExternalStore(ignore, readTopic, () => ALL.id);
  const [picked, setPicked] = useState<string | null>(null);
  const topicId = picked ?? linkedTopic;
  // Cards only deal back in after the reader picks a topic, never on load.
  const [dealt, setDealt] = useState(false);

  const choose = (id: string) => {
    if (id === topicId) return;
    setPicked(id);
    setDealt(true);
    const url = new URL(window.location.href);
    if (id === ALL.id) url.searchParams.delete("topic");
    else url.searchParams.set("topic", id);
    window.history.replaceState(window.history.state, "", url);
    captureAnalytics("blog_topic_filtered", { topic: id });
  };

  const topic = topics.find((entry) => entry.id === topicId) ?? ALL;
  const shown =
    topic.id === ALL.id ? rest : resourceEntries.filter(topic.matches);

  return (
    <ContentShell
      wide
      title="Construct insights and guides"
      breadcrumbTitle="Blog"
      metadata="Practical writing from Construct on AI agents, workflows, memory, and tools that get work done. A new post every day."
    >
      {lead && <LeadPost entry={lead} />}

      <section aria-labelledby="all-resources-heading">
        <div className="mb-6 flex flex-col gap-4">
          <h2
            id="all-resources-heading"
            className="font-geist text-[28px] italic text-[#4e4646]"
          >
            {topic.id === ALL.id ? "More posts" : topic.label}
          </h2>
          <div
            role="group"
            aria-label="Filter posts by topic"
            className="topic-chips -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0"
          >
            {topics.map((entry) => {
              const count =
                entry.id === ALL.id
                  ? resourceEntries.length
                  : resourceEntries.filter(entry.matches).length;
              const active = entry.id === topic.id;
              return (
                <button
                  key={entry.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => choose(entry.id)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                    active
                      ? "border-[#01b4c8] bg-[#01b4c8] text-white"
                      : "border-[#dcecef] bg-white text-[#4e4646] hover:border-[#8adcdf] hover:bg-[#effbfc]"
                  }`}
                >
                  {entry.label}
                  <span
                    className={`text-[11px] tabular-nums ${active ? "text-white/80" : "text-[#8a9aa2]"}`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <p className="sr-only" aria-live="polite">
          {`${shown.length} posts shown`}
        </p>
        <ol
          key={topic.id}
          className="grid list-none gap-6 p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {shown.map((entry, index) => (
            <li key={entry.slug}>
              <ResourceCard
                entry={entry}
                className={dealt ? "resource-card-enter" : ""}
                style={{ "--i": index } as CSSProperties}
              />
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

/** The soonest finished post waiting for its date, if any. */
function nextScheduled(): ResourceEntry | undefined {
  return scheduledEntries.at(-1);
}

function dayAfter(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

/**
 * The newest post, large, with the mascot peeking over its top edge. It says
 * so when the lead is today's, and names the next scheduled one: a reason to
 * come back.
 */
function LeadPost({ entry }: { entry: ResourceEntry }) {
  const [hovered, setHovered] = useState(false);
  const path = `/blog/${entry.slug}/`;
  const image = getRoute(path.slice(0, -1))?.image;
  const today = entry.published === contentDate;
  const next = nextScheduled();

  return (
    <section
      aria-labelledby="lead-heading"
      className="relative pt-14"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <PeekingMascot
        happy={hovered}
        className="-top-8 right-8 z-0 sm:right-14 lg:right-24"
      />
      <article className="resource-card group relative z-[1] grid overflow-hidden rounded-3xl border border-[#dcecef] bg-white shadow-[0_30px_70px_-40px_rgba(1,95,110,0.45)] lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <Link
          to={path}
          className="absolute inset-0 z-[1]"
          aria-label={entry.title}
        />
        {image && (
          <CardImage
            src={new URL(image).pathname}
            priority
            wrapperClassName="resource-card-media flex items-center border-b border-[#eff3f5] bg-gradient-to-b from-white to-[#f7fbfc] lg:border-b-0 lg:border-r"
            className="aspect-[1200/630] h-auto w-full"
          />
        )}
        <div className="pointer-events-none relative flex flex-col justify-center p-6 sm:p-8">
          <p className="flex flex-wrap items-center gap-2 text-[12px] text-[#526b75]">
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                today
                  ? "bg-[#01b4c8] text-white"
                  : "bg-[#effbfc] text-[#016d79]"
              }`}
            >
              {today ? "New today" : "Latest"}
            </span>
            <span className="capitalize">
              {entry.kind} · {formatShortDate(entry.published)} ·{" "}
              {entry.author.name}
            </span>
          </p>
          <h2
            id="lead-heading"
            className="font-geist mt-4 text-[26px] italic leading-[1.12] tracking-[-0.02em] text-[#4e4646] transition-colors group-hover:text-[#01b4c8] sm:text-[30px]"
          >
            {entry.title}
          </h2>
          <p className="mt-3 line-clamp-3 text-[15px] leading-6 text-[#627c86] sm:text-[16px] sm:leading-7">
            {entry.description}
          </p>
          <span className="mt-5 inline-flex items-center gap-2 text-[14px] font-semibold text-[#017b89]">
            Read the post
            <span
              aria-hidden
              className="transition-transform group-hover:translate-x-1"
            >
              &rarr;
            </span>
          </span>
          {next && (
            <p className="mt-5 border-t border-[#eff3f5] pt-4 text-[13px] leading-5 text-[#526b75]">
              <span className="font-semibold text-[#4e4646]">
                {next.published === dayAfter(contentDate)
                  ? "Tomorrow"
                  : `Next, ${formatShortDate(next.published)}`}
                :
              </span>{" "}
              {next.title}
            </p>
          )}
        </div>
      </article>
    </section>
  );
}
