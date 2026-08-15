import { useMemo, useRef } from "react";
import { SiteFooter, SiteHeader } from "../../components/layout/site-layout";
import { captureAnalytics } from "../analytics/analytics.client";

import { featureCards } from "~/content/landing";

import { StartLink } from "./beta-access";
import { CampaignBanner } from "./campaign-banner";
// we temporearily commented and dont delete
// import { FounderNote } from "./founder-note";
import { WALKTHROUGH_URL } from "./cta-links";
import { ProductHuntBadge } from "../product-hunt/product-hunt-badge";
import { AutoVideo, useRevealOnView } from "./media";
import { mergePricingPlans, pricingFloorLabel } from "./merge-pricing-catalog";
// Temporarily disabled — do not delete. Hero collage pointer parallax.
// import { usePointerParallax } from "./use-pointer-parallax";
import { JournalSection } from "./journal-section";
import { FaqSection, PricingSection } from "./pricing-section";
import { usePlanCatalog } from "./use-plan-catalog";
import { WorkflowSection } from "./workflow-section";
import "./landing.css";

function HeroProductHuntCta() {
  return <ProductHuntBadge surface="hero" className="hero-ph-badge" />;
}

function HeroHeadline() {
  const catalog = usePlanCatalog();
  const plans = useMemo(
    () => mergePricingPlans(catalog.plans, catalog.recommendedPlan),
    [catalog.plans, catalog.recommendedPlan],
  );
  const floor = pricingFloorLabel(plans) ?? "$9";
  const trialDays = plans.find((p) => p.id === "pro")?.trialDaysMonth ?? null;
  const trialLabel = trialDays ? `${trialDays} days` : "7 days";

  return (
    <div className="hero-headline mx-auto max-w-[560px] text-center md:mx-0 md:text-left">
      <div
        aria-hidden="true"
        className="reveal-item font-display text-balance text-[38px] capitalize italic leading-[1.1] tracking-[-0.02em] text-[#4e4646] xl:text-[51.8px] xl:leading-[58px]"
        data-reveal="mount"
        data-reveal-delay="1"
      >
        <span>An </span>
        <span className="text-[#01b4c8]">AI Employee </span>
        <span>You Can Actually </span>
        <span className="text-[#01b4c8]">Work With</span>
      </div>
      {/* <p
        className="reveal-item mx-auto mt-5 max-w-[360px] text-[15px] leading-[21px] text-[#627c86] xl:mx-0 xl:mt-6 xl:max-w-[520px] xl:text-base xl:leading-[22px]"
        data-reveal="mount"
        data-reveal-delay="2"
      >
        <span className="xl:hidden">
          Your constraint is hours, not ideas. Construct gives an AI employee a
          real computer so the work finishes while you do something else.
        </span>
        <span className="hidden xl:inline">
          Your constraint is hours, not ideas. Construct gives an AI employee a
          real computer so research, inbox, and follow-ups finish while you do
          something else.
        </span>
      </p> */}
      <div
        className="hero-cta-row reveal-item mt-7 flex w-full flex-col items-center lg:items-start gap-2 xl:mt-8 xl:flex-row xl:flex-wrap xl:items-center xl:justify-start xl:gap-4"
        data-reveal="mount"
        data-reveal-delay="3"
      >
        <StartLink
          source="hero"
          className="landing-cta inline-flex h-[57px] w-full max-w-[227px] items-center justify-center px-[30px] text-[21px]"
          authedChildren="Open OS"
          onClick={() => {
            captureAnalytics("cta_clicked", {
              position: "hero",
              action: "start",
            });
          }}
        >
          Start Now
        </StartLink>
        <HeroProductHuntCta />
      </div>
      {/* The homepage otherwise shows no price until the pricing section. */}
      <p
        className="hero-offer-line reveal-item mx-auto mt-3 max-w-[360px] text-[13px] leading-[19px] text-[#7d949c] xl:mx-0 xl:max-w-[520px]"
        data-reveal="mount"
        data-reveal-delay="3"
      >
        {trialLabel} of Pro free. Then plans from{" "}
        <span className="font-semibold text-[#4e4646]">{floor}/month</span>.
        Cancel any time.
      </p>
      {/* Low-commitment path for readers who will not sign up on a first
          visit. Under the offer line, aligned with Start Now. */}
      <div
        className="hero-walkthrough-row reveal-item"
        data-reveal="mount"
        data-reveal-delay="4"
      >
        <a
          href={WALKTHROUGH_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hero-secondary-cta"
          onClick={() => {
            captureAnalytics("walkthrough_clicked", { position: "hero" });
          }}
        >
          Book a walkthrough
        </a>
      </div>
    </div>
  );
}

function WorkflowChip({
  image,
  label,
  className,
}: {
  image: string;
  label: string;
  className: string;
}) {
  return (
    <StartLink
      source="hero-workflow"
      label={`Try Construct - ${label}`}
      className={`hero-interactive flex h-[38px] w-[216px] items-center gap-[14px] rounded-lg border border-[#f0f0f0] bg-white px-2 text-xs text-[#0b0b0b] shadow-[0_4px_14px_-6px_rgba(15,23,42,.18),inset_0_4px_4px_rgba(255,255,255,.25)] ${className}`}
    >
      <img
        src={image}
        alt=""
        width="256"
        height="256"
        className="h-7 w-7 rounded-[20px] object-contain"
      />
      <span>{label}</span>
    </StartLink>
  );
}

function Hero() {
  // The scene owns `--mx` / `--my`; each layer scales them by its own depth so
  // the collage separates instead of sliding as one flat plate.
  const sceneRef = useRef<HTMLDivElement>(null);
  // Temporarily disabled — do not delete. Hero collage pointer parallax.
  // usePointerParallax(sceneRef);

  return (
    <section
      aria-labelledby="landing-title"
      className="hero-section relative mx-auto w-full max-w-[1500px] overflow-hidden px-5 sm:px-6 lg:px-16"
    >
      <h1 id="landing-title" className="sr-only">
        An AI employee you can actually work with
      </h1>
      <div className="hero-stage relative isolate mx-auto w-full max-w-[1400px]">
        <div className="hero-copy relative z-30">
          <HeroHeadline />
        </div>
        <div ref={sceneRef} className="hero-scene relative isolate">
          <div className="hero-portal absolute aspect-square">
            <div
              className="reveal-item h-full w-full"
              data-reveal="mount"
              data-reveal-delay="1"
            >
              <StartLink
                source="hero-portal"
                label="Try Construct - Construct AI workspace"
                className="hero-link block h-full w-full"
              >
                <span className="block h-full w-full">
                  <AutoVideo
                    src="/assets/landing/hero/portal.mp4"
                    poster="/assets/landing/hero/portal-poster.jpg"
                    decorative
                  />
                </span>
              </StartLink>
            </div>
          </div>
          <div className="hero-report absolute z-20">
            <div
              className="reveal-item"
              data-reveal="mount"
              data-reveal-delay="2"
            >
              <StartLink
                source="hero-report"
                label="Try Construct - research report"
                className="hero-link block"
              >
                <img
                  src="/assets/landing/hero/research-report.webp"
                  alt="Generated PDF research report produced by the Construct AI agent"
                  width="1272"
                  height="705"
                  className="hero-interactive block w-full"
                />
              </StartLink>
            </div>
          </div>
          <div className="hero-chat absolute z-20">
            <div
              className="reveal-item"
              data-reveal="mount"
              data-reveal-delay="6"
            >
              <StartLink
                source="hero-chat"
                label="Try Construct - agent chat"
                className="hero-link block"
              >
                <img
                  src="/assets/landing/hero/agent-chat.webp"
                  alt="Construct agent chat window handling an inbound email autonomously"
                  width="825"
                  height="459"
                  className="hero-interactive block w-full"
                />
              </StartLink>
            </div>
          </div>
          <div className="hero-search absolute z-20">
            <div
              className="reveal-item"
              data-reveal="mount"
              data-reveal-delay="7"
            >
              <StartLink
                source="hero-search"
                label="Try Construct - workspace search"
                className="hero-link block"
              >
                <img
                  src="/assets/landing/hero/search-bar.png"
                  alt="Search inside the Construct AI work desktop"
                  width="1365"
                  height="135"
                  className="hero-interactive block w-full"
                />
              </StartLink>
            </div>
          </div>
          <div className="hero-workflow absolute z-30">
            <div
              className="reveal-item"
              data-reveal="mount"
              data-reveal-delay="3"
            >
              <WorkflowChip
                image="/assets/landing/hero/google-meet.png"
                label="Researched the Topic"
                className=""
              />
            </div>
            <div
              className="reveal-item mt-3"
              data-reveal="mount"
              data-reveal-delay="4"
            >
              <WorkflowChip
                image="/assets/landing/hero/gmail.png"
                label="Replied to the Mails"
                className=""
              />
            </div>
            <div
              className="reveal-item mt-3"
              data-reveal="mount"
              data-reveal-delay="5"
            >
              <WorkflowChip
                image="/assets/landing/hero/google-docs.png"
                label="Prepared the Report"
                className=""
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function WhatConstructIs() {
  return (
    <section
      id="what"
      aria-label="What is Construct Computer?"
      className="what-section relative z-10 mx-auto w-full max-w-4xl scroll-mt-16 px-6 pb-6 pt-4 text-center lg:pt-6"
    >
      {/* we temporearily commented and dont delete */}
      {/* <h2
        id="what-heading"
        className="reveal-item text-balance text-3xl tracking-[-0.02em] sm:text-4xl lg:text-[51.8px] lg:leading-[58px]"
        data-reveal-delay="1"
      >
        <span className="text-[#4e4646]">What is </span>
        <span className="font-display italic text-[#01b4c8]">
          Construct Computer?
        </span>
      </h2> */}
      {/* we temporearily commented and dont delete */}
      {/* <div
        className="reveal-item mx-auto mt-6 max-w-[720px] space-y-4 text-base leading-[21px] text-[#627c86]"
        data-reveal-delay="2"
      >
        <p>
          For solo founders, early startups, and small teams who juggle CRMs,
          inboxes, and automations instead of hiring. Hours are the constraint,
          not ideas, and Construct closes that gap.
        </p>
        <p>
          You get one AI employee with its own cloud desktop: files, memory, a
          browser, a terminal, email, a calendar, and your connected apps.
          Assign the outcome and it finishes the work while you do something
          else, in a workspace you can inspect and steer.
        </p>
      </div> */}
    </section>
  );
}

function AdaptsSection() {
  return (
    <section
      aria-label="Work That Remembers, Runs, and Repeats"
      className="mx-auto max-w-3xl px-6 py-4 text-center lg:py-6"
    >
      {/* we temporearily commented and dont delete */}
      {/* <h2
        id="adapts-heading"
        className="reveal-item text-balance text-3xl capitalize tracking-[-0.02em] sm:text-4xl lg:text-[51.8px] lg:leading-[58px]"
        data-reveal-delay="1"
      >
        <span className="text-[#4e4646]">Work That Remembers, Runs,</span>{" "}
        <span className="font-display italic text-[#01b4c8]">and Repeats</span>
      </h2> */}
      {/* we temporearily commented and dont delete */}
      {/* <p
        className="reveal-item mx-auto mt-6 max-w-[495px] text-base leading-[21px] text-[#627c86]"
        data-reveal-delay="2"
      >
        One persistent workspace keeps the context, tools, procedures, and proof
        behind the work, so Monday&rsquo;s job still makes sense on Friday.
      </p> */}
    </section>
  );
}

function FeatureGrid() {
  return (
    <section
      id="capabilities"
      aria-labelledby="capabilities-heading"
      className="relative z-30 scroll-mt-16 pb-4 pt-12 lg:pb-6 lg:pt-20"
    >
      <h2 id="capabilities-heading" className="sr-only">
        Construct capabilities
      </h2>
      <div className="feature-grid mx-auto grid w-full max-w-[1078px] grid-cols-1 gap-4 px-5 lg:grid-cols-3 lg:gap-5 lg:px-0">
        {featureCards.map((card, index) => {
          const className = `feature-card reveal-item block h-auto w-full overflow-hidden rounded-[18px] bg-white object-cover shadow-[0_8px_32px_rgba(71,156,223,.12)] ${card.wide ? "feature-card-wide lg:col-span-2" : ""}`;
          const delay = String(Math.min(index, 3) + 1);

          if ("video" in card) {
            return (
              <div key={card.video} className={className} data-reveal-delay={delay}>
                <AutoVideo
                  src={card.video}
                  webm={card.webm}
                  poster={card.poster}
                  label={card.alt}
                  width={346}
                  height={346}
                  preload="none"
                  className="block h-auto w-full object-cover"
                />
              </div>
            );
          }

          return (
            <img
              key={card.src}
              src={card.src}
              alt={card.alt}
              width={card.wide ? 712 : 346}
              height={346}
              loading="lazy"
              decoding="async"
              className={className}
              data-reveal-delay={delay}
            />
          );
        })}
      </div>
    </section>
  );
}

function WorkSection() {
  return (
    <section
      aria-labelledby="work-heading"
      className="work-section relative z-0 overflow-visible bg-transparent px-5 pb-16 pt-24"
    >
      <div
        aria-hidden
        className="work-grass-wrap pointer-events-none absolute inset-x-0 top-[-92px] z-0 h-[390px]"
      >
        <img
          src="/assets/landing/atmosphere/grass.webp"
          alt=""
          width="1728"
          height="1062"
          loading="lazy"
          decoding="async"
          className="work-grass absolute bottom-0 left-1/2 w-[205%] max-w-none -translate-x-1/2 opacity-85 lg:left-0 lg:w-full lg:translate-x-0 lg:opacity-100"
        />
      </div>
      <div className="relative z-10 mx-auto w-full max-w-[1574px]">
        <div className="work-panel relative overflow-hidden rounded-[36px] bg-white px-4 pb-8 pt-9 backdrop-blur-[13.55px]">
          <h2
            id="work-heading"
            className="work-headline reveal-item mx-auto max-w-[813px] text-center capitalize"
            data-reveal-delay="1"
          >
            <span className="text-[#4e4646]">
              Stop Juggling Inboxes, CRMs, And
            </span>{" "}
            <span className="font-display italic text-[#01b4c8]">
              Half-Finished Automations
            </span>
          </h2>
          <div
            className="reveal-item work-video mx-auto mt-8 aspect-[1166/653] w-full max-w-[1166px] overflow-hidden rounded-[28px] bg-white"
            data-reveal-delay="2"
          >
            <AutoVideo
              src="/assets/landing/work/demo.mp4"
              poster="/assets/landing/work/demo-poster.jpg"
              label="Construct organizing work across emails, files, and CRM"
            />
          </div>
          <p
            className="work-headline reveal-item mx-auto mt-6 max-w-[857px] text-center capitalize lg:mt-8"
            data-reveal-delay="3"
          >
            <span className="font-display italic text-[#01b4c8]">
              Let Construct
            </span>{" "}
            <span className="text-[#4e4646]">
              Track What&rsquo;s Running And Finish The Loop
            </span>
          </p>
          <div
            className="reveal-item mt-7 flex justify-center lg:mt-9"
            data-reveal-delay="4"
          >
            <StartLink
              source="work"
              className="landing-cta min-h-[57px] w-[227px] px-[30px] text-[21px]"
              authedChildren="Open OS"
            >
              Start Now
            </StartLink>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Final ask. Without it the page ended on the FAQ accordion, whose only button
 * is a support mailto, so a reader who got all the way down had to scroll back
 * up to act.
 */
function ClosingCta() {
  const catalog = usePlanCatalog();
  const plans = useMemo(
    () => mergePricingPlans(catalog.plans, catalog.recommendedPlan),
    [catalog.plans, catalog.recommendedPlan],
  );
  const floor = pricingFloorLabel(plans) ?? "$9";
  const trialDays = plans.find((p) => p.id === "pro")?.trialDaysMonth ?? null;
  const trialLabel = trialDays ? `${trialDays} days` : "7 days";

  return (
    <section aria-labelledby="closing-heading" className="closing-cta">
      <div className="closing-cta-inner reveal-item" data-reveal-delay="1">
        <h2 id="closing-heading" className="closing-cta-title">
          Hire your first{" "}
          <span className="font-display italic text-[#01b4c8]">
            AI employee
          </span>{" "}
          tonight
        </h2>
        <p className="closing-cta-lead">
          {trialLabel} of Pro free, then plans from {floor}/month. Cancel any
          time from your account.
        </p>
        <div className="closing-cta-row">
          <StartLink
            source="closing"
            authedChildren="Open OS"
            className="landing-cta inline-flex h-[57px] w-full max-w-[227px] items-center justify-center px-[30px] text-[21px]"
            onClick={() => {
              captureAnalytics("cta_clicked", {
                position: "closing",
                action: "start",
              });
            }}
          >
            Start Now
          </StartLink>
          <a
            href={WALKTHROUGH_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hero-secondary-cta"
            onClick={() => {
              captureAnalytics("walkthrough_clicked", { position: "closing" });
            }}
          >
            Book a walkthrough
          </a>
        </div>
      </div>
    </section>
  );
}

export function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  useRevealOnView(rootRef);

  return (
    <div
      ref={rootRef}
      className="landing-page relative min-h-dvh w-full overflow-x-clip bg-white text-[#4e4646]"
    >
      <SiteHeader />
      <CampaignBanner />
      <main id="main">
        <Hero />
        <WhatConstructIs />
        <div className="landing-atmosphere relative w-full bg-[linear-gradient(to_bottom,#fff_0%,#fff_4%,#ddfaff_15%,#ddfaff_45%,#fefefe_75%,#fff_100%)]">
          <img
            src="/assets/landing/atmosphere/light-beams.webp"
            srcSet="/assets/landing/atmosphere/light-beams-768.webp 768w, /assets/landing/atmosphere/light-beams-1280.webp 1280w, /assets/landing/atmosphere/light-beams.webp 1728w"
            sizes="100vw"
            alt=""
            aria-hidden
            width="1728"
            height="2437"
            loading="lazy"
            decoding="async"
            className="landing-light-beams pointer-events-none absolute left-0 top-[5%] z-0 w-full"
          />
          <div className="relative z-10">
            <img
              src="/assets/landing/atmosphere/clouds.webp"
              srcSet="/assets/landing/atmosphere/clouds-768.webp 768w, /assets/landing/atmosphere/clouds-1280.webp 1280w, /assets/landing/atmosphere/clouds.webp 1728w"
              sizes="100vw"
              alt=""
              aria-hidden
              width="1728"
              height="806"
              loading="lazy"
              decoding="async"
              className="landing-clouds pointer-events-none absolute inset-x-0 top-0 z-0 w-full"
            />
            <AdaptsSection />
            <WorkflowSection />
            <FeatureGrid />
          </div>
        </div>
        <WorkSection />
        {/* we temporearily commented and dont delete */}
        {/* Trust before price: who built this, then what it costs. */}
        {/* <section
          aria-labelledby="founder-heading"
          className="mx-auto w-full max-w-[860px] px-5 py-10 xl:py-14"
        >
          <FounderNote headingId="founder-heading" />
        </section> */}
        <PricingSection />
        <FaqSection />
        <JournalSection />
        <ClosingCta />
      </main>
      <SiteFooter />
    </div>
  );
}
