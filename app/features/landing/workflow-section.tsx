import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";

import { workflowDemos, type WorkflowDemo } from "~/content/landing";
import { scrollPageTo } from "~/lib/page-scroll";

import { StartLink } from "./beta-access";
import { readSiteChromeHeightPx } from "../product-hunt/chrome";
import { useDesktop, usePrefersReducedMotion } from "./media";
import {
  getActiveWorkflowIndex,
  getWorkflowFirstReveal,
  getWorkflowFocusLine,
  getWorkflowLastReveal,
  getWorkflowPushOffset,
  getWorkflowRailFollow,
  getWorkflowRailProgress,
  getWorkflowScrollTarget,
  getWorkflowSlotTop,
  getWorkflowStageIndex,
  getWorkflowStageProgress,
  getWorkflowStageScrollTarget,
  getWorkflowStickyTop,
  getWorkflowVisualBounds,
  WORKFLOW_EDGE_BLUR_PX,
  WORKFLOW_EDGE_POINTER_CUTOFF,
  type WorkflowPushOffset,
} from "./workflow-motion";

const WORKFLOW_VIDEO_FADE_MS = 480;

/**
 * One video screen, pinned beside the copy. The active clip and the one
 * fading out live here; they swap by opacity against the white fill.
 */
function WorkflowScreen({
  demo,
  active,
}: {
  demo: WorkflowDemo;
  active: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useLayoutEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (!active) {
      video.removeAttribute("data-active");
      return;
    }
    video.removeAttribute("data-active");
    const frame = requestAnimationFrame(() => {
      video.setAttribute("data-active", "true");
    });
    return () => cancelAnimationFrame(frame);
  }, [active]);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (!active) {
      video.pause();
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) void video.play().catch(() => undefined);
      else video.pause();
    });
    observer.observe(video);
    return () => {
      observer.disconnect();
      video.pause();
    };
  }, [active]);

  return (
    <video
      ref={ref}
      muted
      loop
      playsInline
      preload={active ? "auto" : "metadata"}
      poster={demo.poster}
      aria-label={active ? demo.ariaLabel : undefined}
      aria-hidden={!active}
      className="workflow-screen-video"
    >
      <source src={demo.video} type="video/mp4" />
    </video>
  );
}

function WorkflowCard({
  demo,
  active,
}: {
  demo: WorkflowDemo;
  active: boolean;
}) {
  return (
    <div className="workflow-card" data-active={active ? "true" : undefined}>
      <div className="workflow-card-body">
        <h3 className="workflow-card-title">
          {demo.title}{" "}
          <span className="font-display italic text-[#01b4c8]">
            {demo.accent}
          </span>
        </h3>
        <p className="workflow-card-copy">{demo.description}</p>
        {/* One row: a natural-width button with its caption alongside, so the
            muted line reads as attached to the action instead of orphaned
            under it. Wraps on narrow cards. */}
        <div className="workflow-card-actions">
          <StartLink
            source={`workflow-${demo.id}`}
            className="landing-cta min-h-[42px] px-7 text-[15px] lg:min-h-[46px] lg:px-8 lg:text-[16px]"
          >
            {demo.cta}
          </StartLink>
          <p className="workflow-card-note">{demo.mutedAction}</p>
        </div>
      </div>
    </div>
  );
}

function WorkflowStepper({
  active,
  onSelect,
  variant,
}: {
  active: number;
  onSelect: (index: number) => void;
  variant: "rail" | "inline";
}) {
  return (
    <div
      className={`workflow-stepper workflow-stepper-${variant}`}
      role="tablist"
      aria-label="Capability walkthrough"
    >
      <span aria-hidden className="workflow-stepper-line" />
      <span aria-hidden className="workflow-stepper-dot" />
      {workflowDemos.map((demo, index) => (
        <button
          key={demo.id}
          type="button"
          role="tab"
          aria-selected={active === index}
          aria-label={`${demo.title} ${demo.accent}`}
          onClick={() => onSelect(index)}
          className="workflow-step"
        />
      ))}
    </div>
  );
}

