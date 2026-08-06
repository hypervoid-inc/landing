import { useEffect, useState } from "react";

import { SiteFooter, SiteHeader } from "../../components/layout/site-layout";
import { cn } from "../../lib/cn";
import { captureAnalytics } from "../analytics/analytics.client";
import {
  readAttributionCookie,
  writePromoCode,
} from "../analytics/campaign-attribution.client";
import { StartLink } from "./beta-access";
import { trialHighlightForPeriod, mergePricingPlans } from "./merge-pricing-catalog";
import { usePlanCatalog } from "./use-plan-catalog";

const PROMO_CODES = [
  {
    code: "LAUNCH20",
    label: "20% off your first month",
    detail: "Use on monthly billing",
  },
  {
    code: "LAUNCH40",
    label: "40% off a full year",
    detail: "Use on annual billing",
  },
] as const;

function PromoChip({ code, label, detail }: (typeof PROMO_CODES)[number]) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        // Persist alongside the campaign attribution so the code survives the
        // hop to os.construct.computer and reaches the Dodo checkout session.
        writePromoCode(code);
        captureAnalytics("promo_code_copied", { code });
        void navigator.clipboard?.writeText(code).catch(() => undefined);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      }}
      className={cn(
        "flex w-full flex-col items-start gap-1 rounded-[var(--radius-control)]",
        "border-2 border-dashed border-[var(--color-brand)] bg-white px-5 py-4",
        "text-left transition-[border-color,background-color] duration-[var(--dur-hover)]",
        "hover:bg-[var(--color-surface-subtle)]",
      )}
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

export function LaunchPage() {
  const { plans, recommendedPlan, settled } = usePlanCatalog();

  useEffect(() => {
    const attribution = readAttributionCookie();
    captureAnalytics("launch_page_viewed", {
      ...(attribution?.r ? { ref: attribution.r } : {}),
      ...(attribution?.c ? { cid: attribution.c } : {}),
    });
  }, []);

  // Live from Dodo, so the trial length shown here can never drift from what
  // checkout actually grants.
  const pro = mergePricingPlans(plans, recommendedPlan).find(
    (plan) => plan.id === "pro",
  );
  const proTrial = pro ? trialHighlightForPeriod(pro, "monthly") : null;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-5 py-16 sm:py-24">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-brand)]">
          Pre-launch offer
        </p>
        <h1 className="mt-4 text-4xl leading-tight text-[var(--color-ink)] sm:text-5xl">
          {proTrial ? `${proTrial} of Pro` : "7 days of Pro"}
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-[var(--color-ink)]">
          Free, on the Pro plan. Then 20% off your first month, or 40% off the
          whole year if you go annual.
        </p>

        <div className="mt-9">
          <StartLink
            source="launch-hero"
            authedChildren="Open Construct"
            className={cn(
              "inline-flex min-h-12 items-center rounded-full bg-[var(--color-ink)]",
              "px-8 text-base font-semibold text-white no-underline",
            )}
          >
            Start your trial
          </StartLink>
          <p className="mt-3 text-sm text-[var(--color-ink-subtle)]">
            {settled && !proTrial
              ? "Trial length is shown at checkout."
              : "Cancel any time from your account."}
          </p>
        </div>

        <section className="mt-16">
          <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-ink-subtle)]">
            Two codes, pick one
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {PROMO_CODES.map((promo) => (
              <PromoChip key={promo.code} {...promo} />
            ))}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-[var(--color-ink-subtle)]">
            Enter your code at checkout. Both hold until we go live on Product
            Hunt.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
