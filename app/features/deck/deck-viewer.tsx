import { ChevronLeft, ChevronRight, Download, LayoutGrid } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "../../lib/cn";
import {
  captureAnalytics,
  captureAnalyticsBeforeLeave,
  recordWholeSession,
  registerDeckRecipient,
} from "../analytics/analytics.client";
import { activitySnapshot, noteLink, notePdf, onActivity } from "./deck-activity";
import { startDeckPing } from "./deck-ping";
import {
  createSlideClock,
  readingIndex,
  recipientFromSearch,
  type SlideTime,
} from "./deck-tracking";
import { DeckOverview } from "./deck-overview";
import { DeckPdf } from "./deck-pdf";
import { SlideVideo } from "./slide-video";
import { boxStyle, DECK_VERSION, slideImage, slides } from "./slides";

type Via = "open" | "scroll" | "rail" | "overview" | "button" | "key" | "return";

/**
 * A slide counts as viewed once it has been the one being read this long, so
 * the slides a jump or a fast scroll flies past don't.
 */
const SETTLE_MS = 400;
/** How long a rail tap or key press may take to land before it's a scroll. */
const NAVIGATION_MS = 1500;

const KEY_STEPS: Record<string, number> = {
  ArrowDown: 1,
  ArrowRight: 1,
  PageDown: 1,
  " ": 1,
  ArrowUp: -1,
  ArrowLeft: -1,
  PageUp: -1,
};

/**
 * The investor deck. On a wide screen: one slide per screen and a thumbnail
 * rail. On a phone: the slides full width in one plain scroll, so pinch-zoom
 * works for the small print. Both get a bar under the slides: previous, where
 * you are (which opens every slide at a glance), next, and the PDF.
 */