function paintRailDot(dot: HTMLElement, progress: number, vertical: boolean) {
  if (vertical) {
    dot.style.top = `${progress * 100}%`;
    dot.style.left = "";
    return;
  }
  dot.style.left = `${progress * 100}%`;
  dot.style.top = "";
}

function paintEdge(element: HTMLElement, reveal: number | null) {
  if (reveal == null) {
    element.classList.remove("is-edge");
    element.style.opacity = "";
    element.style.filter = "";
    return;
  }

  element.classList.add("is-edge");
  element.style.opacity = String(reveal);
  element.style.filter =
    reveal >= 0.99 ? "none" : `blur(${(1 - reveal) * WORKFLOW_EDGE_BLUR_PX}px)`;
}

function paintCardReveal(card: HTMLElement, reveal: number | null) {
  paintEdge(card, reveal);
  card.style.pointerEvents =
    reveal != null && reveal < WORKFLOW_EDGE_POINTER_CUTOFF ? "none" : "";
}

function paintPushBodies(
  bodies: readonly (HTMLElement | null)[],
  push: WorkflowPushOffset | null,
) {
  bodies.forEach((body, index) => {
    if (!body) return;
    if (
      push != null &&
      (index === push.index || index === push.index + 1) &&
      Math.abs(push.offsetY) >= 0.5
    ) {
      body.style.transform = `translate3d(0, ${push.offsetY}px, 0)`;
      return;
    }
    body.style.transform = "";
  });
}

function clearPushBodies(rail: HTMLElement) {
  rail.querySelectorAll<HTMLElement>(".workflow-card-body").forEach((body) => {
    body.style.transform = "";
  });
}

function paintRailFollow(
  stepper: HTMLElement,
  targetTop: number,
  reveal: number | null,
) {
  const naturalTop = stepper.getBoundingClientRect().top;
  const offsetY = Math.round(targetTop - naturalTop);
  stepper.style.transform =
    Math.abs(offsetY) < 1 ? "" : `translate3d(0, ${offsetY}px, 0)`;
  paintEdge(stepper, reveal);
}

