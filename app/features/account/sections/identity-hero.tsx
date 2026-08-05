import {
  Badge,
  Button,
  Skeleton,
  buttonVariants,
} from "../../../components/ui/primitives";
import { cn } from "../../../lib/cn";
import type { AuthUser } from "../../../platform/api/schemas";
import { getOsOrigin } from "../../../platform/env";
import type { Resource } from "../use-account-data";
import type { BillingPlan } from "../../../platform/api/schemas";
import {
  formatMemberSince,
  canOpenBillingPortal,
  planStatusTone,
  planSummary,
  renewalLabel,
} from "../account-format";

/**
 * Answers "who am I, what am I on, what do I pay, when does it renew" before
 * anything else on the page. Previously that lived below a password form, in
 * prose, with the renewal date not rendered at all.
 */
export function IdentityHero({
  user,
  plan,
  priceLabel,
  onManage,
  manageBusy,
}: {
  user: AuthUser;
  plan: Resource<BillingPlan>;
  priceLabel: string | null;
  onManage?: () => void;
  manageBusy?: boolean;
}) {
  const memberSince = formatMemberSince(user.createdAt);
  const name = user.displayName?.trim() || user.username;

  return (
    <section
      className="account-section rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white p-5 shadow-[var(--shadow-raised)]"
      style={{ "--section-index": 0 } as React.CSSProperties}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar user={user} name={name} />
          <div className="min-w-0">
            <h1 className="font-geist text-2xl font-semibold tracking-[-0.02em] text-[var(--color-ink)]">
              {name}
            </h1>
            <p className="mt-0.5 truncate text-sm text-[var(--color-ink-muted)]">
              {user.email ?? user.username}
              {memberSince ? ` · member since ${memberSince}` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {plan.state === "ready" &&
          canOpenBillingPortal(plan.data) &&
          onManage ? (
            <Button variant="primary" onClick={onManage} busy={manageBusy}>
              Manage plan
            </Button>
          ) : null}
          <a
            href={getOsOrigin()}
            className={cn(
              buttonVariants({ variant: "secondary" }),
              "no-underline",
            )}
          >
            Open OS ↗
          </a>
        </div>
      </div>

      <div className="mt-5 border-t border-[var(--color-line-soft)] pt-4">
        {plan.state === "loading" ? (
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-6 w-20" />
          </div>
        ) : plan.state === "error" ? (
          <p className="text-sm text-[var(--color-ink-muted)]">
            Plan details are unavailable right now.
          </p>
        ) : (
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-geist text-lg font-semibold capitalize text-[var(--color-ink)]">
                {planSummary(plan.data)}
              </p>
              <Badge tone={planStatusTone(plan.data)}>
                {plan.data.cancelAtPeriodEnd ? "cancelling" : plan.data.status}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
              {[priceLabel, renewalLabel(plan.data)]
                .filter(Boolean)
                .join(" · ") || "No renewal scheduled"}
            </p>
          </div>
        )}

        {plan.state === "ready" && plan.data.paymentError ? (
          <p
            role="alert"
            className="mt-3 rounded-[var(--radius-control)] bg-[var(--color-danger-tint)] px-3 py-2 text-sm text-[var(--color-danger)]"
          >
            {plan.data.paymentError.message ??
              "There's a problem with your payment method."}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function Avatar({ user, name }: { user: AuthUser; name: string }) {
  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt=""
        width={48}
        height={48}
        // Google avatar URLs 403 when a referrer is attached.
        referrerPolicy="no-referrer"
        className="size-12 shrink-0 rounded-full border border-[var(--color-line)] object-cover"
      />
    );
  }
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      aria-hidden="true"
      className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-tint)] font-geist text-lg font-semibold text-[var(--color-brand-strong)]"
    >
      {initial}
    </div>
  );
}
