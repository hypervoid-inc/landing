import * as Accordion from "@radix-ui/react-accordion";
import { Plus } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";

import { SiteFooter, SiteHeader } from "../../components/layout/site-layout";
import { cn } from "../../lib/cn";
import { captureAnalytics } from "../analytics/analytics.client";
import {
  readAttributionCookie,
  writePromoCode,
} from "../analytics/campaign-attribution.client";
import { ProductHuntBadge } from "../product-hunt/product-hunt-badge";
import { productHuntCopy } from "../product-hunt/config";
import { useProductHuntPhase } from "../product-hunt/use-product-hunt-phase";
import { StartLink } from "./beta-access";
import { INTEGRATION_MARKS } from "./integration-marks";
import { usePrefersReducedMotion, useRevealOnView } from "./media";
import { mergePricingPlans } from "./merge-pricing-catalog";
import { usePlanCatalog } from "./use-plan-catalog";
import "./launch-page.css";

/**
 * Low-commitment CTA for campaign traffic that will not start a trial on the
 * first visit. Same form the GTM email offers, so the page keeps the promise.
 */
const WALKTHROUGH_URL = "https://forms.gle/fpu7xAUbBC6EQKzQ6";

const PROMO_CODES = [
  {
    code: "LAUNCH20",
    label: "First three months at launch pricing",
    detail: "20% off for 3 months · monthly billing",
  },
  {
    code: "LAUNCH40",
    label: "Full year at launch pricing",
    detail: "40% off · annual billing",
  },
] as const;

/**
 * The ONE NIGHT shift from Construct Notes issue 001, verbatim in substance.
 * This is what the GTM recipient clicked on, so it leads the page: concrete,
 * timestamped jobs before any capability claim.
 */
const SHIFT = [
  {
    time: "12:20 AM",
    title: "The 60 tickets since Thursday.",
    body: "Refunds and resets answered and closed. The ambiguous ones set aside with the whole thread already read.",
  },
  {
    time: "2:05 AM",
    title: "Tuesday's leads, finally written up.",
    body: "Each site and LinkedIn opened, scored against your ICP, into HubSpot with the notes attached. A first-touch reply drafted in your outbox.",
  },
  {
    time: "3:30 AM",
    title: "Stripe and your CRM, reconciled.",
    body: "Line by line against Notion, every mismatch in one doc with the row, the amount, and a link back to the source.",
  },
  {
    time: "5:10 AM",
    title: "200 applicants screened against your rubric.",
    body: "Top ten ranked in a Notion board, the reasoning written out under each name.",
  },
  {
    time: "6:25 AM",
    title: "The invoice chased a third time.",
    body: "The investor update drafted from what actually shipped, pulled out of your repo, your CRM, and Linear.",
  },
] as const;

/**
 * Hero scenes. Each is one clip of the real product plus a floating artifact,
 * and the artifact moves to a different corner every scene so the composition
 * changes rather than just the screen behind it.
 *
 * Order is deliberate: hand over the work, it remembers, it builds, it runs on
 * its own schedule. That is the hero's sentence told four ways.
 */
const HERO_SCENES = [
  {
    id: "workflow",
    video: "/assets/landing/workflows/workflow.mp4",
    poster: "/assets/landing/workflows/workflow-poster.jpg",
    videoLabel: "Scheduled Construct runs that finished overnight",
    corner: "bottom-left",
    overlay: {
      src: "/assets/landing/hero/research-report.webp",
      alt: "Handing tonight's list to your Construct AI employee by email",
      width: 640,
      height: 355,
      size: "20rem",
    },
  },
  {
    id: "memories",
    video: "/assets/landing/workflows/memories.mp4",
    poster: "/assets/landing/workflows/memories-poster.jpg",
    videoLabel: "The memory your agent keeps between runs",
    corner: "top-right",
    overlay: {
      src: "/assets/landing/hero/agent-chat.webp",
      alt: "Asking your agent to summarise today's email",
      width: 825,
      height: 459,
      size: "17rem",
    },
  },
  {
    id: "apps",
    video: "/assets/landing/workflows/apps.mp4",
    poster: "/assets/landing/workflows/apps-poster.jpg",
    videoLabel: "A lead tracker your agent built and now maintains",
    corner: "bottom-right",
    overlay: {
      src: "/assets/landing/hero/search-bar.png",
      alt: "Sending your agent a research request",
      width: 1365,
      height: 135,
      size: "19rem",
    },
  },
  {
    id: "calendar",
    video: "/assets/landing/workflows/calendar.mp4",
    poster: "/assets/landing/workflows/calendar-poster.jpg",
    videoLabel: "Your agent working from its own calendar",
    corner: "top-left",
    // Transparent artwork in the top corners: a solid card there covers the
    // window's title bar and reads as a mistake instead of a collage. The
    // mascot also appears inside this clip, so it belongs to the scene.
    overlay: {
      src: "/assets/landing/clippy/computer.webp",
      alt: "The computer your Construct agent runs on",
      width: 480,
      height: 449,
      size: "7.5rem",
    },
  },
] as const;