function StaticWorkflow() {
  return (
    <section
      aria-labelledby="static-workflow-heading"
      className="px-5 py-14 lg:px-16 lg:py-20"
    >
      <h2 id="static-workflow-heading" className="sr-only">
        Workflow demos
      </h2>
      <div className="mx-auto grid max-w-[1400px] gap-7 lg:grid-cols-2">
        {workflowDemos.map((demo) => (
          <article
            key={demo.id}
            className="overflow-hidden rounded-[12px] bg-white/75 shadow-sm lg:rounded-[16px]"
          >
            <div className="workflow-screen">
              <img
                src={demo.poster}
                alt={demo.ariaLabel}
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="p-6 lg:p-8">
              <h3 className="text-[25px] leading-8 text-[#4e4646] lg:text-[28px]">
                {demo.title}{" "}
                <span className="font-display italic text-[#01b4c8]">
                  {demo.accent}
                </span>
              </h3>
              <p className="mt-3 text-[15px] leading-[21px] text-[#627c86] lg:mt-4 lg:text-base">
                {demo.description}
              </p>
              <StartLink
                source={`workflow-${demo.id}`}
                className="landing-cta mt-5 min-h-11 px-6 text-[17px]"
              >
                {demo.cta}
              </StartLink>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function WorkflowSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const motionRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef(0);
  const reducedMotion = usePrefersReducedMotion();
  const desktop = useDesktop();
  const [active, setActive] = useState(0);
  const [outgoing, setOutgoing] = useState<number | null>(null);
  const activeRef = useRef(0);

  const commitActive = useCallback((next: number) => {
    if (next === activeRef.current) return;
    setOutgoing(activeRef.current);
    activeRef.current = next;
    setActive(next);
  }, []);

  useEffect(() => {
    if (outgoing == null) return;
    const fade = window.setTimeout(() => setOutgoing(null), WORKFLOW_VIDEO_FADE_MS);
    return () => window.clearTimeout(fade);
  }, [outgoing]);

  // The screen is centred in the pinned viewport, so only layout knows where
  // its top edge lands. Publish that as --workflow-slot and the sticky cards
  // park on the same line, at any viewport size. Desktop only: below lg the
  // cards are stacked in the stage, not parked on a line.
  useEffect(() => {
    if (reducedMotion || !desktop) return;
    const section = sectionRef.current;
    const screen = screenRef.current;
    if (!section || !screen) return;

    let frame = 0;
    const measure = () => {
      frame = 0;
      const viewer = screen.parentElement;
      if (!viewer || !viewer.offsetParent) return;
      const screenBox = screen.getBoundingClientRect();
      const slot = Math.round(
        screenBox.top - viewer.getBoundingClientRect().top,
      );
      slotRef.current = slot;
      section.style.setProperty("--workflow-slot", `${slot}px`);
      section.style.setProperty(
        "--workflow-screen-height",
        `${Math.round(screenBox.height)}px`,
      );
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("resize", schedule);
    const observer = new ResizeObserver(schedule);
    observer.observe(screen);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      observer.disconnect();
    };
  }, [desktop, reducedMotion]);

  useEffect(() => {
    if (reducedMotion) return;
    const section = sectionRef.current;
    const rail = railRef.current;
    const motion = motionRef.current;
    const stage = stageRef.current;
    const screen = screenRef.current;
    if (!section || !rail || !motion || !stage) return;

    let frame = 0;
    const read = () => {
      frame = 0;
      const chrome = readSiteChromeHeightPx();
      const dots = section.querySelectorAll<HTMLElement>(
        ".workflow-stepper-dot",
      );

      // Below lg the stage is pinned and the cards sit on top of one another,
      // so there is nothing to measure: progress through the container's
      // runway is the whole story.
      if (!desktop) {
        const rect = motion.getBoundingClientRect();
        const progress = getWorkflowStageProgress(
          rect.top,
          rect.height,
          stage.offsetHeight,
          chrome,
        );
        commitActive(getWorkflowStageIndex(progress, workflowDemos.length));
        dots.forEach((dot) => paintRailDot(dot, progress, false));
        return;
      }

      if (!screen) return;

      // Layout from panels, then a shared bezier correction on the pair that
      // currently straddles the slot so the push eases in and out.
      const cards = [...rail.querySelectorAll<HTMLElement>(".workflow-card")];
      const panels = [...rail.querySelectorAll<HTMLElement>(".workflow-panel")];
      const panelBoxes = panels.map((panel) => panel.getBoundingClientRect());
      const heights = cards.map((card) => card.offsetHeight);
      const screenBox = screen.getBoundingClientRect();
      const slotTop = screenBox.top;
      const layoutTops = panelBoxes.map((box, index) =>
        getWorkflowStickyTop(
          box.top,
          box.bottom,
          heights[index]!,
          slotTop,
        ),
      );
      const push = getWorkflowPushOffset(layoutTops, slotTop);
      const bodies = cards.map((card) =>
        card.querySelector<HTMLElement>(".workflow-card-body"),
      );
      paintPushBodies(bodies, push);

      const focusLine = getWorkflowFocusLine(window.innerHeight, chrome);
      const bounds = getWorkflowVisualBounds(layoutTops, heights, push);
      const nextActive = getActiveWorkflowIndex(bounds, focusLine);
      commitActive(nextActive);

      const progress = getWorkflowRailProgress(panelBoxes, focusLine);
      dots.forEach((dot) => paintRailDot(dot, progress, true));

      const videoBottom = screenBox.bottom;
      const viewerTop =
        screen.parentElement?.getBoundingClientRect().top ?? slotTop;
      const last = cards.length - 1;
      let firstReveal: number | null = null;
      let lastReveal: number | null = null;
      cards.forEach((card, index) => {
        let reveal: number | null = null;
        // Edge blur tracks the sticky shell vs the video, not the eased body
        // and not the JS sticky formula. That formula clamps to live screen
        // top, which parks the first card too early (rail top sits above the
        // centered video) and misses the last card once the viewer unpins.
        const box = card.getBoundingClientRect();
        if (index === 0 && nextActive === 0) {
          firstReveal = getWorkflowFirstReveal(
            box.top,
            slotTop,
            viewerTop,
            chrome,
          );
          reveal = firstReveal;
        }
        if (index === last) {
          lastReveal = getWorkflowLastReveal(
            box.top,
            box.bottom,
            slotTop,
            videoBottom,
            viewerTop,
            chrome,
          );
          if (lastReveal != null) reveal = lastReveal;
        }
        paintCardReveal(card, reveal);
      });
      const stepper = section.querySelector<HTMLElement>(
        ".workflow-stepper-rail",
      );
      if (stepper) {
        stepper.style.transform = "";
        const follow = getWorkflowRailFollow(firstReveal, lastReveal);
        paintRailFollow(stepper, slotTop + follow.offsetY, follow.reveal);
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };

    read();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("pageshow", schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("pageshow", schedule);
      clearPushBodies(rail);
    };
  }, [commitActive, desktop, reducedMotion]);

  if (reducedMotion) return <StaticWorkflow />;

  const scrollToDemo = (index: number) => {
    const chrome = readSiteChromeHeightPx();

    // On the sticky stage the panels are stacked, so a jump lands in the
    // middle of the demo's share of the runway rather than on a card.
    if (!desktop) {
      const motion = motionRef.current;
      const stage = stageRef.current;
      if (!motion || !stage) return;
      const rect = motion.getBoundingClientRect();
      scrollPageTo(
        getWorkflowStageScrollTarget(
          window.scrollY,
          rect.top,
          rect.height,
          stage.offsetHeight,
          chrome,
          index,
          workflowDemos.length,
        ),
      );
      return;
    }

    const panel =
      railRef.current?.querySelectorAll<HTMLElement>(".workflow-panel")[index];
    if (!panel) return;
    const slotTop = slotRef.current
      ? chrome + slotRef.current
      : getWorkflowSlotTop(window.innerHeight, chrome);
    scrollPageTo(
      getWorkflowScrollTarget(
        window.scrollY,
        panel.getBoundingClientRect().top,
        slotTop,
      ),
    );
  };

  return (
    <section
      ref={sectionRef}
      aria-labelledby="workflow-heading"
      className="workflow-section relative w-full px-5 lg:px-10 xl:px-16"
      style={
        // Below lg the container carries one screen of runway per demo.
        { "--workflow-demos": String(workflowDemos.length) } as CSSProperties
      }
    >
      <h2 id="workflow-heading" className="sr-only">
        Workflow demos
      </h2>
      <div
        className="workflow-motion page-rail mx-auto w-full"
        ref={motionRef}
      >
        {/* display:contents from lg up, where the viewer and the rail are the
            two columns of the grid. Below lg it is the sticky stage that holds
            them together. */}
        <div className="workflow-stage" ref={stageRef}>
          <div className="workflow-viewer">
            <div className="workflow-screen" ref={screenRef}>
              {(outgoing == null || outgoing === active
                ? [active]
                : [outgoing, active]
              ).map((index) => {
                const demo = workflowDemos[index];
                if (!demo) return null;
                return (
                  <WorkflowScreen
                    key={demo.id}
                    demo={demo}
                    active={index === active}
                  />
                );
              })}
            </div>
            <WorkflowStepper
              variant="inline"
              active={active}
              onSelect={scrollToDemo}
            />
          </div>
          <div className="workflow-rail" ref={railRef}>
            <WorkflowStepper
              variant="rail"
              active={active}
              onSelect={scrollToDemo}
            />
            <div className="workflow-panels">
              {workflowDemos.map((demo, index) => (
                <article
                  key={demo.id}
                  className="workflow-panel"
                  data-active={active === index ? "true" : undefined}
                >
                  <WorkflowCard demo={demo} active={active === index} />
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
