import { useState } from "react";

/**
 * A post's social card as an image that removes itself, and its wrapper,
 * when the file is missing.
 *
 * Only happens under `pnpm dev`, which lists drafts: a draft gets its card
 * in `public/og/` when it is scheduled and `pnpm og` runs, so until then the
 * card shows its text without a broken image. The ref check catches a
 * failure that happened before hydration, which `onError` cannot.
 */
export function CardImage({
  src,
  className,
  wrapperClassName,
  priority = false,
}: {
  src: string;
  className: string;
  /** When set, the image sits in a `div` with these classes, removed with it. */
  wrapperClassName?: string;
  /** The largest image above the fold: loaded first, never lazily. */
  priority?: boolean;
}) {
  const [missing, setMissing] = useState(false);
  if (missing) return null;
  const image = (
    <img
      ref={(node) => {
        if (node?.complete && node.naturalWidth === 0) setMissing(true);
      }}
      onError={() => setMissing(true)}
      src={src}
      alt=""
      width="1200"
      height="630"
      loading={priority ? undefined : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      className={className}
    />
  );
  return wrapperClassName ? (
    <div className={wrapperClassName}>{image}</div>
  ) : (
    image
  );
}