export function DeckViewer() {
  const [active, setActive] = useState(0);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const sections = useRef<(HTMLElement | null)[]>([]);
  const rail = useRef<HTMLElement>(null);
  const thumbs = useRef<(HTMLButtonElement | null)[]>([]);
  const activeIndex = useRef(0);
  /**
   * Where the last jump went. It stays the slide being read for as long as
   * it's on screen, until the reader scrolls by hand, since a centred slide
   * near either end of the deck isn't always where the reading line falls.
   */
  const pinned = useRef<number | null>(null);
  const navigation = useRef<{ via: Via; target: number; until: number }>({
    via: "open",
    target: 0,
    until: Number.POSITIVE_INFINITY,
  });

  function goTo(index: number, via: Via) {
    const target = Math.max(0, Math.min(slides.length - 1, index));
    navigation.current = { via, target, until: performance.now() + NAVIGATION_MS };
    pinned.current = target;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    sections.current[target]?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "center",
    });
  }

  function openOverview() {
    setOverviewOpen(true);
    captureAnalytics("deck_overview_opened", { deck_version: DECK_VERSION, slide: active + 1 });
  }

  function openPdf() {
    setPdfOpen(true);
    notePdf("opened");
    captureAnalytics("deck_pdf_opened", { deck_version: DECK_VERSION, slide: active + 1 });
  }

  useEffect(() => {
    const recipient = recipientFromSearch(window.location.search);
    if (recipient) registerDeckRecipient(recipient);
    const ping = startDeckPing(recipient);
    recordWholeSession();
    captureAnalytics("deck_opened", {
      deck_version: DECK_VERSION,
      slide_count: slides.length,
    });

    const clock = createSlideClock(() => performance.now());
    let completed = false;
    let settled = -1;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;
    let frame = 0;

    const slideProperties = (slide: number) => ({
      deck_version: DECK_VERSION,
      slide,
      slide_title: slides[slide - 1]?.title,
    });

    /** Where the reading stands, for the visit alert. */
    const summarize = (final: boolean) => ({
      final,
      seconds: clock.totalSeconds(),
      slides: clock.secondsBySlide(slides.length),
      ...(clock.current ? { current: clock.current } : {}),
      completed,
      ...activitySnapshot(),
    });

    const reportLeft = (left: SlideTime | null, leaving: boolean) => {
      if (!left) return;
      const properties = { ...slideProperties(left.slide), seconds: left.seconds };
      if (leaving) void captureAnalyticsBeforeLeave("deck_slide_left", properties);
      else captureAnalytics("deck_slide_left", properties);
    };

    const settle = (index: number) => {
      const pending = navigation.current;
      navigation.current = { via: "scroll", target: index, until: 0 };
      // Back on the slide already counted, after a brush with the next one.
      if (index === settled) return;
      settled = index;
      const via = performance.now() <= pending.until ? pending.via : "scroll";
      const slide = index + 1;
      const { left, firstView } = clock.enter(slide);
      reportLeft(left, false);
      captureAnalytics("deck_slide_viewed", {
        ...slideProperties(slide),
        via,
        first_view: firstView,
      });
      // Opened in a background tab: the clock starts when the tab is shown.
      if (document.visibilityState === "hidden") clock.pause();
      if (slide === slides.length && !completed) {
        completed = true;
        captureAnalytics("deck_completed", {
          deck_version: DECK_VERSION,
          seconds_total: clock.totalSeconds(),
          slides_seen: clock.seenCount,
        });
        ping.event("completed", summarize(false));
        return;
      }
      ping.update(summarize(false));
    };

    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const index = readingIndex(
        sections.current.map((section) => section?.getBoundingClientRect() ?? { top: 0, bottom: 0 }),
        max > 0 ? window.scrollY / max : 0,
        window.innerHeight,
        pinned.current,
      );
      if (index === activeIndex.current && settleTimer !== undefined) return;
      activeIndex.current = index;
      setActive(index);
      clearTimeout(settleTimer);
      settleTimer = setTimeout(() => settle(index), SETTLE_MS);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    // A hand on the page ends a jump's pin; the jump's own smooth scroll
    // fires none of these. A tap on the bar lands here first, then pins anew.
    const unpin = () => {
      pinned.current = null;
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    for (const type of ["wheel", "touchmove", "pointerdown"] as const) {
      window.addEventListener(type, unpin, { passive: true });
    }

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        reportLeft(clock.pause(), true);
        ping.event("left", summarize(true));
        return;
      }
      const slide = clock.resume();
      if (slide === null) return;
      ping.event("returned", summarize(false));
      captureAnalytics("deck_slide_viewed", {
        ...slideProperties(slide),
        via: "return",
        first_view: false,
      });
    };
    const onPageHide = () => {
      reportLeft(clock.pause(), true);
      ping.event("left", summarize(true));
    };
    const offActivity = onActivity((moment) => {
      if (!moment) return ping.update(summarize(false));
      ping.event(moment.event, summarize(false), "detail" in moment ? moment.detail : undefined);
    });
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      offActivity();
      clearTimeout(settleTimer);
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      for (const type of ["wheel", "touchmove", "pointerdown"] as const) {
        window.removeEventListener(type, unpin);
      }
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      const focused = event.target as HTMLElement | null;
      // Typing an email, or anything inside a dialog, never pages.
      if (focused?.closest?.("input, textarea, select, [contenteditable], [role='dialog']")) return;
      if (event.key === " " && focused?.closest?.("a, button")) return;
      const pending = navigation.current;
      const from =
        performance.now() <= pending.until ? pending.target : activeIndex.current;
      const step = KEY_STEPS[event.key];
      let target: number;
      if (event.key === "Home") target = 0;
      else if (event.key === "End") target = slides.length - 1;
      else if (step) target = from + (event.key === " " && event.shiftKey ? -step : step);
      else return;
      event.preventDefault();
      goTo(target, "key");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Keep the current slide's thumbnail in view without touching the page's
  // own scroll, which may be mid-animation.
  useEffect(() => {
    const container = rail.current;
    const thumb = thumbs.current[active];
    if (!container || !thumb) return;
    const top = thumb.offsetTop - 16;
    const bottom = thumb.offsetTop + thumb.offsetHeight + 16;
    if (top < container.scrollTop) container.scrollTop = top;
    else if (bottom > container.scrollTop + container.clientHeight) {
      container.scrollTop = bottom - container.clientHeight;
    }
  }, [active]);

  return (
    <main className="deck bg-[#0b0b0c] pt-2 pb-24 lg:p-0">
      <DeckPdf slide={active + 1} open={pdfOpen} onOpenChange={setPdfOpen} />
      <DeckOverview
        open={overviewOpen}
        onOpenChange={setOverviewOpen}
        active={active}
        onPick={(index) => goTo(index, "overview")}
      />
      <nav
        ref={rail}
        aria-label="Slides"
        className="fixed inset-y-0 left-0 z-10 hidden w-56 overflow-y-auto overscroll-contain px-4 py-6 [scrollbar-width:none] lg:block"
      >
        <ol className="space-y-3">
          {slides.map((slide, index) => (
            <li key={slide.title}>
              <button
                ref={(node) => {
                  thumbs.current[index] = node;
                }}
                type="button"
                onClick={() => goTo(index, "rail")}
                aria-label={`${index + 1}. ${slide.title}`}
                aria-current={index === active ? "true" : undefined}
                className={cn(
                  "block w-full cursor-pointer overflow-hidden rounded-md ring-2 ring-offset-2 ring-offset-[#0b0b0c] transition",
                  index === active
                    ? "ring-[#01b4c8]"
                    : "opacity-60 ring-transparent hover:opacity-100",
                )}
              >
                <img
                  src={slideImage(index, "thumb")}
                  alt=""
                  width={480}
                  height={270}
                  decoding="async"
                  draggable={false}
                  className="block aspect-video w-full"
                />
              </button>
            </li>
          ))}
        </ol>
      </nav>
      <div className="lg:pl-56">
        {slides.map((slide, index) => (
          <section
            key={slide.title}
            ref={(node) => {
              sections.current[index] = node;
            }}
            data-slide={index}
            aria-label={`Slide ${index + 1}, ${slide.title}`}
            className="flex items-center justify-center px-2 py-1 sm:px-4 lg:h-dvh lg:snap-start lg:px-6 lg:pt-6 lg:pb-22"
          >
            <figure className="@container relative aspect-video w-full max-w-[calc((100svh-1rem)*16/9)] overflow-hidden rounded-md select-none lg:max-w-[calc((100dvh-7rem)*16/9)] lg:rounded-lg">
              <img
                src={slideImage(index, "1x")}
                srcSet={`${slideImage(index, "1x")} 1920w, ${slideImage(index, "2x")} 3840w`}
                sizes="(min-width: 1024px) calc(100vw - 14rem), 100vw"
                alt={slide.alt}
                width={1920}
                height={1080}
                loading={index === 0 ? "eager" : "lazy"}
                fetchPriority={index === 0 ? "high" : undefined}
                decoding="async"
                draggable={false}
                className="block size-full"
              />
              {slide.videos?.map((video) => (
                <SlideVideo key={video.name} video={video} slide={index + 1} />
              ))}
              {slide.links?.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  target="_blank"
                  rel="noopener"
                  aria-label={link.label}
                  onClick={() => {
                    noteLink(link.name);
                    captureAnalytics("deck_link_clicked", {
                      deck_version: DECK_VERSION,
                      slide: index + 1,
                      link: link.name,
                    });
                  }}
                  className="absolute rounded-[1cqw] transition hover:bg-[#01b4c8]/8 focus-visible:ring-2 focus-visible:ring-[#01b4c8] focus-visible:outline-none"
                  style={boxStyle(link.box)}
                />
              ))}
            </figure>
          </section>
        ))}
      </div>
      <div className="pointer-events-none fixed inset-x-0 bottom-3 z-20 flex justify-center px-3 lg:bottom-5 lg:left-56">
        <div className="pointer-events-auto flex max-w-full items-center rounded-full bg-white p-1 text-sm font-medium text-[#0d1630] shadow-[0_6px_24px_rgba(0,0,0,.4)] ring-1 ring-black/10">
          <button
            type="button"
            onClick={() => goTo(active - 1, "button")}
            disabled={active === 0}
            aria-label="Previous slide"
            className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full transition hover:bg-black/5 disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronLeft aria-hidden className="size-5" />
          </button>
          <button
            type="button"
            onClick={openOverview}
            aria-label={`All slides, on ${active + 1} of ${slides.length}`}
            className="flex h-10 min-w-0 cursor-pointer items-center gap-2 rounded-full px-3 transition hover:bg-black/5"
          >
            <LayoutGrid aria-hidden className="size-4 shrink-0" />
            <span className="shrink-0 tabular-nums">
              {active + 1} / {slides.length}
            </span>
            <span className="truncate font-normal text-[#5d6577]">{slides[active]?.title}</span>
          </button>
          <button
            type="button"
            onClick={() => goTo(active + 1, "button")}
            disabled={active === slides.length - 1}
            aria-label="Next slide"
            className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full transition hover:bg-black/5 disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronRight aria-hidden className="size-5" />
          </button>
          <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-black/10" />
          <button
            type="button"
            onClick={openPdf}
            aria-label="Download PDF"
            className="flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-full pr-3.5 pl-2.5 transition hover:bg-black/5"
          >
            <Download aria-hidden className="size-4" />
            <span className="lg:hidden">PDF</span>
            <span className="hidden lg:inline">Download PDF</span>
          </button>
        </div>
      </div>
    </main>
  );
}
