import { useEffect, useRef, useState } from "react";

import { SiteFooter, SiteHeader } from "../../components/layout/site-layout";
import { cn } from "../../lib/cn";
import { captureAnalytics } from "../analytics/analytics.client";
import {
  readAttributionCookie,
  writePromoCode,
} from "../analytics/campaign-attribution.client";
import { ProductHuntBadge } from "../product-hunt/product-hunt-badge";
import { productHuntCopy, productHuntUrl } from "../product-hunt/config";
import { useProductHuntPhase } from "../product-hunt/use-product-hunt-phase";
import { StartLink } from "./beta-access";
import { usePrefersReducedMotion } from "./media";
import {
  trialHighlightForPeriod,
  mergePricingPlans,
} from "./merge-pricing-catalog";
import { usePlanCatalog } from "./use-plan-catalog";
import "./launch-page.css";

const PROMO_CODES = [
  {
    code: "LAUNCH20",
    label: "20% off Pro for 3 months",
    detail: "Use on monthly billing",
  },
  {
    code: "LAUNCH40",
    label: "40% off a full year",
    detail: "Use on annual billing",
  },
] as const;

const BENEFITS = [
  {
    title: "Automations that keep moving",
    body: "Hand off research, inbox, and follow-ups without babysitting tabs.",
    image: "/assets/landing/features/automations.webp",
  },
  {
    title: "Integrations you already use",
    body: "Email, calendar, docs, and the rest of the stack — one coworker.",
    image: "/assets/landing/features/integrations.webp",
  },
  {
    title: "Schedules on your clock",
    body: "Recurring work runs when you need it, not when you remember.",
    image: "/assets/landing/features/schedules.webp",
  },
] as const;

function PromoChip({ code, label, detail }: (typeof PROMO_CODES)[number]) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        writePromoCode(code);
        captureAnalytics("promo_code_copied", { code });
        void navigator.clipboard?.writeText(code).catch(() => undefined);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      }}
      className="launch-code"
    >
      <span className="font-mono text-xl tracking-widest text-[var(--color-ink)]">
        {code}
      </span>
      <span className="text-sm text-[var(--color-ink)]">{label}</span>
      <span className="text-xs text-[var(--color-ink-subtle)]">
        {copied ? "Copied" : detail}
      </span>
    </button>
  );
}

function LaunchCollage() {
  const reducedMotion = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reducedMotion) return;
    const node = ref.current;
    if (!node) return;
    const onMove = (event: PointerEvent) => {
      const rect = node.getBoundingClientRect();
      const nx = (event.clientX - rect.left) / Math.max(rect.width, 1) - 0.5;
      const ny = (event.clientY - rect.top) / Math.max(rect.height, 1) - 0.5;
      node.style.setProperty("--mx", `${nx * 18}px`);
      node.style.setProperty("--my", `${ny * 14}px`);
    };
    const onLeave = () => {
      node.style.setProperty("--mx", "0px");
      node.style.setProperty("--my", "0px");
    };
    node.addEventListener("pointermove", onMove, { passive: true });
    node.addEventListener("pointerleave", onLeave);
    return () => {
      node.removeEventListener("pointermove", onMove);
      node.removeEventListener("pointerleave", onLeave);
    };
  }, [reducedMotion]);

  return (
    <div ref={ref} className="launch-collage aspect-[5/4] w-full sm:aspect-[4/3]">
      <div className="launch-collage-chat">
        <img
          src="/assets/landing/hero/agent-chat.webp"
          alt="Construct agent chat"
          width={840}
          height={640}
          className="block h-auto w-full"
          decoding="async"
        />
      </div>
      <div className="launch-collage-report">
        <img
          src="/assets/landing/hero/research-report.webp"
          alt="Construct research report"
          width={640}
          height={800}
          className="block h-auto w-full"
          decoding="async"
        />
      </div>
    </div>
  );
}

