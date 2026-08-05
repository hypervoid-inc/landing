import {
  Badge,
  Button,
  Card,
  CardHeader,
  ErrorState,
  Skeleton,
} from "../../../components/ui/primitives";
import { cn } from "../../../lib/cn";
import {
  annualMonthsFree,
  catalogIntervalView,
} from "../../../platform/api/billing";
import type {
  BillingInterval,
  BillingPlan,
  CatalogPlan,
  PaidPlanId,
} from "../../../platform/api/schemas";
import { formatMoney, intervalSuffix } from "../account-format";
import type { Resource } from "../use-account-data";

/** Marketing copy per tier, mirroring the OS's plan-marketing.ts. */
const PLAN_BLURB: Record<PaidPlanId, string> = {
  lite: "For trying Construct on real work.",
  starter: "For everyday use with room to grow.",
  pro: "For heavy, multi-agent workloads.",
};

type CatalogPayload = {
  plans: CatalogPlan[];
  recommendedPlan: "starter" | "pro";
};

export function PlanSection({
  index,
  plan,
  catalog,
  interval,
  onIntervalChange,
  onCheckout,
  onChangePlan,
  isPending,
  onRetry,
}: {
  index: number;
  plan: Resource<BillingPlan>;
  catalog: Resource<CatalogPayload>;
  interval: BillingInterval;
  onIntervalChange: (interval: BillingInterval) => void;
  onCheckout: (id: PaidPlanId) => void;
  onChangePlan: (id: PaidPlanId) => void;
  isPending: (key: string) => boolean;
  onRetry: () => void;
}) {
  const currentPlan = plan.state === "ready" ? plan.data : null;
  const isOwner =
    currentPlan?.canCheckout ||
    currentPlan?.canManage ||
    currentPlan?.canChangePlan;

  const plans = catalog.state === "ready" ? catalog.data.plans : [];
  const recommendedPlan =
    catalog.state === "ready" ? catalog.data.recommendedPlan : null;
  const hasAnnual = plans.length > 0 && plans.some((p) => p.year?.price != null);

  return (
    <Card index={index}>
      <CardHeader
        title="Plan"
        description={
          isOwner === false
            ? "Only the workspace owner can change billing."
            : undefined
        }
        action={
          hasAnnual ? (
            <IntervalToggle value={interval} onChange={onIntervalChange} />
          ) : null
        }
      />

      {catalog.state === "error" ? (
        <ErrorState
          message="Couldn't load plans and pricing."
          onRetry={catalog.retryable ? onRetry : undefined}
        />
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {catalog.state === "loading"
            ? [0, 1, 2].map((i) => <PlanCardSkeleton key={i} />)
            : plans.map((catalogPlan) => (
                <PlanCard
                  key={catalogPlan.id}
                  catalogPlan={catalogPlan}
                  interval={interval}
                  current={currentPlan?.plan === catalogPlan.id}
                  recommended={
                    recommendedPlan != null &&
                    catalogPlan.id === recommendedPlan
                  }
                  canCheckout={currentPlan?.canCheckout ?? false}
                  canChangePlan={currentPlan?.canChangePlan ?? false}
                  trialUsed={currentPlan?.trialUsed ?? false}
                  busy={
                    isPending(`checkout-${catalogPlan.id}`) ||
                    isPending(`change-${catalogPlan.id}`)
                  }
                  onCheckout={() => onCheckout(catalogPlan.id)}
                  onChangePlan={() => onChangePlan(catalogPlan.id)}
                />
              ))}
        </div>
      )}
    </Card>
  );
}

function IntervalToggle({
  value,
  onChange,
}: {
  value: BillingInterval;
  onChange: (interval: BillingInterval) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Billing interval"
      className="inline-flex rounded-full border border-[var(--color-line)] p-0.5 text-xs"
    >
      {(["month", "year"] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
          className={cn(
            "rounded-full px-3 py-1.5 font-medium",
            "transition-[background-color,color] duration-[var(--dur-hover)]",
            "active:scale-[0.97] motion-reduce:transform-none",
            value === option
              ? "bg-black text-white"
              : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]",
          )}
        >
          {option === "month" ? "Monthly" : "Annual"}
        </button>
      ))}
    </div>
  );
}