/** Safety net: advance even if `ended` never fires (stalled or blocked media). */
const SCENE_MAX_MS = 20000;

/** Objections that decide a paid signup from a cold campaign list. */
const FAQ = [
  {
    question: "What happens when the free trial ends?",
    answer:
      "Nothing charges automatically without you picking a plan at checkout, and that is where your launch code applies. Plans start at the Lite tier and go up to Pro, which is what the trial runs on.",
  },
  {
    question: "Do I have to integrate anything first?",
    answer:
      "No. Connect the accounts you already use and Construct works inside them. Where there is no API, it drives a real browser instead, so there is no integration project to schedule.",
  },
  {
    question: "What does it remember, and can I delete it?",
    answer:
      "Every agent keeps files and memory across sessions, which is why Friday's run still knows Monday's context. That memory is yours to read, correct, or wipe at any time.",
  },
  {
    question: "What if it does something wrong?",
    answer:
      "You can open the screen mid-run, watch what it is doing, and take the mouse back. An activity log records every action: what it touched, when it ran, and why.",
  },
  {
    question: "Can my team use the same setup?",
    answer:
      "Yes. Shared workspaces mean shared files, connected apps, and reusable workflows. One person encodes a process, versions it, and schedules it, and everyone runs it.",
  },
] as const;

function PromoChip({ code, label, detail }: (typeof PROMO_CODES)[number]) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      aria-label={`Copy code ${code}`}
      onClick={() => {
        writePromoCode(code);
        captureAnalytics("promo_code_copied", { code });
        const write = navigator.clipboard?.writeText(code);
        if (!write) return;
        void write
          .then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          })
          .catch(() => undefined);
      }}
      className="launch-code"
    >
      <span className="launch-code-row">
        <span className="font-mono text-lg tracking-widest text-[var(--color-ink)] sm:text-xl">
          {code}
        </span>
        <span
          className="text-xs font-medium text-[var(--color-brand)]"
          aria-live="polite"
        >
          {copied ? "Copied" : "Click to copy"}
        </span>
      </span>
      <span className="text-sm text-[var(--color-ink)]">{label}</span>
      <span className="text-xs text-[var(--color-ink-subtle)]">{detail}</span>
    </button>
  );
}

