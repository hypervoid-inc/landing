import { useEffect, useRef, useState, type CSSProperties } from "react";

import { workflowDemos, type WorkflowDemo } from "~/content/landing";
import { cn } from "~/lib/cn";

import { StartLink } from "./beta-access";
import { readSiteChromeHeightPx } from "../product-hunt/chrome";
import { useDesktop, usePrefersReducedMotion } from "./media";
import {
  getActiveWorkflowIndex,
  getWorkflowFocusLine,
  getWorkflowScrollTarget,
  getWorkflowSlotTop,
  getWorkflowStageIndex,
  getWorkflowStageProgress,
  getWorkflowStageScrollTarget,
} from "./workflow-motion";

/**
 * One video screen, pinned beside the copy. Every demo's video lives here and
 * swaps by cross-fade, so the frame itself never moves while you scroll.
 */
function WorkflowScreen({
  demo,
  active,
}: {
  demo: WorkflowDemo;
  active: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (!active) {
      video.pause();
      return;
    }

    video.currentTime = 0;
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
      preload={active ? "metadata" : "none"}
      poster={demo.poster}
      aria-label={active ? demo.ariaLabel : undefined}
      aria-hidden={!active}
      data-active={active ? "true" : undefined}
      className="workflow-screen-video absolute inset-0 h-full w-full object-cover"
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
}: {
  active: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div
      className="workflow-stepper"
      role="tablist"
      aria-label="Capability walkthrough"
    >
      {workflowDemos.map((demo, index) => (
        <button
          key={demo.id}
          type="button"
          role="tab"
          aria-selected={active === index}
          aria-label={`${demo.title} ${demo.accent}`}
          onClick={() => onSelect(index)}
          className="workflow-step"
        >
          <span aria-hidden className="workflow-step-track" />
        </button>
      ))}
    </div>
  );
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
            <div className="relative aspect-[3/2] w-full overflow-hidden">
              <img
                src={demo.poster}
                alt={demo.ariaLabel}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
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
      const slot = Math.round(
        screen.getBoundingClientRect().top -
          viewer.getBoundingClientRect().top,
      );
      slotRef.current = slot;
      section.style.setProperty("--workflow-slot", `${slot}px`);
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
    const rail = railRef.current;
    const motion = motionRef.current;
    const stage = stageRef.current;
    if (!rail || !motion || !stage) return;

    let frame = 0;
    const read = () => {
      frame = 0;
      const chrome = readSiteChromeHeightPx();

      // Below lg the stage is pinned and the cards sit on top of one another,
      // so there is nothing to measure: progress through the container's
      // runway is the whole story.
      if (!desktop) {
        const rect = motion.getBoundingClientRect();
        setActive(
          getWorkflowStageIndex(
            getWorkflowStageProgress(
              rect.top,
              rect.height,
              stage.offsetHeight,
              chrome,
            ),
            workflowDemos.length,
          ),
        );
        return;
      }

      // Cards are sticky, so measure the cards themselves rather than their
      // runways: a card holds the focus line for as long as it holds the slot,
      // and hands over mid-push as the next card rises past the line.
      const cards = [...rail.querySelectorAll<HTMLElement>(".workflow-card")];
      const focusLine = getWorkflowFocusLine(window.innerHeight, chrome);
      setActive(
        getActiveWorkflowIndex(
          cards.map((card) => card.getBoundingClientRect()),
          focusLine,
        ),
      );
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
    };
  }, [desktop, reducedMotion]);

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
      window.scrollTo({
        top: getWorkflowStageScrollTarget(
          window.scrollY,
          rect.top,
          rect.height,
          stage.offsetHeight,
          chrome,
          index,
          workflowDemos.length,
        ),
        behavior: "smooth",
      });
      return;
    }

    const panel = railRef.current?.querySelectorAll<HTMLElement>(
      ".workflow-panel",
    )[index];
    if (!panel) return;
    const slotTop = slotRef.current
      ? chrome + slotRef.current
      : getWorkflowSlotTop(window.innerHeight, chrome);
    window.scrollTo({
      top: getWorkflowScrollTarget(
        window.scrollY,
        panel.getBoundingClientRect().top,
        slotTop,
      ),
      behavior: "smooth",
    });
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
        className="workflow-motion mx-auto w-full max-w-[1520px]"
        ref={motionRef}
      >
        {/* display:contents from lg up, where the viewer and the rail are the
            two columns of the grid. Below lg it is the sticky stage that holds
            them together. */}
        <div className="workflow-stage" ref={stageRef}>
          <div className="workflow-viewer">
            <div className="workflow-screen" ref={screenRef}>
              {workflowDemos.map((demo, index) => (
                <WorkflowScreen
                  key={demo.id}
                  demo={demo}
                  active={active === index}
                />
              ))}
            </div>
            <WorkflowStepper active={active} onSelect={scrollToDemo} />
          </div>
          <div className="workflow-rail" ref={railRef}>
            {workflowDemos.map((demo, index) => (
              <article
                key={demo.id}
                className={cn("workflow-panel", index === 0 && "is-first")}
                data-active={active === index ? "true" : undefined}
              >
                <WorkflowCard demo={demo} active={active === index} />
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
