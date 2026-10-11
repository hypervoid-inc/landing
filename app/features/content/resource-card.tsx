import { useRef, type CSSProperties, type PointerEvent } from "react";
import { Link } from "react-router";

import { formatShortDate } from "../../components/content/content-shell";
import type { ResourceEntry } from "../../content/resources";
import { getRoute, hubTags } from "../../lib/route-manifest";
import { CardImage } from "./card-image";
import "./blog.css";

/**
 * A post as a card: its social card on top, then title, meta, summary, tags.
 *
 * On hover the card lifts and its image drifts a few pixels away from the
 * pointer, so the grid answers the reader's hand without anything moving on
 * its own. The drift is driven by `--px` / `--py` (the pointer's offset from
 * the card's centre, -0.5 to 0.5) and `blog.css` turns it off for reduced
 * motion and for touch, where there is no hover to answer.
 */
export function ResourceCard({
  entry,
  onSelect,
  style,
  className = "",
}: {
  entry: ResourceEntry;
  /** Fired when the card's own link is taken, for onward-reading analytics. */
  onSelect?: () => void;
  style?: CSSProperties;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const path = `/blog/${entry.slug}/`;
  const image = getRoute(path.slice(0, -1))?.image;

  const track = (event: PointerEvent<HTMLElement>) => {
    const node = ref.current;
    if (!node || event.pointerType !== "mouse") return;
    const box = node.getBoundingClientRect();
    node.style.setProperty(
      "--px",
      ((event.clientX - box.left) / box.width - 0.5).toFixed(3),
    );
    node.style.setProperty(
      "--py",
      ((event.clientY - box.top) / box.height - 0.5).toFixed(3),
    );
  };
  const reset = () => {
    ref.current?.style.removeProperty("--px");
    ref.current?.style.removeProperty("--py");
  };

  return (
    <article
      ref={ref}
      onPointerMove={track}
      onPointerLeave={reset}
      style={style}
      className={`resource-card group relative h-full overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white ${className}`}
    >
      {/*
        One stretched hit target for the post. Tags sit above it with their own
        pointer-events so hub-tag links still work.
      */}
      <Link
        to={path}
        onClick={onSelect}
        className="absolute inset-0 z-[1]"
        aria-label={entry.title}
      />
      {image && (
        <CardImage
          src={new URL(image).pathname}
          wrapperClassName="resource-card-media"
          className="aspect-[1200/630] w-full object-cover"
        />
      )}
      <div className="pointer-events-none relative z-0 p-6 xl:p-5">
        <h3 className="font-geist text-[24px] italic leading-tight tracking-[-0.015em] text-[#4e4646] transition-colors group-hover:text-[#01b4c8] xl:text-[21px]">
          {entry.title}
        </h3>
        <p className="resource-card-meta mt-2 overflow-hidden text-ellipsis whitespace-nowrap text-[12px] capitalize text-[#526b75]">
          {entry.kind} · {formatShortDate(entry.published)} ·{" "}
          {entry.author.name}
        </p>
        <p className="mt-3 line-clamp-3 text-[15px] leading-6">
          {entry.description}
        </p>
        <TagList
          tags={entry.tags}
          label={`Tags for ${entry.title}`}
          className="pointer-events-auto relative z-[2] mt-4"
        />
      </div>
    </article>
  );
}

export function TagList({
  tags,
  className,
  label = "Resource tags",
}: {
  tags?: readonly string[];
  className?: string;
  /**
   * Distinguishes one card's tags from another's. A post page now carries the
   * article's own list plus one per related card, and several lists sharing a
   * name leaves a screen reader with no way to tell which belongs to what.
   */
  label?: string;
}) {
  if (!tags?.length) return null;
  return (
    <ul
      aria-label={label}
      className={`flex flex-wrap gap-2 ${className ?? ""}`}
    >
      {tags.map((tag) => (
        <li key={tag}>
          {hubTags.includes(tag) ? (
            <Link
              to={`/blog/tag/${tag}/`}
              className="inline-block rounded-full bg-[#effbfc] px-2.5 py-1 text-[11px] leading-4 text-[#016d79] transition-colors hover:bg-[#d9f6f5]"
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
