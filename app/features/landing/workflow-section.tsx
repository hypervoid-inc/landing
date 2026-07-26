import {
  AppWindow,
  BrainCircuit,
  CalendarClock,
  FolderKanban,
  Play,
  // UsersRound,
  Workflow,
  type LucideIcon,
} from "lucide-react";
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

const placeholderIcons: Record<
  Extract<WorkflowDemo, { placeholder: unknown }>["placeholder"]["kind"],
  LucideIcon
> = {
  // agents: UsersRound,
  apps: AppWindow,
  calendar: CalendarClock,
  memory: BrainCircuit,
  workflows: Workflow,
  workspace: FolderKanban,
};

function WorkflowPlaceholder({
  demo,
}: {
  demo: Extract<WorkflowDemo, { placeholder: unknown }>;
}) {
  const Icon = placeholderIcons[demo.placeholder.kind];
  return (
    <div className="workflow-placeholder absolute inset-0 overflow-hidden bg-[#fafdff]">
      <div className="workflow-placeholder-chrome flex h-12 items-center border-b border-[#dceef3] px-5 text-xs text-[#78909a]">
        <span className="flex gap-1.5" aria-hidden>
          <i className="size-2.5 rounded-full bg-[#ff7369]" />
          <i className="size-2.5 rounded-full bg-[#ffd34e]" />
          <i className="size-2.5 rounded-full bg-[#55c95a]" />
        </span>
        <span className="mx-auto pr-10">Construct Computer</span>
      </div>
      <div className="workflow-placeholder-stage absolute inset-x-[8%] bottom-[9%] top-[16%] flex items-center justify-center">
        <div className="workflow-placeholder-card relative w-full max-w-[620px] rounded-[20px] border border-[#d8eef4] bg-white/90 p-3 shadow-[0_28px_80px_rgba(77,173,198,.16)] sm:rounded-[28px] sm:p-6 lg:p-9">
          <div className="flex items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#e7faff] text-[#01a8c0] shadow-[inset_0_0_0_1px_rgba(1,180,200,.12)] sm:size-11 sm:rounded-2xl lg:size-13">
              <Icon aria-hidden className="size-4 sm:size-6" />
            </span>
            <div>
              <p className="text-[8px] font-semibold uppercase tracking-[.16em] text-[#64afc1] sm:text-[11px] sm:tracking-[.18em]">
                Demo recording slot
              </p>
              <p className="mt-0.5 text-sm font-semibold text-[#4e5558] sm:mt-1 sm:text-base lg:text-xl">
                {demo.placeholder.label}
              </p>
            </div>
          </div>
          <ol className="mt-3 grid grid-cols-3 gap-1.5 sm:mt-5 sm:gap-2.5 lg:mt-7 lg:gap-3">
            {demo.placeholder.steps.map((step, index) => (
              <li
                key={step}
                className="flex min-h-12 flex-col items-start justify-center gap-1 rounded-lg border border-[#e0f0f4] bg-[#f8fdff] px-2 text-[9px] leading-tight text-[#627c86] sm:min-h-14 sm:gap-2 sm:rounded-xl sm:px-3 sm:text-xs lg:min-h-20 lg:text-sm"
              >
                <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[#4cd8ff] text-[8px] font-bold text-white sm:size-5 sm:text-[10px]">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <span
            aria-hidden
            className="absolute -bottom-5 right-5 flex size-11 items-center justify-center rounded-full border border-white bg-[#168fe5] text-white shadow-[0_10px_24px_rgba(22,143,229,.28)] lg:-right-5 lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2"
          >
            <Play className="ml-0.5 size-4 fill-current" />
          </span>
        </div>
      </div>
    </div>
  );
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
  const hasVideo = "video" in demo;

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
  }, [dominant, hasVideo]);

  const exiting = smoothStep(clamp(-distance));
  const entering = smoothStep(clamp(1 - distance));

  const style = {
    opacity: distance < 0 ? 1 - exiting : entering,
    transform: `translateY(${distance < 0 ? lerp(0, 10, exiting) : lerp(-10, 0, entering)}px)`,
    zIndex: Math.round(20 - Math.abs(distance) * 10),
  };

  if (!hasVideo) {
    return (
      <div
        role={dominant ? "img" : undefined}
        aria-label={dominant ? demo.ariaLabel : undefined}
        aria-hidden={!dominant}
        style={style}
        className="absolute inset-0"
      >
        <WorkflowPlaceholder demo={demo} />
      </div>
    );
  }

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
        className="absolute inset-x-0 top-0"
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
        <h3 className={headlineClass}>
          {demo.title}{" "}
          <span className="font-display italic text-[#01b4c8]">
            {demo.accent}
          </span>
        </h3>
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
            className="overflow-hidden rounded-[28px] bg-white/75 shadow-sm lg:rounded-[32px]"
          >
            <div className="relative aspect-[964/694] w-full overflow-hidden">
              {"video" in demo ? (
                <img
                  src={demo.poster}
                  alt={demo.ariaLabel}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              ) : (
                <WorkflowPlaceholder demo={demo} />
              )}
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
    let cleanup: (() => void) | undefined;
    let cancelled = false;

    void import("gsap").then(({ default: gsap }) => {
      if (cancelled || !sectionRef.current) return;
      const pinOffset = desktop ? 56 : 48;
      const progressMotion = { value: 0 };
      const pinMotion = { y: 0 };
      const renderProgress = () => setProgress(clamp(progressMotion.value));
      const renderPin = () => {
        if (contentRef.current) {
          contentRef.current.style.transform = `translate3d(0, ${pinMotion.y}px, 0)`;
        }
      };
      const easeProgress = gsap.quickTo(progressMotion, "value", {
        duration: 0.4,
        ease: "power2.out",
        onUpdate: renderProgress,
      });
      const easePin = gsap.quickTo(pinMotion, "y", {
        duration: 0.3,
        ease: "power2.out",
        onUpdate: renderPin,
      });
      let restoreFrame = 0;
      const getTargets = () => {
        const rect = sectionRef.current!.getBoundingClientRect();
        const distance = Math.max(
          rect.height - window.innerHeight + pinOffset,
          1,
        );
        const nextProgress = clamp((pinOffset - rect.top) / distance);
        return {
          progress: nextProgress,
          pin: getSoftPinOffset(nextProgress, distance, pinOffset),
        };
      };
      const updateFromScroll = () => {
        const targets = getTargets();
        easeProgress(targets.progress);
        easePin(targets.pin);
      };
      const syncRestoredScroll = () => {
        if (cancelled) return;
        const targets = getTargets();
        gsap.killTweensOf(progressMotion);
        gsap.killTweensOf(pinMotion);
        progressMotion.value = targets.progress;
        pinMotion.y = targets.pin;
        renderProgress();
        renderPin();
      };
      window.addEventListener("scroll", updateFromScroll, { passive: true });
      window.addEventListener("resize", syncRestoredScroll);
      window.addEventListener("pageshow", syncRestoredScroll);
      window.addEventListener("load", syncRestoredScroll);
      syncRestoredScroll();
      restoreFrame = requestAnimationFrame(() => {
        restoreFrame = requestAnimationFrame(syncRestoredScroll);
      });
      cleanup = () => {
        cancelAnimationFrame(restoreFrame);
        window.removeEventListener("scroll", updateFromScroll);
        window.removeEventListener("resize", syncRestoredScroll);
        window.removeEventListener("pageshow", syncRestoredScroll);
        window.removeEventListener("load", syncRestoredScroll);
        gsap.killTweensOf(progressMotion);
        gsap.killTweensOf(pinMotion);
        if (contentRef.current) contentRef.current.style.transform = "";
      };
    });

    return () => {
      cancelled = true;
      cleanup?.();
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
          <div className="order-1 relative mx-auto aspect-[964/694] w-full max-w-[440px] overflow-hidden rounded-[32px] bg-white lg:order-2 lg:max-w-none lg:rounded-[53px]">
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
