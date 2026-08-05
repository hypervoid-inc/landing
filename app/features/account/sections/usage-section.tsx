import {
  Card,
  CardHeader,
  ErrorState,
  Meter,
  Row,
  Skeleton,
} from "../../../components/ui/primitives";
import type { BillingPlan } from "../../../platform/api/schemas";
import { formatBytes } from "../account-format";
import type { Resource } from "../use-account-data";

export function UsageSection({
  index,
  plan,
  onRetry,
}: {
  index: number;
  plan: Resource<BillingPlan>;
  onRetry: () => void;
}) {
  return (
    <Card index={index}>
      <CardHeader
        title="Usage"
        description="Resets at the start of each billing period."
      />

      {plan.state === "loading" ? (
        <div className="mt-4 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : plan.state === "error" ? (
        <ErrorState
          message="Couldn't load your usage."
          onRetry={plan.retryable ? onRetry : undefined}
        />
      ) : (
        <UsageBody plan={plan.data} />
      )}
    </Card>
  );
}

function UsageBody({ plan }: { plan: BillingPlan }) {
  // `pool` is the API's name for owner totals. Reading `ownerUsage` here is why
  // the agents and storage line never rendered.
  const pool = plan.pool;

  return (
    <div className="mt-2">
      <Meter label="This session" value={plan.usage.sessionPct} />
      <Meter label="This month" value={plan.usage.monthlyPct} />

      {plan.freeAllowanceActive ? (
        <Meter
          label="Free trial allowance"
          value={plan.freeAllowanceUsedPct ?? 0}
          detail="Subscribe to keep going once this runs out."
        />
      ) : null}

      {pool ? (
        <div className="mt-3 border-t border-[var(--color-line-soft)] pt-1">
          <Row label="Agents">
            <span className="tabular text-sm text-[var(--color-ink-muted)]">
              {pool.agentsUsed} / {pool.agentsMax}
            </span>
          </Row>
          <Row label="Storage">
            <span className="tabular text-sm text-[var(--color-ink-muted)]">
              {formatBytes(pool.storageBytesUsed)} /{" "}
              {formatBytes(pool.storageBytesMax)}
            </span>
          </Row>
          <Row label="Scheduled tasks">
            <span className="tabular text-sm text-[var(--color-ink-muted)]">
              {pool.scheduledTasksUsed} / {pool.scheduledTasksMax}
            </span>
          </Row>
        </div>
      ) : null}

      {plan.usage.byokActive ? (
        <p className="mt-3 text-xs text-[var(--color-ink-muted)]">
          Running on your own API keys. Your provider invoice is authoritative.
        </p>
      ) : null}
    </div>
  );
}
