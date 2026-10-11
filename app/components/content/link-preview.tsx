import {
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
} from "react";
import { createPortal } from "react-dom";

import { getRoute, routeDisplayTitle } from "../../lib/route-manifest";
import "../../features/content/blog.css";

const WIDTH = 304;
/** About the card's height, for deciding whether it fits above the link. */
const HEIGHT = 270;
const GAP = 10;
const OPEN_DELAY_MS = 280;

/** A link's site route, from `/blog/x/#y` style hrefs, or undefined. */
function routeFor(href: string) {
  if (!href.startsWith("/")) return undefined;
  const path = href.split(/[?#]/)[0]!.replace(/\/+$/, "") || "/";
  return getRoute(path);
}

/**
 * An internal link in a post that, on hover, shows where it goes: that
 * page's social card, title and summary, so a reader can judge a link
 * without leaving the paragraph.
 *
 * Mouse only. Touch has no hover, and keyboard focus already announces the
 * link text, so the card is a visual extra and stays `aria-hidden`. It is
 * portalled to `body` so a table's scroll box cannot clip it.
 */
export function PreviewLink({
  href,
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"a"> & { href: string }) {
  const route = routeFor(href);
  const anchor = useRef<HTMLAnchorElement>(null);
  const timer = useRef(0);
  const [box, setBox] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!box) return;
    const close = () => setBox(null);
    window.addEventListener("scroll", close, { passive: true, once: true });
    return () => window.removeEventListener("scroll", close);
  }, [box]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const open = (event: { pointerType: string }) => {
    if (event.pointerType !== "mouse" || !route) return;
    if (window.location.pathname.replace(/\/+$/, "") === route.path) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (anchor.current) setBox(anchor.current.getBoundingClientRect());
    }, OPEN_DELAY_MS);
  };
  const close = () => {
    window.clearTimeout(timer.current);
    setBox(null);
  };

  return (
    <>
      <a
        {...props}
        ref={anchor}
        href={href}
        className={className}
        onPointerEnter={open}
        onPointerLeave={close}
        onClick={close}
      >
        {children}
      </a>
      {box &&
        route &&
        createPortal(
          <Preview
            box={box}
            title={routeDisplayTitle(route)}
            description={route.description}
            image={new URL(route.image).pathname}
          />,
          document.body,
        )}
    </>
  );
}

function Preview({
  box,
  title,
  description,
  image,
}: {
  box: DOMRect;
  title: string;
  description: string;
  image: string;
}) {
  const left = Math.min(
    Math.max(box.left + box.width / 2 - WIDTH / 2, 12),
    window.innerWidth - WIDTH - 12,
  );
  // Above the link when it fits under the header, anchored by its bottom
  // edge so the gap is exact whatever the summary's length.
  const above = box.top > HEIGHT + GAP + 64;
  const position = above
    ? { bottom: window.innerHeight - box.top + GAP }
    : { top: box.bottom + GAP };
  return (
    <div
      aria-hidden
      className="link-preview pointer-events-none fixed z-50 overflow-hidden rounded-xl border border-[#dcecef] bg-white shadow-[0_24px_60px_-24px_rgba(1,60,70,0.45)]"
      style={{ left, width: WIDTH, ...position }}
    >
      <img
        src={image}
        alt=""
        width="1200"
        height="630"
        className="aspect-[1200/630] w-full border-b border-[#eff3f5] object-cover"
      />
      <div className="px-3.5 py-3">
        <p className="text-[14px] font-semibold leading-5 text-[#4e4646]">
          {title}
        </p>
        <p className="mt-1 line-clamp-2 text-[12.5px] leading-[18px] text-[#627c86]">
          {description}
        </p>
      </div>
    </div>
  );
}
