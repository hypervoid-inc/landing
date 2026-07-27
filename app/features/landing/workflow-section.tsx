import { useEffect, useRef, useState, type CSSProperties } from "react";

import { workflowDemos, type WorkflowDemo } from "~/content/landing";

import { BetaLink } from "./beta-access";
import { useDesktop, usePrefersReducedMotion } from "./media";
import {
  clamp,
  getMobileWorkflowViewportMode,
  getHeldWorkflowPosition,
  getSoftPinOffset,
  getWorkflowScrollScreens,
  lerp,
  smoothStep,
  type MobileWorkflowViewportMode,
} from "./workflow-motion";

function useMobileWorkflowViewportMode() {
  const [mode, setMode] = useState<MobileWorkflowViewportMode>("normal");

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setMode(getMobileWorkflowViewportMode(window.innerHeight));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
    };
  }, []);

  return mode;
}

function WorkflowMedia({
  demo,
  distance,
  dominant,
}: {
  demo: WorkflowDemo;
  distance: number;
  dominant: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const wasDominant = useRef(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (dominant && !wasDominant.current) video.currentTime = 0;
    wasDominant.current = dominant;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting && dominant) {
        void video.play().catch(() => undefined);
      } else {
        video.pause();
      }
    });
    observer.observe(video);
    return () => {
      observer.disconnect();
      video.pause();
    };
  }, [dominant]);

  const exiting = smoothStep(clamp(-distance));
  const entering = smoothStep(clamp(1 - distance));

  const style = {
    opacity: distance < 0 ? 1 - exiting : entering,
    transform: `translateY(${distance < 0 ? lerp(0, 10, exiting) : lerp(-10, 0, entering)}px)`,
    zIndex: Math.round(20 - Math.abs(distance) * 10),
  };

  return (
    <video
      ref={ref}
      muted
      loop
      playsInline
      preload="metadata"
      poster={demo.poster}
      aria-label={dominant ? demo.ariaLabel : undefined}
      aria-hidden={!dominant}
      style={style}
      className="absolute inset-0 h-full w-full object-cover"
    >
      <source src={demo.video} type="video/mp4" />
    </video>
  );
}

