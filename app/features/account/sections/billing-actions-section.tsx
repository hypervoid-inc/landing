import {
  Button,
  Card,
  CardHeader,
  Skeleton,
} from "../../../components/ui/primitives";
import type { BillingPlan } from "../../../platform/api/schemas";
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
      <Card index={index}>
        <CardHeader title="Billing" />
        <Skeleton className="mt-4 h-10 w-full" />
      </Card>
    );
  }
  if (plan.state === "error") return null;

  const data = plan.data;
  if (!data.canManage && !data.cancelAtPeriodEnd) return null;

  return (
    <Card index={index}>
      <CardHeader
        title="Billing"
        description="Invoices and payment details are handled by our payment provider."
      />
      <div className="mt-4 flex flex-wrap gap-2">
        {data.canManage ? (
          <Button busy={isPending("portal")} onClick={onPortal}>
            Invoices &amp; receipts
          </Button>
        ) : null}

        {/* Surfaced only when there's actually a payment problem to fix. */}
        {data.canManage && (data.status === "on_hold" || data.paymentError) ? (
          <Button
            variant="primary"
            busy={isPending("payment-method")}
            onClick={onPaymentMethod}
          >
            Update payment method
          </Button>
        ) : data.canManage ? (
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
        ) : data.canManage && data.plan !== "unsubscribed" ? (
          <Button
            variant="danger"
            busy={isPending("cancel")}
            onClick={onCancel}
          >
            Cancel subscription
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