function LaunchCollage() {
  const reducedMotion = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [sceneIndex, setSceneIndex] = useState(0);

  /**
   * Parallax driven by the pointer anywhere on the page, measured against the
   * viewport centre, so the hero keeps responding after the reader has scrolled
   * past it or moved away from the artwork. Writes are coalesced into one frame
   * because pointermove fires far more often than the display refreshes.
   */
  useEffect(() => {
    if (reducedMotion) return;
    const node = ref.current;
    if (!node) return;

    let frame = 0;
    let settleTimer = 0;
    let away = true;
    let nx = 0;
    let ny = 0;

    const apply = () => {
      frame = 0;
      node.style.setProperty("--mx", `${nx * 22}px`);
      node.style.setProperty("--my", `${ny * 18}px`);
    };
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(apply);
    };
    /** Hold the slow curve long enough for the ease to finish, then release. */
    const settleFor = (ms: number) => {
      node.dataset.settling = "";
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        delete node.dataset.settling;
      }, ms);
    };

    const onMove = (event: PointerEvent) => {
      // First move after re-entering: ease across the gap rather than jump to
      // wherever the pointer reappeared.
      if (away) {
        away = false;
        settleFor(900);
      }
      nx = event.clientX / Math.max(window.innerWidth, 1) - 0.5;
      ny = event.clientY / Math.max(window.innerHeight, 1) - 0.5;
      schedule();
    };
    // Pointer left the window entirely: drift back to centre.
    const onLeave = (event: PointerEvent) => {
      if (event.relatedTarget || away) return;
      away = true;
      settleFor(900);
      nx = 0;
      ny = 0;
      schedule();
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerout", onLeave);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.clearTimeout(settleTimer);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onLeave);
    };
  }, [reducedMotion]);

  const scene = HERO_SCENES[sceneIndex] ?? HERO_SCENES[0];
  const advance = () =>
    setSceneIndex((current) => (current + 1) % HERO_SCENES.length);

  // Backstop only. Normal advancement is the video's own `ended` event, so
  // each clip is seen start to finish however long it runs.
  useEffect(() => {
    if (reducedMotion) return;
    const timer = window.setTimeout(advance, SCENE_MAX_MS);
    return () => window.clearTimeout(timer);
  }, [sceneIndex, reducedMotion]);

  return (
    <div ref={ref} className="launch-collage">
      <div className="launch-collage-stage">
        <div className="launch-collage-screen">
          {/* Keyed per scene so the element remounts and the new clip actually
            loads and plays from its first frame. */}
          <video
            key={scene.id}
            className="launch-collage-video"
            poster={scene.poster}
            aria-label={scene.videoLabel}
            muted
            playsInline
            preload="auto"
            autoPlay={!reducedMotion}
            onEnded={advance}
            // A blocked or missing clip should not strand the hero on one scene.
            onError={advance}
          >
            <source src={scene.video} type="video/mp4" />
          </video>
        </div>
        {/* Two elements on purpose: the outer one owns the parallax transform
            (so it can transition), the inner one owns the per-scene entrance.
            Sharing one element lets the filled animation override the
            transition, which makes the parallax snap instead of ease. */}
        <div
          className="launch-collage-artifact"
          data-corner={scene.corner}
          style={{ "--artifact-w": scene.overlay.size } as CSSProperties}
        >
          <div
            key={`${scene.id}-overlay`}
            className="launch-collage-artifact-in"
          >
            <img
              src={scene.overlay.src}
              alt={scene.overlay.alt}
              width={scene.overlay.width}
              height={scene.overlay.height}
              className="block h-auto w-full"
              decoding="async"
            />
          </div>
        </div>
      </div>
      <div className="launch-collage-dots">
        {HERO_SCENES.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className="launch-collage-dot"
            aria-label={item.videoLabel}
            aria-current={index === sceneIndex || undefined}
            onClick={() => setSceneIndex(index)}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Continuous logo wall. The track holds four copies of the marks and slides by
 * exactly one of them, so the wrap lands on an identical frame. Four rather
 * than two: at the end of a two-copy cycle only one copy's width remains on
 * screen, which leaves a visible gap on displays wider than that copy.
 *
 * Duplicates are hidden from assistive tech; the real list is the
 * visually-hidden one, which also keeps the tool names in the page text.
 */
function IntegrationMarquee() {
  return (
    <div className="launch-marquee">
      <ul className="sr-only">
        {INTEGRATION_MARKS.map((mark) => (
          <li key={mark.name}>{mark.name}</li>
        ))}
      </ul>
      <div className="launch-marquee-viewport" aria-hidden>
        <div className="launch-marquee-track">
          {[0, 1, 2, 3].map((pass) => (
            <div className="launch-marquee-group" key={pass}>
              {INTEGRATION_MARKS.map((mark) => (
                <span className="launch-marquee-item" key={mark.name}>
                  <svg viewBox="0 0 24 24" className="launch-marquee-glyph">
                    <path fill="currentColor" d={mark.path} />
                  </svg>
                  <span className="launch-marquee-label">{mark.name}</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="currentColor"
        d="M18.244 2H21.5l-7.51 8.58L22.5 22h-6.78l-5.31-6.94L4.3 22H1.04l8.03-9.18L1.5 2h6.96l4.8 6.35L18.244 2Zm-1.19 18h1.88L7.06 4H5.07l11.984 16Z"
      />
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="currentColor"
        d="M20.317 4.37a19.8 19.8 0 0 0-4.885-1.515c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.6 12.6 0 0 0-.617-1.25A19.7 19.7 0 0 0 3.677 4.37C.533 9.046-.32 13.58.099 18.057a19.9 19.9 0 0 0 5.993 3.03c.45-.622.862-1.29 1.226-1.994a13 13 0 0 1-1.872-.892l.372-.292c3.928 1.793 8.18 1.793 12.062 0l.373.292a12.3 12.3 0 0 1-1.873.892c.36.698.772 1.362 1.225 1.993a19.8 19.8 0 0 0 6.002-3.03c.5-5.177-.838-9.674-3.549-13.66ZM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419s.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418Zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419s.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418Z"
      />
    </svg>
  );
}

export function LaunchPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  useRevealOnView(pageRef);

  const { plans, recommendedPlan, settled } = usePlanCatalog();
  const { mounted, phase } = useProductHuntPhase();
  const phActive = mounted && (phase === "pre" || phase === "live");
  const heroRef = useRef<HTMLElement>(null);
  const [stickyCta, setStickyCta] = useState(false);

  // Reveal the sticky bar only once the hero CTA is off screen, so the page
  // never shows two competing primary buttons at the same time.
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    const observer = new IntersectionObserver(
      ([entry]) => setStickyCta(!entry?.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const attribution = readAttributionCookie();
    captureAnalytics("launch_page_viewed", {
      ...(attribution?.r ? { ref: attribution.r } : {}),
      ...(attribution?.c ? { cid: attribution.c } : {}),
    });
  }, []);

  const merged = mergePricingPlans(plans, recommendedPlan);
  const pro = merged.find((plan) => plan.id === "pro");
  const copy = phActive ? productHuntCopy(phase) : null;
  // A noun phrase, not the pricing-card adjective ("7-day trial"), so it reads
  // in running copy: "7 days of Pro free", "Start with 7 days of Pro free".
  const trialDays = pro?.trialDaysMonth ?? null;
  const trialLabel = trialDays ? `${trialDays} days` : "7 days";
  // Entry price anchors the discount codes. The trial itself runs on Pro, so
  // the two numbers are deliberately kept apart in the copy.
  const entryPrice = merged.find((plan) => plan.id === "lite")?.price ?? "$9";

  return (
    <div ref={pageRef} className="launch-page">
      <SiteHeader />
      <main id="main">
        <section className="launch-hero" ref={heroRef}>
          <img
            src="/assets/landing/atmosphere/light-beams.webp"
            srcSet="/assets/landing/atmosphere/light-beams-768.webp 768w, /assets/landing/atmosphere/light-beams-1280.webp 1280w, /assets/landing/atmosphere/light-beams.webp 1728w"
            sizes="100vw"
            alt=""
            aria-hidden
            width={1728}
            height={2437}
            className="launch-hero-beams"
            decoding="async"
          />
          <img
            src="/assets/landing/atmosphere/clouds.webp"
            srcSet="/assets/landing/atmosphere/clouds-768.webp 768w, /assets/landing/atmosphere/clouds-1280.webp 1280w, /assets/landing/atmosphere/clouds.webp 1728w"
            sizes="100vw"
            alt=""
            aria-hidden
            width={1728}
            height={806}
            className="launch-hero-clouds"
            decoding="async"
          />
          <div className="launch-hero-inner">
            <div className="launch-hero-copy">
              <p
                className="reveal-item font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-brand)]"
                data-reveal="mount"
                data-reveal-delay="1"
              >
                {phase === "live" ? "Launch week offer" : "Pre-launch offer"}
              </p>
              <h1
                className="reveal-item mt-4 max-w-xl font-display text-4xl italic leading-[1.05] tracking-[-0.02em] text-[var(--color-ink)] sm:text-5xl lg:text-[3.5rem]"
                data-reveal="mount"
                data-reveal-delay="1"
              >
                You close the laptop at 11. Your{" "}
                <span className="text-[var(--color-brand)]">AI employee</span>{" "}
                is on shift.
              </h1>
              <p
                className="reveal-item mt-5 max-w-xl text-lg leading-relaxed text-[var(--color-ink-muted)]"
                data-reveal="mount"
                data-reveal-delay="2"
              >
                Your constraint was never ideas. It was hours. Construct is an
                AI employee with its own computer: hand it the list before bed,
                it works through the night, and you can open the screen any time
                to watch it or take the mouse back.
              </p>
              <p
                className="reveal-item mt-4 max-w-xl text-sm leading-relaxed text-[var(--color-ink-subtle)]"
                data-reveal="mount"
                data-reveal-delay="2"
              >
                {trialLabel} of Pro free, the full desktop. Plans from{" "}
                <span className="font-semibold text-[var(--color-ink)]">
                  {entryPrice}/month
                </span>{" "}
                after that, less with the launch codes below.
              </p>
              <div
                className="reveal-item mt-8 flex flex-wrap items-center gap-3"
                data-reveal="mount"
                data-reveal-delay="3"
              >
                <StartLink
                  source="launch-hero"
                  intent="start"
                  authedChildren="Open Construct"
                  className={cn(
                    "site-cta inline-flex min-h-12 items-center rounded-full bg-[var(--color-ink)]",
                    "px-8 text-base font-semibold text-white no-underline",
                  )}
                  onClick={() => {
                    captureAnalytics("launch_cta_clicked", {
                      position: "hero",
                      action: "start",
                    });
                  }}
                >
                  Create your account
                </StartLink>
                <a
                  href={WALKTHROUGH_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="launch-secondary-cta"
                  onClick={() => {
                    captureAnalytics("launch_walkthrough_clicked", {
                      position: "hero",
                    });
                  }}
                >
                  Book a walkthrough
                </a>
              </div>
              <p
                className="reveal-item mt-3 text-sm text-[var(--color-ink-subtle)]"
                data-reveal="mount"
                data-reveal-delay="3"
              >
                {settled && !trialDays
                  ? "Trial length is shown at checkout. Cancel any time from your account."
                  : "Cancel any time from your account. Tell us your stack and we walk through a night on it."}
              </p>
            </div>
            <div
              className="reveal-item launch-hero-visual"
              data-reveal="mount"
              data-reveal-delay="2"
            >
              <LaunchCollage />
            </div>
          </div>
        </section>

        <div className="launch-mid">
          <section className="launch-shift" aria-labelledby="launch-shift">
            <div
              className="launch-shift-intro reveal-item"
              data-reveal-delay="1"
            >
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-brand)]">
                One night
              </p>
              <h2
                id="launch-shift"
                className="mt-3 font-display text-2xl italic tracking-[-0.02em] text-[var(--color-ink)] sm:text-3xl"
              >
                What a shift looks like
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-[var(--color-ink-muted)] sm:text-base">
                A reported night, hour by hour, inside the tools a small team
                already pays for.
              </p>
            </div>
            <ol className="launch-shift-list">
              {SHIFT.map((entry, index) => (
                <li
                  key={entry.time}
                  className="launch-shift-entry reveal-item"
                  data-reveal-delay={String(Math.min(index + 1, 4))}
                >
                  <span className="launch-shift-time font-mono text-xs tabular-nums">
                    {entry.time}
                  </span>
                  <div className="launch-shift-body">
                    <h3 className="text-[15px] font-semibold leading-snug tracking-[-0.01em] text-[var(--color-ink)] sm:text-base">
                      {entry.title}
                    </h3>
                    {entry.body && (
                      <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-ink-muted)]">
                        {entry.body}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
            <p
              className="launch-shift-kicker reveal-item"
              data-reveal-delay="4"
            >
              You never needed a faster tool. You needed someone else awake.
            </p>
          </section>

          <section className="launch-stack" aria-labelledby="launch-stack">
            <div
              className="launch-stack-head reveal-item"
              data-reveal-delay="1"
            >
              <h2
                id="launch-stack"
                className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-brand)]"
              >
                How a night like that is possible
              </h2>
              <p className="launch-stack-lead">
                Every agent gets its own cloud desktop: files, a browser, a
                terminal, email, and a calendar. It keeps them, so Friday's run
                still knows what Monday's set up. And it works inside the tools
                you already pay for.
              </p>
            </div>
            <IntegrationMarquee />
            <div
              className="launch-stack-tail reveal-item"
              data-reveal-delay="2"
            >
              <p className="launch-stack-note">
                Plus Slack, Stripe, and your own MCP tools. No API for it?
                Construct opens a real browser and clicks through like a person
                would. Needs code? It has a sandbox terminal. Nothing to
                integrate, no IT project, no consultant.
              </p>
            </div>
          </section>

          <section className="launch-founder" aria-labelledby="launch-founder">
            <figure
              className="launch-founder-card reveal-item"
              data-reveal-delay="1"
            >
              <img
                src="/assets/landing/founder/ankush.webp"
                alt=""
                aria-hidden
                width={96}
                height={96}
                className="launch-founder-avatar"
                loading="lazy"
                decoding="async"
              />
              <div>
                <h2
                  id="launch-founder"
                  className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-ink-subtle)]"
                >
                  Why I built it
                </h2>
                <blockquote className="launch-founder-quote">
                  <p>
                    I built developer tools before this. The last one reached
                    30,000 users and was acquired. The engineering was never the
                    problem. I was also the ops team: invoicing, CRM, support,
                    follow-ups, all of it running through me on top of shipping.
                    I did all of it myself and it wrecked me.
                  </p>
                  <p className="mt-3">
                    Hiring was the obvious answer and the runway math said no.
                    So I ran every agent I could find. Too expensive to leave
                    running, too slow when it mattered, and not one of them
                    could act on its own. The models were ready. Nothing around
                    them was. So I built the thing I had been looking for.
                  </p>
                </blockquote>
                <figcaption className="launch-founder-name">
                  Ankush, co-founder, Construct
                </figcaption>
              </div>
            </figure>
          </section>

          <div className="launch-offer-band">
            <section className="launch-codes" aria-labelledby="launch-codes">
              <div className="reveal-item" data-reveal-delay="1">
                <h2
                  id="launch-codes"
                  className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-ink-subtle)]"
                >
                  Your launch offer
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-muted)]">
                  Start with {trialLabel} of Pro free. After the trial, pick one
                  code at checkout: 20% off your first three months on monthly,
                  or 40% off a full year on annual.
                </p>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {PROMO_CODES.map((promo, index) => (
                  <div
                    key={promo.code}
                    className="reveal-item"
                    data-reveal-delay={String(Math.min(index + 2, 4))}
                  >
                    <PromoChip {...promo} />
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs leading-relaxed text-[var(--color-ink-subtle)]">
                Enter your code at checkout.{" "}
                {phase === "live"
                  ? "Launch-week codes while the Product Hunt campaign is live."
                  : phase === "hidden"
                    ? "Codes apply at checkout while the offer lasts."
                    : "Both hold until we go live on Product Hunt."}
              </p>
              <div className="reveal-item mt-6" data-reveal-delay="3">
                <StartLink
                  source="launch-codes"
                  intent="start"
                  authedChildren="Open Construct"
                  className={cn(
                    "site-cta inline-flex min-h-11 items-center rounded-full bg-[var(--color-ink)]",
                    "px-6 text-sm font-semibold text-white no-underline",
                  )}
                  onClick={() => {
                    captureAnalytics("launch_cta_clicked", {
                      position: "codes",
                      action: "start",
                    });
                  }}
                >
                  Create account, codes apply at checkout
                </StartLink>
              </div>
            </section>
          </div>

          <div className="launch-mid">
            <section className="launch-faq" aria-labelledby="launch-faq">
              <h2
                id="launch-faq"
                className="reveal-item font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-ink-subtle)]"
                data-reveal-delay="1"
              >
                Before you start
              </h2>
              <Accordion.Root type="multiple" className="launch-faq-list">
                {FAQ.map((item, index) => (
                  <Accordion.Item
                    key={item.question}
                    value={`launch-faq-${index}`}
                    className="launch-faq-item reveal-item"
                    data-reveal-delay={String(Math.min(index + 1, 4))}
                  >
                    <Accordion.Header>
                      <Accordion.Trigger className="launch-faq-trigger group">
                        <span>{item.question}</span>
                        <Plus aria-hidden className="launch-faq-icon" />
                      </Accordion.Trigger>
                    </Accordion.Header>
                    <Accordion.Content className="launch-faq-content">
                      <p className="launch-faq-answer">{item.answer}</p>
                    </Accordion.Content>
                  </Accordion.Item>
                ))}
              </Accordion.Root>
            </section>
          </div>

          <section className="launch-close" aria-labelledby="launch-close">
            <div
              className="launch-close-inner reveal-item"
              data-reveal-delay="1"
            >
              <h2
                id="launch-close"
                className="font-display text-2xl italic tracking-[-0.02em] text-[var(--color-ink)] sm:text-3xl"
              >
                Hire your first AI employee tonight
              </h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--color-ink-muted)]">
                {trialLabel} of Pro free, then plans from {entryPrice}/month.
                Cancel any time from your account.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <StartLink
                  source="launch-footer"
                  intent="start"
                  authedChildren="Open Construct"
                  className={cn(
                    "site-cta inline-flex min-h-12 items-center rounded-full bg-[var(--color-ink)]",
                    "px-8 text-base font-semibold text-white no-underline",
                  )}
                  onClick={() => {
                    captureAnalytics("launch_cta_clicked", {
                      position: "footer",
                      action: "start",
                    });
                  }}
                >
                  Create your account
                </StartLink>
                <a
                  href={WALKTHROUGH_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="launch-secondary-cta"
                  onClick={() => {
                    captureAnalytics("launch_walkthrough_clicked", {
                      position: "footer",
                    });
                  }}
                >
                  Book a walkthrough
                </a>
              </div>
            </div>
          </section>

          <section
            className="launch-community"
            aria-labelledby="launch-community"
          >
            <div
              className="launch-community-inner reveal-item"
              data-reveal-delay="1"
            >
              <h2
                id="launch-community"
                className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-ink-subtle)]"
              >
                Not ready yet?
              </h2>
              {/* GTM list leads with Discord: most of these readers are not
                  Product Hunt users, so PH is kept as a footnote below. */}
              <p className="mt-3 max-w-md text-[15px] leading-relaxed text-[var(--color-ink-muted)]">
                Come see what people are running before you commit. We answer
                questions in Discord and post what shipped on X.
              </p>
              <div className="launch-community-links">
                <a
                  href="https://discord.gg/puArEQHYN9"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="launch-community-link"
                  onClick={() => {
                    captureAnalytics("launch_social_clicked", {
                      network: "discord",
                      source: "launch",
                    });
                  }}
                >
                  <DiscordIcon />
                  Join Discord
                </a>
                <a
                  href="https://x.com/use_construct"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="launch-community-link"
                  onClick={() => {
                    captureAnalytics("launch_social_clicked", {
                      network: "x",
                      source: "launch",
                    });
                  }}
                >
                  <XIcon />
                  Follow on X
                </a>
              </div>
              {phActive && copy && (
                <div className="launch-community-ph">
                  <p className="launch-community-ph-note">
                    {copy.homepageLead}
                  </p>
                  <ProductHuntBadge
                    surface="launch"
                    className="launch-community-badge"
                  />
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
      {/* Mobile only: campaign traffic skews mobile and every other CTA is
          in-flow, so the offer stays reachable once the hero scrolls away. */}
      <div
        className="launch-sticky-cta"
        data-visible={stickyCta ? "" : undefined}
        aria-hidden={stickyCta ? undefined : true}
      >
        <div className="launch-sticky-cta-copy">
          <span className="launch-sticky-cta-lead">
            {trialLabel} of Pro free
          </span>
          <span className="launch-sticky-cta-sub">
            then from {entryPrice}/month
          </span>
        </div>
        <StartLink
          source="launch-sticky"
          intent="start"
          authedChildren="Open"
          className={cn(
            "site-cta inline-flex min-h-11 shrink-0 items-center rounded-full",
            "bg-[var(--color-ink)] px-5 text-sm font-semibold text-white no-underline",
          )}
          onClick={() => {
            captureAnalytics("launch_cta_clicked", {
              position: "sticky",
              action: "start",
            });
          }}
        >
          Create account
        </StartLink>
      </div>
      <SiteFooter />
    </div>
  );
}
