import * as Accordion from "@radix-ui/react-accordion";
import {
  Cloud,
  Footprints,
  KeyRound,
  Mail,
  Network,
  PanelsTopLeft,
  Plus,
  Timer,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { SiteFooter, SiteHeader } from "../../components/layout/site-layout";
import { useAuth } from "../auth/auth-provider";
import { createCheckout } from "../../platform/api/billing";
import { getOsOrigin } from "../../platform/env";

import {
  featureCards,
  landingFaq,
  type BillingPeriod,
  type PricingIcon,
} from "~/content/landing";

import { StartLink } from "./beta-access";
import { AutoVideo, useRevealOnView } from "./media";
import {
  maxAnnualMonthsFree,
  mergePricingPlans,
  pricingFloorLabel,
  trialHighlightForPeriod,
  type PricingPlanView,
} from "./merge-pricing-catalog";
import { usePriceTicker } from "./price-ticker";
import { usePlanCatalog } from "./use-plan-catalog";
import { WorkflowSection } from "./workflow-section";
import "./landing.css";

function PricingCta({
  plan,
  period,
}: {
  plan: PricingPlanView;
  period: BillingPeriod;
}) {
  const { status, user } = useAuth();
  const [busy, setBusy] = useState(false);
  const planId = plan.id;

  if (status !== "authenticated" || !user) {
    return (
      <Link to={`/login?plan=${planId}`} className="pricing-button">
        {plan.cta}
      </Link>
    );
  }

  if (!user.onboardingCompleted) {
    return (
      <a href={getOsOrigin()} className="pricing-button">
        Finish setup in OS
      </a>
    );
  }

  return (
    <button
      type="button"
      className="pricing-button"
      disabled={busy}
      onClick={() => {
        void (async () => {
          setBusy(true);
          const result = await createCheckout(
            planId,
            period === "annual" ? "year" : "month",
          );
          setBusy(false);
          if (result.success) window.location.href = result.data.checkoutUrl;
          else window.location.href = `/account?plan=${planId}`;
        })();
      }}
    >
      {busy ? "Starting checkout…" : plan.cta}
    </button>
  );
}
const pricingIcons: Record<PricingIcon, LucideIcon> = {
  footprints: Footprints,
  workflow: Network,
  cloud: Cloud,
  timer: Timer,
  mail: Mail,
  tabs: PanelsTopLeft,
  key: KeyRound,
};

function HeroHeadline() {
  return (
    <div className="hero-headline max-w-[560px] text-center xl:text-left">
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
      <p
        className="reveal-item mx-auto mt-5 max-w-[360px] text-[15px] leading-[21px] text-[#627c86] xl:mx-0 xl:mt-6 xl:max-w-[520px] xl:text-base xl:leading-[22px]"
        data-reveal="mount"
        data-reveal-delay="2"
      >
        <span className="xl:hidden">
          Your constraint is hours, not ideas. Construct gives an AI coworker a
          real computer so the work finishes while you do something else.
        </span>
        <span className="hidden xl:inline">
          Your constraint is hours, not ideas. Construct gives an AI coworker a
          real computer so research, inbox, and follow-ups finish while you do
          something else.
        </span>
      </p>
      <div
        className="reveal-item flex items-center justify-center gap-5 xl:justify-start"
        data-reveal="mount"
        data-reveal-delay="3"
      >
        <StartLink
          source="hero"
          className="landing-cta mt-7 min-h-[57px] w-[227px] px-5 text-[21px] xl:mt-8"
        >
          Start Now
        </StartLink>
        <Link
          to="/affiliates/"
          className="hero-affiliate mt-8 hidden max-w-[150px] text-xs leading-4 text-[#627c86] transition-colors hover:text-[#01b4c8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#01b4c8] xl:block"
        >
          Affiliate program: 50% now, then 20% <span aria-hidden>→</span>
        </Link>
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
  return (
    <section
      aria-labelledby="landing-title"
      className="hero-section relative mx-auto w-full max-w-[1500px] overflow-hidden px-5 sm:px-6 lg:px-16"
    >
      <h1 id="landing-title" className="sr-only">
        An AI employee you can actually work with
      </h1>
      <div className="hero-stage relative isolate mx-auto w-full max-w-[1400px]">
        <div className="hero-copy relative z-20">
          <HeroHeadline />
        </div>
        <div className="hero-scene relative isolate">
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
              data-reveal-delay="3"
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
              data-reveal-delay="4"
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
              data-reveal-delay="4"
            >
              <WorkflowChip
                image="/assets/landing/hero/google-meet.png"
                label="Researched the Topic"
                className=""
              />
              <WorkflowChip
                image="/assets/landing/hero/gmail.png"
                label="Replied to the Mails"
                className="mt-3"
              />
              <WorkflowChip
                image="/assets/landing/hero/google-docs.png"
                label="Prepared the Report"
                className="mt-3"
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
      aria-labelledby="what-heading"
      className="what-section relative z-10 mx-auto w-full max-w-4xl scroll-mt-16 px-6 pb-12 pt-8 text-center lg:pt-16"
    >
      <h2
        id="what-heading"
        className="reveal-item text-balance text-3xl tracking-[-0.02em] sm:text-4xl lg:text-[51.8px] lg:leading-[58px]"
        data-reveal-delay="1"
      >
        <span className="text-[#4e4646]">What is </span>
        <span className="font-display italic text-[#01b4c8]">
          Construct Computer?
        </span>
      </h2>
      <div
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
      </div>
      <nav
        aria-label="Learn about Construct"
        className="reveal-item mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm"
        data-reveal-delay="3"
      >
        <a href="/blog/ai-employee/" className="text-[#01b4c8] hover:underline">
          AI employees →
        </a>
        <a
          href="/blog/ai-workflow-automation/"
          className="text-[#01b4c8] hover:underline"
        >
          Workflow automation →
        </a>
        <a
          href="/blog/ai-agent-memory/"
          className="text-[#01b4c8] hover:underline"
        >
          Agent memory →
        </a>
      </nav>
    </section>
  );
}

function AdaptsSection() {
  return (
    <section
      aria-labelledby="adapts-heading"
      className="mx-auto max-w-3xl px-6 py-10 text-center lg:pb-24 lg:pt-2"
    >
      <h2
        id="adapts-heading"
        className="reveal-item text-balance text-3xl capitalize tracking-[-0.02em] sm:text-4xl lg:text-[51.8px] lg:leading-[58px]"
        data-reveal-delay="1"
      >
        <span className="text-[#4e4646]">Work That Remembers, Runs,</span>{" "}
        <span className="font-display italic text-[#01b4c8]">and Repeats</span>
      </h2>
      <p
        className="reveal-item mx-auto mt-6 max-w-[495px] text-base leading-[21px] text-[#627c86]"
        data-reveal-delay="2"
      >
        One persistent workspace keeps the context, tools, procedures, and proof
        behind the work, so Monday&rsquo;s job still makes sense on Friday.
      </p>
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
        {featureCards.map((card, index) => (
          <img
            key={card.src}
            src={card.src}
            alt={card.alt}
            width={card.wide ? 712 : 346}
            height={346}
            loading="lazy"
            decoding="async"
            className={`feature-card reveal-item h-auto w-full rounded-[18px] bg-white shadow-[0_8px_32px_rgba(71,156,223,.12)] ${card.wide ? "feature-card-wide lg:col-span-2" : ""}`}
            data-reveal-delay={String(Math.min(index, 3) + 1)}
          />
        ))}
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
            className="reveal-item mx-auto max-w-[813px] text-center text-[31px] capitalize leading-[38px] tracking-[-0.02em] lg:text-[clamp(31px,2.05vw,32.8px)] lg:leading-[46px]"
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
            className="reveal-item mx-auto mt-6 max-w-[857px] text-center text-[31px] capitalize leading-[38px] lg:mt-8 lg:text-[clamp(31px,2.05vw,32.8px)] lg:leading-[46px]"
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
              className="landing-cta min-h-[57px] w-[227px] px-5 text-[21px]"
            >
              Start Now
            </StartLink>
          </div>
        </div>
      </div>
    </section>
  );
}

function BillingPeriodToggle({
  period,
  onChange,
  annualSavingsLabel,
}: {
  period: BillingPeriod;
  onChange: (period: BillingPeriod) => void;
  annualSavingsLabel: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLSpanElement>(null);
  const monthlyRef = useRef<HTMLButtonElement>(null);
  const annualRef = useRef<HTMLButtonElement>(null);

  const syncThumb = useCallback(() => {
    const thumb = thumbRef.current;
    const active =
      period === "monthly" ? monthlyRef.current : annualRef.current;
    if (!thumb || !active) return;
    thumb.style.width = `${active.offsetWidth}px`;
    thumb.style.transform = `translateX(${active.offsetLeft}px)`;
  }, [period]);

  useLayoutEffect(() => {
    syncThumb();
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => syncThumb());
    observer.observe(root);
    return () => observer.disconnect();
  }, [syncThumb]);

  return (
    <div
      ref={rootRef}
      className="billing-toggle"
      role="radiogroup"
      aria-label="Billing period"
      data-period={period}
    >
      <span ref={thumbRef} className="billing-toggle-thumb" aria-hidden />
      <button
        ref={monthlyRef}
        type="button"
        role="radio"
        aria-checked={period === "monthly"}
        className="billing-toggle-option"
        data-active={period === "monthly" ? "true" : undefined}
        onClick={() => onChange("monthly")}
      >
        Monthly
      </button>
      <button
        ref={annualRef}
        type="button"
        role="radio"
        aria-checked={period === "annual"}
        className="billing-toggle-option"
        data-active={period === "annual" ? "true" : undefined}
        onClick={() => onChange("annual")}
      >
        <span>Annual</span>
        <span className="billing-toggle-savings">{annualSavingsLabel}</span>
      </button>
    </div>
  );
}

function PricingCard({
  plan,
  period,
  revealDelay = 1,
}: {
  plan: PricingPlanView;
  period: BillingPeriod;
  revealDelay?: number;
}) {
  const targetPrice =
    period === "annual" ? plan.annualMonthlyPrice : plan.price;
  const displayPrice = usePriceTicker(targetPrice);
  const highlight =
    trialHighlightForPeriod(plan, period) ?? plan.highlight;

  const stackRef = useRef<HTMLSpanElement>(null);
  const amountRef = useRef<HTMLSpanElement>(null);
  const periodLabelRef = useRef<HTMLSpanElement>(null);

  const syncAmountLayout = useCallback(() => {
    const amount = amountRef.current;
    const stack = stackRef.current;
    const periodLabel = periodLabelRef.current;
    if (!amount || !stack || !periodLabel) return;
    const maxWidth = stack.offsetWidth;
    const activeWidth = amount.offsetWidth;
    periodLabel.style.transform = `translateX(${activeWidth - maxWidth}px)`;
  }, [displayPrice]);

  useLayoutEffect(() => {
    syncAmountLayout();
    const stack = stackRef.current;
    if (!stack || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => syncAmountLayout());
    observer.observe(stack);
    return () => observer.disconnect();
  }, [syncAmountLayout]);

  return (
    <article
      className="pricing-card reveal-item relative isolate w-full overflow-hidden rounded-[26px] bg-white shadow-[0_18px_48px_rgba(57,148,154,.08)] xl:shadow-none"
      data-reveal-delay={String(revealDelay)}
    >
      {" "}
      <div
        aria-hidden
        className="pricing-border pointer-events-none absolute inset-0 z-20 rounded-[26px] border border-[#35949a]/50"
      />
      {plan.badge ? (
        <span className="pricing-badge absolute left-3 top-14 z-30 inline-flex items-center rounded-full bg-[#01b4c8] px-2.5 py-1 text-[8px] font-black uppercase tracking-[.12em] text-white sm:left-auto sm:right-5 sm:top-5 sm:text-[9px]">
          {plan.badge}
        </span>
      ) : null}
      <div className="pricing-visual relative z-0 overflow-hidden">
        <img
          src={plan.image}
          alt={plan.imageAlt}
          width="870"
          height="608"
          loading="lazy"
          decoding="async"
          className={`pricing-image h-full w-full object-cover ${plan.name === "Lite" ? "object-[84%_center] sm:object-center" : plan.name === "Starter" ? "object-[66%_center] sm:object-center" : "object-center"}`}
        />
        <div className="pricing-summary absolute z-10 text-[#014e59]">
          <div>
            <h3 className="font-display text-[29px] leading-none xl:text-[38px]">
              {plan.name}
            </h3>
            {plan.name === "Lite" ? (
              <p className="mt-2 max-w-[150px] text-[10px] leading-[13px] text-[#17707d] xl:max-w-[190px] xl:text-xs xl:leading-4">
                {plan.description}
              </p>
            ) : null}
          </div>
          <div className="pricing-price" data-period={period}>
            <span className="pricing-price-was" aria-hidden>
              {plan.price}
            </span>
            <div className="pricing-price-row flex flex-wrap items-end gap-x-[5px]">
              <span ref={stackRef} className="pricing-price-stack">
                <span className="pricing-price-sizer" aria-hidden>
                  <span className="pricing-price-amount font-display text-[45px] leading-[.8] xl:text-[clamp(48px,3.9vw,56px)]">
                    {plan.price}
                  </span>
                  <span className="pricing-price-amount font-display text-[45px] leading-[.8] xl:text-[clamp(48px,3.9vw,56px)]">
                    {plan.annualMonthlyPrice}
                  </span>
                </span>
                <span
                  ref={amountRef}
                  className="pricing-price-amount pricing-price-amount-live font-display text-[45px] leading-[.8] xl:text-[clamp(48px,3.9vw,56px)]"
                >
                  {displayPrice}
                </span>
              </span>
              <span
                ref={periodLabelRef}
                className="pricing-price-period mb-0.5 whitespace-nowrap text-xs text-[#17707d] xl:mb-1 xl:text-sm"
              >
                / month
              </span>
            </div>
            <p
              className="pricing-price-savings"
              aria-hidden={period !== "annual"}
            >
              {plan.annualSavingsLabel}
            </p>
          </div>
        </div>
      </div>
      <div className="pricing-content relative z-10 flex flex-1 flex-col">
        <PricingCta plan={plan} period={period} />
        {highlight ? (
          <p className="mt-2.5 text-center text-[14px] font-semibold leading-[17px] text-[#129a5f] xl:text-[15px] xl:leading-[18px]">
            {highlight}
          </p>
        ) : null}
        <div className="pricing-benefits">
          <p className="mb-3 text-[11px] font-medium uppercase leading-[14px] tracking-[.18em] text-[#63afc2]">
            Benefits
          </p>
          <ul className="flex min-w-0 flex-col gap-2.5 text-[13.5px] leading-[18px] text-[#4e4646] xl:gap-3.5 xl:text-[15px] xl:leading-5">
            {plan.features.map(([label, icon]) => {
              const Icon = pricingIcons[icon];
              return (
                <li
                  key={label}
                  className="flex min-w-0 items-start gap-2.5 xl:gap-3"
                >
                  <Icon
                    aria-hidden
                    className="mt-0.5 h-4 w-4 shrink-0 text-[#28a9df] xl:h-[19px] xl:w-[19px]"
                  />
                  <span>{label}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </article>
  );
}

function EnterprisePanel() {
  return (
    <article
      aria-labelledby="enterprise-heading"
      className="enterprise-panel reveal-item relative isolate mx-auto mt-5 w-full max-w-[430px] overflow-hidden rounded-[26px] border border-[#b3d6f6] bg-white px-6 pb-7 pt-8 xl:mt-7 xl:max-w-none xl:px-[clamp(32px,3.4vw,54px)] xl:pt-[clamp(32px,2.8vw,45px)]"
      data-reveal-delay="2"
    >
      <img
        src="/assets/landing/pricing/enterprise-rings.webp"
        alt=""
        aria-hidden
        width="819"
        height="819"
        loading="lazy"
        decoding="async"
        className="enterprise-rings pointer-events-none absolute -z-10 max-w-none opacity-[.62]"
      />
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4">
          <h3
            id="enterprise-heading"
            className="font-display text-[34px] leading-[26px] text-[#656565] xl:text-[clamp(34px,2.5vw,40px)] xl:leading-[22px]"
          >
            Enterprise
          </h3>
          <p className="enterprise-note max-w-[145px] text-right text-[13px] leading-[17px] text-[#484848] xl:max-w-[272px] xl:text-left xl:text-[clamp(14px,1.12vw,18px)] xl:leading-[22px]">
            *Includes everything in <span className="text-[#2978b9]">Pro</span>
            <br />
            <span className="text-[#2978b9]">+ Specific MCP/s</span>
          </p>
        </div>
        <p className="mt-8 text-base leading-6 text-[#787878] xl:mt-[clamp(36px,3.6vw,57px)] xl:max-w-[min(58vw,825px)] xl:text-[clamp(17px,1.5vw,24px)] xl:leading-[1.5]">
          For businesses with{" "}
          <span className="font-display italic text-[#2978b9]">
            specific MCP
          </span>{" "}
          requirements, we offer the{" "}
          <span className="font-display italic text-[#2978b9]">
            Enterprise plan
          </span>
          . We discuss your custom MCP needs and tailor Construct to your{" "}
          <span className="font-display italic text-[#2978b9]">
            business needs.
          </span>
        </p>
        <div className="enterprise-art mt-7 flex justify-center xl:mt-0">
          <img
            src="/assets/landing/pricing/enterprise-agent.webp"
            alt="Construct enterprise agent with beams of light"
            width="854"
            height="810"
            loading="lazy"
            decoding="async"
            className="max-h-[220px] w-full max-w-[300px] object-contain xl:max-h-[clamp(220px,20.5vw,328px)] xl:max-w-[clamp(320px,29.5vw,472px)]"
          />
        </div>
        <div className="enterprise-actions relative z-20 mt-7 flex flex-col items-stretch gap-4 xl:mt-[clamp(36px,3.8vw,61px)] xl:flex-row xl:items-center xl:gap-[27px]">
          <a
            href="https://cal.com/construct/15min"
            target="_blank"
            rel="noreferrer"
            className="pricing-button mx-auto xl:mx-0"
          >
            Book A Call
          </a>
          <a
            href="mailto:enterprise@construct.computer"
            className="whitespace-nowrap text-center text-[17px] font-medium text-[#39abdb] hover:text-[#2978b9] xl:text-[clamp(17px,1.37vw,22px)]"
          >
            or send us an email
          </a>
        </div>
      </div>
    </article>
  );
}

function PricingSection() {
  const [period, setPeriod] = useState<BillingPeriod>("annual");
  const catalog = usePlanCatalog();
  const plans = useMemo(
    () => mergePricingPlans(catalog.plans, catalog.recommendedPlan),
    [catalog.plans, catalog.recommendedPlan],
  );
  const floor = pricingFloorLabel(plans) ?? "$9";
  const toggleMonths = maxAnnualMonthsFree(plans);
  const annualSavingsLabel =
    toggleMonths != null
      ? `${toggleMonths} ${toggleMonths === 1 ? "month" : "months"} free`
      : "Save annually";

  return (
    <section
      id="pricing"
      aria-labelledby="pricing-heading"
      className="relative isolate scroll-mt-16 overflow-hidden bg-white px-5 py-14 xl:px-16 xl:pb-44 xl:pt-36"
    >
      <div className="relative mx-auto w-full max-w-[1395px]">
        <div className="mx-auto max-w-[671px] text-center">
          <h2
            id="pricing-heading"
            className="reveal-item text-balance text-[32px] capitalize leading-[38px] tracking-[-0.02em] lg:text-[clamp(36px,3.24vw,51.8px)] lg:leading-[1.12]"
            data-reveal-delay="1"
          >
            <span className="text-[#4e4646]">
              Plans For Lean Teams That Need
            </span>{" "}
            <span className="font-display italic text-[#01b4c8]">
              Ops Leverage
            </span>
          </h2>
          <p
            className="reveal-item mx-auto mt-4 max-w-[495px] text-[15px] leading-[21px] text-[#627c86] xl:mt-[22px] xl:text-base"
            data-reveal-delay="2"
          >
            Built for solo founders, early startups, and small businesses that
            want operations handled without adding headcount. Plans start at{" "}
            {floor}/month to try; Starter adds agent email and schedules.
          </p>
          <div
            className="reveal-item mt-6 flex justify-center xl:mt-8"
            data-reveal-delay="3"
          >
            <BillingPeriodToggle
              period={period}
              onChange={setPeriod}
              annualSavingsLabel={annualSavingsLabel}
            />
          </div>
        </div>
        <div className="relative z-10 mx-auto mt-8 grid w-full max-w-[430px] grid-cols-1 gap-5 xl:mt-[100px] xl:max-w-none xl:grid-cols-3 xl:gap-7">
          {plans.map((plan, index) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              period={period}
              revealDelay={Math.min(index, 3) + 1}
            />
          ))}
        </div>
        <EnterprisePanel />
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="relative w-full scroll-mt-16 px-5 py-16 xl:px-16 xl:py-24"
    >
      <div className="mx-auto grid w-full max-w-[1395px] items-start gap-10 xl:grid-cols-[minmax(300px,420px)_minmax(0,1fr)] xl:gap-[clamp(80px,10vw,170px)]">
        <div
          className="reveal-item text-center xl:pt-2 xl:text-left"
          data-reveal-delay="1"
        >
          <h2
            id="faq-heading"
            className="text-balance text-[32px] capitalize leading-[38px] tracking-[-0.02em] lg:text-[clamp(36px,3.24vw,51.8px)] lg:leading-[1.12]"
          >
            <span className="text-[#4e4646]">Frequently Asked</span>{" "}
            <span className="font-display italic text-[#01b4c8]">
              Questions
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-[371px] text-[15px] leading-[21px] text-[#627c86] xl:mx-0 xl:mt-5 xl:text-base">
            We believe clarity and transparency with our users, thus if you have
            more queries contact us at{" "}
            <a
              href="mailto:hello@construct.computer"
              className="text-[#01b4c8] underline underline-offset-2"
            >
              hello@construct.computer
            </a>
          </p>
          <a
            href="mailto:hello@construct.computer"
            className="landing-cta mt-7 min-h-[50px] min-w-[190px] px-6 text-[17px] xl:mt-10 xl:h-[57px] xl:w-[227px] xl:text-[21px]"
          >
            Send Us Hello
          </a>
        </div>
        <Accordion.Root
          type="multiple"
          className="flex flex-col gap-4 xl:gap-[31px]"
        >
          {landingFaq.map((item, index) => (
            <Accordion.Item
              key={item.question}
              value={`faq-${index}`}
              className="reveal-item overflow-hidden rounded-[22px] bg-[#f8f8f8] data-[state=open]:bg-[#f3f3f3] xl:rounded-3xl"
              data-reveal-delay={String(Math.min(index, 3) + 1)}
            >
              <Accordion.Header>
                <Accordion.Trigger className="group flex w-full items-center justify-between gap-4 px-5 py-5 text-left xl:gap-6 xl:px-[55px] xl:py-[30px]">
                  <span className="text-lg font-medium leading-[22px] tracking-[-.4px] text-[#565656] xl:text-[26px] xl:leading-7 xl:tracking-[-1px]">
                    {item.question}
                  </span>
                  <Plus
                    aria-hidden
                    className="h-6 w-6 shrink-0 text-[#565656] transition-transform group-data-[state=open]:rotate-45 xl:h-7 xl:w-7"
                  />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content forceMount className="faq-content">
                <div className="faq-content-inner">
                  <p className="px-5 pb-5 text-[15px] leading-[21px] text-[#627c86] xl:px-[55px] xl:pb-7 xl:text-base xl:leading-[22px]">
                    {item.answer}
                  </p>
                </div>
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
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
              className="landing-clouds pointer-events-none absolute inset-x-0 top-0 z-0 w-full opacity-90"
            />
            <AdaptsSection />
            <WorkflowSection />
            <FeatureGrid />
          </div>
        </div>
        <WorkSection />
        <PricingSection />
        <FaqSection />
      </main>
      <SiteFooter />
    </div>
  );
}