export function LaunchPage() {
  const { plans, recommendedPlan, settled } = usePlanCatalog();
  const { mounted, phase, parts, countdownLabel } = useProductHuntPhase();
  const phActive = mounted && (phase === "pre" || phase === "live");

  useEffect(() => {
    const attribution = readAttributionCookie();
    captureAnalytics("launch_page_viewed", {
      ...(attribution?.r ? { ref: attribution.r } : {}),
      ...(attribution?.c ? { cid: attribution.c } : {}),
    });
  }, []);

  const pro = mergePricingPlans(plans, recommendedPlan).find(
    (plan) => plan.id === "pro",
  );
  const proTrial = pro ? trialHighlightForPeriod(pro, "monthly") : null;
  const copy = phActive ? productHuntCopy(phase) : null;

  return (
    <div className="launch-page">
      <SiteHeader />
      <main id="main">
        <section className="launch-hero">
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
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-brand)]">
                {phase === "live" ? "Launch week offer" : "Pre-launch offer"}
              </p>
              <h1 className="mt-4 font-display text-4xl italic leading-[1.05] tracking-[-0.02em] text-[var(--color-ink)] sm:text-5xl lg:text-[3.5rem]">
                {proTrial ? `${proTrial} of Pro` : "7 days of Pro"}
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-[var(--color-ink-muted)]">
                Free on the Pro plan. Then 20% off Pro for 3 months, or 40% off
                the whole year if you go annual.
              </p>
              {phase === "pre" && mounted && (
                <p
                  className="mt-4 font-mono text-sm tabular-nums text-[var(--launch-coral)]"
                  aria-label={`Product Hunt launches in ${countdownLabel}`}
                >
                  Product Hunt in{" "}
                  <span aria-hidden="true">
                    {parts.days}d {String(parts.hours).padStart(2, "0")}h{" "}
                    {String(parts.minutes).padStart(2, "0")}m
                  </span>
                </p>
              )}
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <StartLink
                  source="launch-hero"
                  authedChildren="Open Construct"
                  className={cn(
                    "site-cta inline-flex min-h-12 items-center rounded-full bg-[var(--color-ink)]",
                    "px-8 text-base font-semibold text-white no-underline",
                  )}
                >
                  Start your trial
                </StartLink>
                {copy && (
                  <a
                    href={productHuntUrl("launch")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-12 items-center rounded-full border border-[var(--launch-coral)] bg-white px-6 text-sm font-semibold text-[var(--launch-coral)] no-underline transition-colors hover:bg-[var(--launch-coral-soft)]"
                    onClick={() => {
                      captureAnalytics("ph_cta_clicked", {
                        phase,
                        source: "launch",
                      });
                    }}
                  >
                    {copy.launchSecondary}
                  </a>
                )}
              </div>
              <p className="mt-3 text-sm text-[var(--color-ink-subtle)]">
                {settled && !proTrial
                  ? "Trial length is shown at checkout."
                  : "Cancel any time from your account."}
              </p>
            </div>
            <LaunchCollage />
          </div>
        </section>

        <section className="launch-benefits" aria-labelledby="launch-benefits">
          <h2
            id="launch-benefits"
            className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-ink-subtle)]"
          >
            What you get
          </h2>
          <div className="launch-benefit-grid mt-5">
            {BENEFITS.map((item) => (
              <article key={item.title} className="launch-benefit">
                <div className="launch-benefit-visual">
                  <img
                    src={item.image}
                    alt=""
                    width={640}
                    height={400}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <h3 className="text-base font-semibold text-[var(--color-ink)]">
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-[var(--color-ink-muted)]">
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="launch-codes" aria-labelledby="launch-codes">
          <h2
            id="launch-codes"
            className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-ink-subtle)]"
          >
            Two codes, pick one
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {PROMO_CODES.map((promo) => (
              <PromoChip key={promo.code} {...promo} />
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
        </section>

        {phActive && copy && (
          <section className="launch-ph-strip" aria-label="Product Hunt">
            <div className="launch-ph-strip-inner">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--launch-coral)]">
                {copy.eyebrow}
              </p>
              <p className="max-w-md text-[15px] leading-relaxed text-[var(--color-ink-muted)]">
                {copy.homepageLead}
              </p>
              <div className="flex justify-center">
                <ProductHuntBadge surface="launch" />
              </div>
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