function WorkflowCopy({
  demo,
  distance,
  desktop,
  viewportMode,
}: {
  demo: WorkflowDemo;
  distance: number;
  desktop: boolean;
  viewportMode: MobileWorkflowViewportMode;
}) {
  const exiting = smoothStep(clamp(-distance));
  const entering = smoothStep(clamp(1 - distance));
  const short = !desktop && viewportMode === "short";
  const preview = desktop;
  const preEnter = smoothStep(
    ((desktop ? 1.24 : 1.22) - distance) / (desktop ? 0.24 : 0.22),
  );
  if (
    distance <= -1.05 ||
    distance >= (preview ? (desktop ? 1.24 : 1.22) : 1.05)
  )
    return null;

  const titleAnchor = 0;
  const exitTitle = desktop ? -36 : short ? -16 : -24;
  const nextAnchor = desktop ? 300 : short ? 0 : 205;
  const belowAnchor = desktop ? 380 : short ? 0 : 260;
  const y =
    distance < 0
      ? lerp(titleAnchor, exitTitle, exiting)
      : distance <= 1
        ? lerp(nextAnchor, titleAnchor, entering)
        : lerp(belowAnchor, nextAnchor, preEnter);
  const opacity =
    distance < 0
      ? 1 - exiting
      : distance <= 1
        ? lerp(preview ? 0.58 : 0, 1, entering)
        : lerp(0, preview ? 0.58 : 0, preEnter);
  const descriptionOpacity =
    distance < 0
      ? 1 - exiting
      : smoothStep(
          (entering - (desktop ? 0.58 : preview ? 0.68 : 0.16)) /
            (desktop ? 0.42 : preview ? 0.32 : 0.68),
        );
  const nextOpacity =
    preview && distance > 0 ? (distance <= 1 ? 1 - entering : preEnter) : 0;
  const support = smoothStep(
    1 - Math.abs(distance) / (desktop ? 0.54 : short ? 0.3 : 0.42),
  );
  const headlineClass = desktop
    ? "text-[clamp(24px,2vw,31px)] leading-tight text-[#4e4646]"
    : viewportMode === "short"
      ? "max-w-[350px] text-[22px] leading-[28px] text-[#4e4646]"
      : viewportMode === "compact"
        ? "max-w-[350px] text-[24px] leading-[30px] text-[#4e4646]"
        : "max-w-[350px] text-[26px] leading-[32px] text-[#4e4646]";
  const descriptionClass = desktop
    ? "mt-7 max-w-[300px] text-[clamp(14px,1.05vw,16px)] leading-[21px] text-[#627c86]"
    : short
      ? "mt-3 max-w-[340px] text-[14px] leading-[19px] text-[#627c86]"
      : "mt-4 max-w-[340px] text-[15px] leading-[21px] text-[#627c86]";
  const ctaClass = desktop
    ? "landing-cta min-h-[57px] w-[280px] px-5 text-[20px]"
    : short
      ? "landing-cta min-h-10 min-w-[218px] px-5 text-[15px]"
      : "landing-cta min-h-11 min-w-[230px] px-5 text-[16px]";

  return (
    <>
      <div
        className="pointer-events-none absolute inset-x-0 top-0"
        style={{
          opacity,
          transform: `translateY(${y}px)`,
          zIndex: Math.round(20 - Math.abs(distance) * 10),
        }}
      >
        <p
          className="mb-2 text-sm text-[#78909a] lg:mb-3 lg:text-[16.8px]"
          style={{ opacity: nextOpacity }}
        >
          Up Next
        </p>
        {/*
          Both the mobile and desktop copies of this block stay in the DOM so
          the right one paints before hydration. Only the mobile copy is a real
          heading — the desktop twin is demoted to avoid emitting every workflow
          title twice, and Google indexes the mobile DOM anyway.
        */}
        {desktop ? (
          <p className={headlineClass}>
            {demo.title}{" "}
            <span className="font-display italic text-[#01b4c8]">
              {demo.accent}
            </span>
          </p>
        ) : (
          <h3 className={headlineClass}>
            {demo.title}{" "}
            <span className="font-display italic text-[#01b4c8]">
              {demo.accent}
            </span>
          </h3>
        )}
        <p className={descriptionClass} style={{ opacity: descriptionOpacity }}>
          {demo.description}
        </p>
      </div>
      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          opacity: support,
          transform: `translateY(${(desktop ? 12 : 10) * (1 - support)}px)`,
          pointerEvents: support > 0.85 ? "auto" : "none",
        }}
      >
        <BetaLink source={`workflow-${demo.id}`} className={ctaClass}>
          {demo.cta}
        </BetaLink>
        {(desktop || viewportMode !== "short") && (
          <p
            className={
              desktop
                ? "mt-4 text-base capitalize text-[#78909a]"
                : "mt-3 text-[13px] capitalize text-[#78909a]"
            }
          >
            {demo.mutedAction}
          </p>
        )}
      </div>
    </>
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
              <BetaLink
                source={`workflow-${demo.id}`}
                className="landing-cta mt-5 min-h-11 px-6 text-[17px]"
              >
                {demo.cta}
              </BetaLink>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function WorkflowSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const desktop = useDesktop();
  const viewportMode = useMobileWorkflowViewportMode();
  const [progress, setProgress] = useState(0);
  const scrollScreens = getWorkflowScrollScreens(workflowDemos.length, desktop);

  useEffect(() => {
    if (reducedMotion) return;
    const section = sectionRef.current;
    const content = contentRef.current;
    if (!section || !content) return;
    const pinOffset = desktop ? 56 : 48;
    let currentProgress = 0;
    let targetProgress = 0;
    let currentPin = 0;
    let targetPin = 0;
    let animationFrame = 0;
    let restoreFrame = 0;
    let previousTime = 0;

    const render = () => {
      setProgress(clamp(currentProgress));
      content.style.transform = `translate3d(0, ${currentPin}px, 0)`;
    };
    const readTargets = () => {
      const rect = section.getBoundingClientRect();
      const distance = Math.max(
        rect.height - window.innerHeight + pinOffset,
        1,
      );
      targetProgress = clamp((pinOffset - rect.top) / distance);
      targetPin =
        pinOffset + getSoftPinOffset(targetProgress, distance, pinOffset);
    };
    const animate = (time: number) => {
      const elapsed = Math.min(time - (previousTime || time - 16), 64);
      previousTime = time;
      currentProgress +=
        (targetProgress - currentProgress) * (1 - Math.exp(-elapsed / 100));
      currentPin += (targetPin - currentPin) * (1 - Math.exp(-elapsed / 75));
      render();

      if (
        Math.abs(targetProgress - currentProgress) > 0.0001 ||
        Math.abs(targetPin - currentPin) > 0.05
      ) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        currentProgress = targetProgress;
        currentPin = targetPin;
        animationFrame = 0;
        previousTime = 0;
        render();
      }
    };
    const updateFromScroll = () => {
      readTargets();
      if (!animationFrame) animationFrame = requestAnimationFrame(animate);
    };
    const syncRestoredScroll = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      previousTime = 0;
      readTargets();
      currentProgress = targetProgress;
      currentPin = targetPin;
      render();
    };

    window.addEventListener("scroll", updateFromScroll, { passive: true });
    window.addEventListener("resize", syncRestoredScroll);
    window.addEventListener("pageshow", syncRestoredScroll);
    window.addEventListener("load", syncRestoredScroll);
    syncRestoredScroll();
    restoreFrame = requestAnimationFrame(() => {
      restoreFrame = requestAnimationFrame(syncRestoredScroll);
    });

    return () => {
      cancelAnimationFrame(animationFrame);
      cancelAnimationFrame(restoreFrame);
      window.removeEventListener("scroll", updateFromScroll);
      window.removeEventListener("resize", syncRestoredScroll);
      window.removeEventListener("pageshow", syncRestoredScroll);
      window.removeEventListener("load", syncRestoredScroll);
      content.style.transform = "";
    };
  }, [desktop, reducedMotion, scrollScreens]);

  if (reducedMotion) return <StaticWorkflow />;

  const position = getHeldWorkflowPosition(progress, workflowDemos.length);
  const active = Math.min(Math.round(position), workflowDemos.length - 1);
  const railProgress = position / Math.max(workflowDemos.length - 1, 1);

  return (
    <section
      ref={sectionRef}
      aria-labelledby="workflow-heading"
      className="workflow-section relative w-full"
      style={
        {
          "--workflow-scroll-space": `${scrollScreens * 100}svh`,
          "--workflow-pin-offset": `${desktop ? 56 : 48}px`,
        } as CSSProperties
      }
    >
      <h2 id="workflow-heading" className="sr-only">
        Workflow demos
      </h2>
      <div className="workflow-sticky sticky flex w-full items-center px-5 py-6 lg:px-10 xl:px-16">
        <div
          ref={contentRef}
          className="workflow-motion mx-auto grid w-full max-w-[1400px] grid-cols-1 items-center gap-4 lg:grid-cols-[minmax(300px,.95fr)_minmax(0,2.6fr)] lg:gap-7 xl:grid-cols-[minmax(320px,1fr)_minmax(0,3fr)] xl:gap-10"
        >
          <div className="order-1 relative mx-auto aspect-[3/2] w-full max-w-[440px] overflow-hidden rounded-[12px] bg-white lg:order-2 lg:max-w-none lg:rounded-[16px]">
            {workflowDemos.map((demo, index) => {
              const distance = index - position;
              return distance <= -1.05 || distance >= 1.05 ? null : (
                <WorkflowMedia
                  key={demo.id}
                  demo={demo}
                  distance={distance}
                  dominant={active === index}
                />
              );
            })}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-linear-to-br from-white/20 via-transparent to-[#ddfaff]/30"
            />
          </div>
          <aside className="order-2 relative mx-auto w-full max-w-[420px] lg:order-1 lg:max-w-none lg:pl-8">
            <div
              aria-hidden
              className="relative mx-auto h-6 w-full max-w-[260px] lg:absolute lg:inset-y-0 lg:left-0 lg:h-auto lg:w-px"
            >
              <span className="absolute inset-x-0 top-1/2 h-px bg-[#9dddea]/70 lg:inset-y-0 lg:left-0 lg:right-auto lg:top-0 lg:h-auto lg:w-px" />
              <span
                className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#4cd8ff] shadow-[0_0_14px_rgba(76,216,255,.6)] lg:hidden"
                style={{ left: `${railProgress * 100}%` }}
              />
              <span
                className="absolute left-0 hidden h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#4cd8ff] shadow-[0_0_14px_rgba(76,216,255,.6)] lg:block"
                style={{ top: `${railProgress * 100}%` }}
              />
            </div>
            <div
              className={`relative mt-3 overflow-visible lg:mt-0 lg:min-h-[min(600px,calc(100svh-96px))] ${viewportMode === "short" ? "min-h-[230px]" : viewportMode === "compact" ? "min-h-[300px]" : "min-h-[360px]"}`}
            >
              <div className="contents lg:hidden">
                {workflowDemos.map((demo, index) => (
                  <WorkflowCopy
                    key={demo.id}
                    demo={demo}
                    distance={index - position}
                    desktop={false}
                    viewportMode={viewportMode}
                  />
                ))}
              </div>
              <div className="hidden lg:contents">
                {workflowDemos.map((demo, index) => (
                  <WorkflowCopy
                    key={demo.id}
                    demo={demo}
                    distance={index - position}
                    desktop
                    viewportMode="normal"
                  />
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