function PlanCardSkeleton() {
  return (
    <div className="rounded-[var(--radius-control)] border border-[var(--color-line-soft)] p-4">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="mt-3 h-7 w-24" />
      <Skeleton className="mt-3 h-4 w-full" />
      <Skeleton className="mt-4 h-10 w-full" />
    </div>
  );
}

function PlanCard({
  catalogPlan,
  interval,
  current,
  recommended,
  canCheckout,
  canChangePlan,
  trialUsed,
  busy,
  onCheckout,
  onChangePlan,
}: {
  catalogPlan: CatalogPlan;
  interval: BillingInterval;
  current: boolean;
  recommended: boolean;
  canCheckout: boolean;
  canChangePlan: boolean;
  trialUsed: boolean;
  busy: boolean;
  onCheckout: () => void;
  onChangePlan: () => void;
}) {
  const view = catalogIntervalView(catalogPlan, interval);
  const price = formatMoney(view.price);
  const listPrice = formatMoney(view.listPrice);
  const monthsFree =
    interval === "year"
      ? annualMonthsFree(catalogPlan.month.price, catalogPlan.year?.price)
      : null;
  const display = view.display;
  const showApprox = display && display.source === "fx";
  const trialDays = view.trialDays ?? 0;
  const checkoutLabel =
    canCheckout && trialDays > 0 && !trialUsed
      ? `Start ${trialDays}d trial`
      : "Subscribe";

  return (
    <div
      className={cn(
        "flex flex-col rounded-[var(--radius-control)] border p-4",
        "transition-[border-color,box-shadow] duration-[var(--dur-hover)]",
        current
          ? "border-[var(--color-brand)] bg-[var(--color-brand-tint)]"
          : recommended
            ? "border-[var(--color-brand)]/50 shadow-[0_0_0_1px_rgba(1,180,200,0.12)]"
            : "border-[var(--color-line-soft)] hover:border-[var(--color-line)]",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold capitalize text-[var(--color-ink)]">
          {catalogPlan.name || catalogPlan.id}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          {recommended && !current ? (
            <Badge tone="neutral">Recommended</Badge>
          ) : null}
          {current ? <Badge tone="positive">Current</Badge> : null}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
        {price ? (
          <>
            {listPrice ? (
              <span className="tabular text-sm text-[var(--color-ink-subtle)] line-through">
                {listPrice}
              </span>
            ) : null}
            <span className="tabular font-geist text-xl font-semibold text-[var(--color-ink)]">
              {price}
            </span>
            <span className="text-sm text-[var(--color-ink-muted)]">
              {intervalSuffix(interval)}
            </span>
          </>
        ) : (
          <span className="text-sm text-[var(--color-ink-muted)]">
            Contact us
          </span>
        )}
      </div>

      {monthsFree ? (
        <p className="mt-1 text-xs font-medium text-[var(--color-brand-strong)]">
          {monthsFree} {monthsFree === 1 ? "month" : "months"} free
        </p>
      ) : null}

      {showApprox && display ? (
        <p className="mt-1 text-xs text-[var(--color-ink-subtle)]">
          ≈{" "}
          {formatMoney({ amount: display.amount, currency: display.currency })} ·
          approx.
        </p>
      ) : null}

      <p className="mt-2 flex-1 text-sm text-[var(--color-ink-muted)]">
        {PLAN_BLURB[catalogPlan.id]}
      </p>

      {current ? null : canCheckout ? (
        <Button
          variant={recommended ? "primary" : "secondary"}
          full
          busy={busy}
          className="mt-4"
          onClick={onCheckout}
        >
          {checkoutLabel}
        </Button>
      ) : canChangePlan ? (
        <Button
          variant="secondary"
          full
          busy={busy}
          className="mt-4"
          onClick={onChangePlan}
        >
          Switch
        </Button>
      ) : null}
    </div>
  );
}
