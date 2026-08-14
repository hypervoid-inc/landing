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

import { captureAnalytics } from "../analytics/analytics.client";
import { readAttributionCookie } from "../analytics/campaign-attribution.client";
import { useAuth } from "../auth/auth-provider";
import { createCheckout } from "../../platform/api/billing";
import { getOsOrigin } from "../../platform/env";
import {
  landingFaq,
  type BillingPeriod,
  type PricingIcon,
} from "~/content/landing";

import { useOpenAccessDialog } from "./beta-access";
import {
  maxAnnualMonthsFree,
  mergePricingPlans,
  pricingFloorLabel,
  trialHighlightForPeriod,
  type PricingPlanView,
} from "./merge-pricing-catalog";
import { usePlanCatalog } from "./use-plan-catalog";
import { usePriceTicker } from "./price-ticker";

function PricingCta({
  plan,
  period,
}: {
  plan: PricingPlanView;
  period: BillingPeriod;
}) {
  const { status, user } = useAuth();
  const openDialog = useOpenAccessDialog();
  const [busy, setBusy] = useState(false);
  const planId = plan.id;

  if (status !== "authenticated" || !user) {
    return (
      <button
        type="button"
        className="pricing-button"
        onClick={() => {
          captureAnalytics("auth_dialog_opened", {
            source: `pricing-${planId}`,
            plan: planId,
          });
          openDialog({
            mode: "auth",
            source: `pricing-${planId}`,
            plan: planId,
          });
        }}
      >
        {plan.cta}
      </button>
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
          const interval = period === "annual" ? "year" : "month";
          const promoCode = readAttributionCookie()?.p;
          // `plan` and `interval` names match the apps/web event so both
          // surfaces roll up into one checkout funnel, split by `source`.
          captureAnalytics("checkout_started", {
            plan: planId,
            interval,
            source: `pricing-${planId}`,
            ...(promoCode ? { promo_code: promoCode } : {}),
          });
          const result = await createCheckout(planId, interval, promoCode);
          setBusy(false);
          if (result.success) {
            captureAnalytics("checkout_redirected", {
              plan: planId,
              interval,
              source: `pricing-${planId}`,
            });
            window.location.href = result.data.checkoutUrl;
          } else {
            captureAnalytics("checkout_failed", {
              plan: planId,
              interval,
              source: `pricing-${planId}`,
            });
            window.location.href = `/account?plan=${planId}`;
          }
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
  titleLevel: Title = "h3",
}: {
  plan: PricingPlanView;
  period: BillingPeriod;
  revealDelay?: number;
  titleLevel?: "h2" | "h3";
}) {
  const targetPrice =
    period === "annual" ? plan.annualMonthlyPrice : plan.price;
  const displayPrice = usePriceTicker(targetPrice);
  const highlight = trialHighlightForPeriod(plan, period) ?? plan.highlight;

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
  }, []);

  useLayoutEffect(() => {
    syncAmountLayout();
    const stack = stackRef.current;
    if (!stack || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => syncAmountLayout());
    observer.observe(stack);
    return () => observer.disconnect();
  }, [syncAmountLayout, displayPrice]);

  return (
    <article
      className={`pricing-card reveal-item relative isolate w-full overflow-hidden rounded-[26px] bg-white shadow-[0_18px_48px_rgba(57,148,154,.08)]${plan.badge ? "" : " xl:shadow-none"}`}
      data-recommended={plan.badge ? "" : undefined}
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
            <Title className="font-display text-[29px] leading-none xl:text-[38px]">
              {plan.name}
            </Title>
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

/**
 * Every claim here is what the published Terms and Privacy pages already
 * commit to, so the pricing page and the policies cannot drift apart:
 * ownership and the limited licence (Terms 9), custom MCP and app IP
 * (Terms 10), scoped runtime and memory space (Privacy 5), BYOK (Terms 6),
 * and memory deletion plus account-close deletion (Privacy 7 and 8).
 */
const enterpriseAssurances = [
  "You own the output",
  "Isolated per workspace",
  "Your own model keys",
  "Delete anything, anytime",
] as const;

function EnterprisePanel({
  titleLevel: Title = "h3",
}: {
  titleLevel?: "h2" | "h3";
}) {
  return (
    <article
      aria-labelledby="enterprise-heading"
      className="enterprise-panel reveal-item relative isolate mx-auto mt-5 w-full max-w-[430px] overflow-hidden rounded-[26px] border border-[#b3d6f6] bg-white px-5 pb-6 pt-6 sm:px-6 sm:pb-7 sm:pt-8 xl:mt-7 xl:max-w-none xl:px-[clamp(32px,3.4vw,54px)] xl:pt-[clamp(32px,2.8vw,45px)]"
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
          <Title
            id="enterprise-heading"
            className="font-display text-[34px] leading-[26px] text-[#656565] xl:text-[clamp(34px,2.5vw,40px)] xl:leading-[22px]"
          >
            Enterprise
          </Title>
          <p className="enterprise-note max-w-[145px] text-right text-[13px] leading-[17px] text-[#484848] xl:max-w-[272px] xl:text-left xl:text-[clamp(14px,1.12vw,18px)] xl:leading-[22px]">
            *Includes everything in <span className="text-[#2978b9]">Pro</span>
          </p>
        </div>
        <div className="mt-5 sm:mt-8 xl:mt-[clamp(28px,2.6vw,44px)] xl:max-w-[min(56vw,760px)]">
          <p className="enterprise-claim text-[16px] leading-[1.4] text-[#5c6a70] sm:text-[17px] sm:leading-[1.45] xl:text-[clamp(18px,1.5vw,25px)]">
            <span className="block">
              Your workspace is not our{" "}
              <span className="font-display italic text-[#2978b9]">
                training data
              </span>
              .
            </span>
            <span className="block text-[#3f4a4d]">
              You own everything your agent produces.
            </span>
          </p>
          {/* Two by two on every width: four full-width chips stacked into four
              rows of mostly empty pill. Equal-width cells so the columns line up
              instead of leaving a ragged gutter between a short label and a long
              one. */}
          <ul className="enterprise-chips mt-4 grid grid-cols-2 gap-1.5 sm:mt-5 sm:max-w-[560px] sm:gap-2 xl:mt-6">
            {enterpriseAssurances.map((item) => (
              <li
                key={item}
                className="enterprise-chip flex items-center gap-1.5 rounded-full border border-[#cfe4f7] bg-[#f5faff] px-2 py-1.5 text-[12.5px] leading-[16px] text-[#3f4a4d] sm:gap-2 sm:pl-2.5 sm:pr-4 sm:text-[14px] sm:leading-5 xl:text-[15px]"
              >
                <svg
                  aria-hidden
                  viewBox="0 0 16 16"
                  className="h-3.5 w-3.5 shrink-0 text-[#2978b9] sm:h-4 sm:w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3.5 8.5l3 3 6-6" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
          {/* Rule stops with the chips above it rather than running past them. */}
          <p className="mt-4 max-w-[560px] border-t border-[#e3edf7] pt-3 text-[13.5px] leading-[19px] text-[#6b7c85] sm:mt-5 sm:pt-4 sm:text-[14px] sm:leading-5 xl:text-[15px]">
            SSO, private deployment, and custom MCP are scoped on the call.
          </p>
        </div>
        <div className="enterprise-art mt-3 flex justify-center sm:mt-7 xl:mt-0">
          <img
            src="/assets/landing/pricing/enterprise-agent.webp"
            alt="Construct enterprise agent with beams of light"
            width="854"
            height="810"
            loading="lazy"
            decoding="async"
            className="max-h-[142px] w-full max-w-[300px] object-contain sm:max-h-[220px] xl:max-h-[clamp(220px,20.5vw,328px)] xl:max-w-[clamp(320px,29.5vw,472px)]"
          />
        </div>
        <div className="enterprise-actions relative z-20 mt-4 flex flex-col items-stretch gap-2.5 sm:mt-7 sm:gap-4 xl:mt-[clamp(26px,2.4vw,40px)] xl:flex-row xl:items-center xl:gap-[27px]">
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
            className="whitespace-nowrap text-center text-[15px] font-medium text-[#39abdb] hover:text-[#2978b9] sm:text-[17px] xl:text-[clamp(17px,1.37vw,22px)]"
          >
            or send us an email
          </a>
        </div>
      </div>
    </article>
  );
}

export function PricingSection({
  headingLevel = "h2",
}: { headingLevel?: "h1" | "h2" } = {}) {
  const Heading = headingLevel;
  const cardHeading = headingLevel === "h1" ? "h2" : "h3";
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
      /* `overflow-clip`, not `overflow-hidden`: hidden would make this section a
         scroll container and the mobile card deck would never pin. */
      className="relative isolate scroll-mt-16 overflow-clip bg-white px-5 py-14 xl:px-16 xl:pb-44 xl:pt-36"
    >
      <div className="relative mx-auto w-full max-w-[1395px]">
        <div className="mx-auto max-w-[671px] text-center">
          <Heading
            id="pricing-heading"
            className="reveal-item text-balance text-[32px] capitalize leading-[38px] tracking-[-0.02em] lg:text-[clamp(36px,3.24vw,51.8px)] lg:leading-[1.12]"
            data-reveal-delay="1"
          >
            <span className="text-[#4e4646]">Simple</span>{" "}
            <span className="font-display italic text-[#01b4c8]">Pricing</span>
          </Heading>
          <p
            className="reveal-item mx-auto mt-4 max-w-[430px] text-balance text-[15px] leading-[21px] text-[#627c86] xl:mt-[22px] xl:text-base"
            data-reveal-delay="2"
          >
            For solo founders and small teams. Plans start at {floor}/month.
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
        <div className="pricing-grid relative z-10 mx-auto mt-8 grid w-full max-w-[430px] grid-cols-1 gap-5 xl:mt-[100px] xl:max-w-none xl:grid-cols-3 xl:gap-7">
          {plans.map((plan, index) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              period={period}
              revealDelay={Math.min(index, 3) + 1}
              titleLevel={cardHeading}
            />
          ))}
        </div>
        <EnterprisePanel titleLevel={cardHeading} />
      </div>
    </section>
  );
}

export function FaqSection() {
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
            className="landing-cta mt-7 min-h-[50px] min-w-[190px] px-[30px] text-[17px] xl:mt-10 xl:h-[57px] xl:w-[227px] xl:text-[21px]"
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
              className="faq-item reveal-item overflow-hidden rounded-[22px] bg-[#f8f8f8] data-[state=open]:bg-[#f3f3f3] xl:rounded-3xl"
              data-reveal-delay={String(Math.min(index, 3) + 1)}
            >
              <Accordion.Header>
                <Accordion.Trigger className="group flex w-full items-center justify-between gap-4 px-5 py-5 text-left xl:gap-6 xl:px-[55px] xl:py-[30px]">
                  <span className="text-lg font-medium leading-[22px] tracking-[-.4px] text-[#565656] xl:text-[26px] xl:leading-7 xl:tracking-[-1px]">
                    {item.question}
                  </span>
                  <Plus
                    aria-hidden
                    className="faq-icon h-6 w-6 shrink-0 text-[#565656] group-data-[state=open]:rotate-45 xl:h-7 xl:w-7"
                  />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="faq-content">
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
