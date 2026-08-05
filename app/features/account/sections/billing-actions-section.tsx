import {
  Button,
  CollapsibleCard,
  Skeleton,
} from "../../../components/ui/primitives";
import type { BillingPlan } from "../../../platform/api/schemas";
import { canOpenBillingPortal } from "../account-format";
import type { Resource } from "../use-account-data";

export function BillingActionsSection({
  index,
  plan,
  onPortal,
  onPaymentMethod,
  onCancel,
  onResume,
  isPending,
}: {
  index: number;
  plan: Resource<BillingPlan>;
  onPortal: () => void;
  onPaymentMethod: () => void;
  onCancel: () => void;
  onResume: () => void;
  isPending: (key: string) => boolean;
}) {
  if (plan.state === "loading") {
    return (
      <CollapsibleCard index={index} title="Billing" defaultOpen={false}>
        <Skeleton className="mt-4 h-10 w-full" />
      </CollapsibleCard>
    );
  }
  if (plan.state === "error") return null;

  const data = plan.data;
  const showPortal = canOpenBillingPortal(data);
  if (!showPortal && !data.cancelAtPeriodEnd) return null;

  const summary = data.cancelAtPeriodEnd
    ? "Cancelling at period end"
    : showPortal
      ? "Invoices & payment method"
      : undefined;

  return (
    <CollapsibleCard
      index={index}
      title="Billing"
      summary={summary}
      defaultOpen={false}
    >
      <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
        Invoices and payment details are handled by our payment provider.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {showPortal ? (
          <Button busy={isPending("portal")} onClick={onPortal}>
            Manage plan
          </Button>
        ) : null}

        {/* Surfaced only when there's actually a payment problem to fix. */}
        {showPortal && (data.status === "on_hold" || data.paymentError) ? (
          <Button
            variant="primary"
            busy={isPending("payment-method")}
            onClick={onPaymentMethod}
          >
            Update payment method
          </Button>
        ) : showPortal ? (
          <Button busy={isPending("payment-method")} onClick={onPaymentMethod}>
            Update payment method
          </Button>
        ) : null}

        {data.cancelAtPeriodEnd ? (
          <Button
            variant="primary"
            busy={isPending("resume")}
            onClick={onResume}
          >
            Resume subscription
          </Button>
        ) : showPortal && data.plan !== "unsubscribed" ? (
          <Button
            variant="danger"
            busy={isPending("cancel")}
            onClick={onCancel}
          >
            Cancel subscription
          </Button>
        ) : null}
      </div>
    </CollapsibleCard>
  );
}
