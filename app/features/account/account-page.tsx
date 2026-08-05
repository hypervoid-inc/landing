import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router";

import { SiteFooter, SiteHeader } from "../../components/layout/site-layout";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { Banner, Card, buttonVariants } from "../../components/ui/primitives";
import { cn } from "../../lib/cn";
import * as authApi from "../../platform/api/auth";
import * as billingApi from "../../platform/api/billing";
import { catalogIntervalView } from "../../platform/api/billing";
import { getOsOrigin } from "../../platform/env";
import type {
  BillingInterval,
  PaidPlanId,
} from "../../platform/api/schemas";
import { useAuth } from "../auth/auth-provider";
import { formatMoney, intervalSuffix } from "./account-format";
import * as llmApi from "../../platform/api/llm";
import { BillingActionsSection } from "./sections/billing-actions-section";
import { ByokSection } from "./sections/byok-section";
import { IdentityHero } from "./sections/identity-hero";
import { PlanSection } from "./sections/plan-section";
import { ProfileSection } from "./sections/profile-section";
import { SecuritySection } from "./sections/security-section";
import { UsageSection } from "./sections/usage-section";
import { usePendingActions, useAccountData } from "./use-account-data";

function billingReturnMessage(status: string | null): string | null {
  if (status === "success") return "Subscription activating — refreshing…";
  if (status === "payment_method") return "Payment method updated.";
  return null;
}

export function AccountPage() {
  const { status, user, logout, refresh: refreshAuth } = useAuth();
  const [params, setParams] = useSearchParams();
  const billingStatusParam = params.get("billing_status");

  const authed = status === "authenticated";
  const { data, refresh } = useAccountData(authed);
  const { isPending, run } = usePendingActions();

  const [intervalChoice, setIntervalChoice] = useState<BillingInterval | null>(
    null,
  );
  const [message, setMessage] = useState<string | null>(() =>
    billingReturnMessage(billingStatusParam),
  );
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [pendingSwitch, setPendingSwitch] = useState<PaidPlanId | null>(null);

  // Derived, not synced: until the user picks, show the interval they're
  // already billed on so the toggle reflects reality rather than defaulting to
  // monthly and needing an effect to correct itself.
  const planInterval =
    data.plan.state === "ready" ? data.plan.data.interval : null;
  const interval: BillingInterval = intervalChoice ?? planInterval ?? "month";
  const setInterval = setIntervalChoice;

  useEffect(() => {
    if (!billingStatusParam) return;
    const next = new URLSearchParams(params);
    next.delete("billing_status");
    setParams(next, { replace: true });
  }, [billingStatusParam, params, setParams]);

  const startCheckout = useCallback(
    async (id: PaidPlanId, chosen: BillingInterval) => {
      setError(null);
      const result = await run(`checkout-${id}`, async () => {
        const response = await billingApi.createCheckout(id, chosen);
        if (response.success) {
          window.location.href = response.data.checkoutUrl;
          return { success: true };
        }
        return { success: false, error: response.error };
      });
      if (!result.success) setError(result.error ?? "Couldn't start checkout.");
    },
    [run],
  );

  // `?plan=` is the handoff from the pricing CTAs.
  const planIntent = params.get("plan");
  const canCheckout =
    data.plan.state === "ready" ? data.plan.data.canCheckout : false;
  useEffect(() => {
    if (!planIntent || !canCheckout) return;
    if (!["lite", "starter", "pro"].includes(planIntent)) return;
    void (async () => {
      const next = new URLSearchParams(params);
      next.delete("plan");
      setParams(next, { replace: true });
      await startCheckout(planIntent as PaidPlanId, interval);
    })();
  }, [planIntent, canCheckout, params, setParams, interval, startCheckout]);

  if (status === "loading") {
    return <AccountSkeleton />;
  }
  if (status === "anonymous" || !user) {
    return <Navigate to="/login" replace />;
  }

  async function act(
    key: string,
    fn: () => Promise<{ success: boolean; error?: string }>,
    successMessage: string,
  ) {
    setError(null);
    setMessage(null);
    const result = await run(key, fn);
    if (result.success) {
      setMessage(successMessage);
      await refresh();
    } else {
      setError(result.error ?? "Something went wrong.");
    }
  }

  const planData = data.plan.state === "ready" ? data.plan.data : null;
  const catalogPlans =
    data.catalog.state === "ready" ? data.catalog.data.plans : [];
  const currentCatalog = catalogPlans.find((p) => p.id === planData?.plan);
  const currentView = currentCatalog
    ? catalogIntervalView(currentCatalog, planData?.interval ?? interval)
    : null;
  const heroPrice = currentView
    ? (() => {
        const money = formatMoney(currentView.price);
        return money
          ? `${money}${intervalSuffix(planData?.interval ?? interval)}`
          : null;
      })()
    : null;

  const workspaceData =
    data.workspaces.state === "ready"
      ? data.workspaces.data
      : { workspaces: [], activeWorkspaceId: null };

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--color-canvas)]">
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        {message ? (
          <Banner tone="info" onDismiss={() => setMessage(null)}>
            {message}
          </Banner>
        ) : null}
        {error ? (
          <Banner tone="error" onDismiss={() => setError(null)}>
            {error}
          </Banner>
        ) : null}

        <div className="mt-4 space-y-4">
          <IdentityHero
            user={user}
            plan={data.plan}
            priceLabel={heroPrice}
            manageBusy={isPending("portal")}
            onManage={() =>
              void act(
                "portal",
                async () => {
                  const result = await billingApi.createPortal();
                  if (result.success) {
                    window.location.href = result.data.portalUrl;
                    return { success: true };
                  }
                  return { success: false, error: result.error };
                },
                "Opening billing…",
              )
            }
          />

          {!user.onboardingCompleted ? (
            <Card
              index={1}
              className="border-[var(--color-warn-line)] bg-[var(--color-warn-tint)]"
            >
              <h2 className="font-geist font-semibold text-[var(--color-ink)]">
                Finish setup
              </h2>
              <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
                Complete onboarding in Construct OS to unlock the full product.
              </p>
              <a
                href={getOsOrigin()}
                className={cn(
                  buttonVariants({ variant: "primary" }),
                  "mt-4 no-underline",
                )}
              >
                Continue in OS
              </a>
            </Card>
          ) : null}

          <PlanSection
            index={2}
            plan={data.plan}
            catalog={data.catalog}
            interval={interval}
            onIntervalChange={setInterval}
            isPending={isPending}
            onRetry={refresh}
            onCheckout={(id) => void startCheckout(id, interval)}
            onChangePlan={(id) => setPendingSwitch(id)}
            manageBusy={isPending("portal")}
            onManage={() =>
              void act(
                "portal",
                async () => {
                  const result = await billingApi.createPortal();
                  if (result.success) {
                    window.location.href = result.data.portalUrl;
                    return { success: true };
                  }
                  return { success: false, error: result.error };
                },
                "Opening billing…",
              )
            }
          />

          <UsageSection index={3} plan={data.plan} onRetry={refresh} />

          {data.byok ? (
            <ByokSection
              index={4}
              settings={data.byok}
              models={data.byokModels}
              byokUsage={planData?.byokUsage}
              isPending={isPending}
              onRetry={refresh}
              onSetKey={(provider, apiKey, region) =>
                void act(
                  `byok-key-${provider}`,
                  async () => {
                    const result = await llmApi.setByokKey(
                      provider,
                      apiKey,
                      region,
                    );
                    return result.success
                      ? { success: true }
                      : { success: false, error: result.error };
                  },
                  "Key saved.",
                )
              }
              onRemoveKey={(provider) =>
                void act(
                  `byok-key-${provider}`,
                  async () => {
                    const result = await llmApi.removeByokKey(provider);
                    return result.success
                      ? { success: true }
                      : { success: false, error: result.error };
                  },
                  "Key removed.",
                )
              }
              onUpdate={(input) =>
                void act(
                  input.slots
                    ? "byok-slots"
                    : input.mode
                      ? "byok-mode"
                      : "byok-limit",
                  async () => {
                    const result = await llmApi.updateByokSettings(input);
                    return result.success
                      ? { success: true }
                      : { success: false, error: result.error };
                  },
                  "Key settings updated.",
                )
              }
            />
          ) : null}

          <ProfileSection
            // Remount on a different account so the form reseeds from the new
            // user rather than syncing props into state.
            key={user.id}
            index={5}
            user={user}
            workspaces={workspaceData.workspaces}
            activeWorkspaceId={workspaceData.activeWorkspaceId}
            saving={isPending("profile")}
            switching={isPending("workspace")}
            onSave={(input) =>
              void act(
                "profile",
                async () => {
                  const result = await authApi.updateProfile(input);
                  if (result.success) {
                    await refreshAuth();
                    return { success: true };
                  }
                  return { success: false, error: result.error };
                },
                "Profile updated.",
              )
            }
            onSwitchWorkspace={(id) =>
              void act(
                "workspace",
                async () => {
                  const result = await billingApi.switchWorkspace(id);
                  if (result.success) {
                    await refreshAuth();
                    return { success: true };
                  }
                  return { success: false, error: result.error };
                },
                "Workspace switched.",
              )
            }
          />

          <SecuritySection
            index={6}
            hasPassword={data.hasPassword}
            sessions={data.sessions}
            isPending={isPending}
            onRetry={refresh}
            onLogout={() => void logout()}
            onSetPassword={(input) =>
              void act(
                "password",
                () => authApi.passwordSet(input),
                "Password updated. Other sessions were signed out.",
              )
            }
            onRevokeSession={(id) =>
              void act(
                `revoke-${id}`,
                async () => {
                  const result = await authApi.revokeSession(id);
                  return result.success
                    ? { success: true }
                    : { success: false, error: result.error };
                },
                "Session signed out.",
              )
            }
          />

          <BillingActionsSection
            index={7}
            plan={data.plan}
            isPending={isPending}
            onPortal={() =>
              void act(
                "portal",
                async () => {
                  const result = await billingApi.createPortal();
                  if (result.success) {
                    window.location.href = result.data.portalUrl;
                    return { success: true };
                  }
                  return { success: false, error: result.error };
                },
                "Opening billing…",
              )
            }
            onPaymentMethod={() =>
              void act(
                "payment-method",
                async () => {
                  const result = await billingApi.updatePaymentMethod();
                  if (result.success) {
                    window.location.href = result.data.url;
                    return { success: true };
                  }
                  return { success: false, error: result.error };
                },
                "Opening payment details…",
              )
            }
            onCancel={() => setConfirmCancel(true)}
            onResume={() =>
              void act(
                "resume",
                async () => {
                  const result = await billingApi.resumeSubscription();
                  return result.success
                    ? { success: true }
                    : { success: false, error: result.error };
                },
                "Subscription resumed.",
              )
            }
          />
        </div>

        <p className="mt-8 text-center text-sm">
          <Link to="/" className="text-[var(--color-brand-strong)]">
            Back to home
          </Link>
        </p>
      </main>
      <SiteFooter />

      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        destructive
        title="Cancel your subscription?"
        description="You'll keep full access until the end of the current billing period, then drop to the free tier."
        confirmLabel="Cancel subscription"
        cancelLabel="Keep it"
        busy={isPending("cancel")}
        onConfirm={() => {
          setConfirmCancel(false);
          void act(
            "cancel",
            async () => {
              const result = await billingApi.cancelSubscription();
              return result.success
                ? { success: true }
                : { success: false, error: result.error };
            },
            "Subscription will end at the period close.",
          );
        }}
      />

      <ConfirmDialog
        open={pendingSwitch != null}
        onOpenChange={(open) => !open && setPendingSwitch(null)}
        title={`Switch to ${pendingSwitch ?? ""}?`}
        description="Your plan changes immediately and billing is prorated by our payment provider."
        confirmLabel="Switch plan"
        busy={pendingSwitch ? isPending(`change-${pendingSwitch}`) : false}
        onConfirm={() => {
          const target = pendingSwitch;
          setPendingSwitch(null);
          if (!target) return;
          void act(
            `change-${target}`,
            async () => {
              const result = await billingApi.changePlan(target, interval);
              return result.success
                ? { success: true }
                : { success: false, error: result.error };
            },
            "Plan updated.",
          );
        }}
      />
    </div>
  );
}

/**
 * Renders the real page frame, including the footer, so nothing shifts when
 * auth resolves. The old loading branch dropped the footer entirely.
 */
function AccountSkeleton() {
  return (
    <div className="flex min-h-dvh flex-col bg-[var(--color-canvas)]">
      <SiteHeader />
      <main
        id="main"
        aria-busy="true"
        aria-label="Loading your account"
        className="mx-auto w-full max-w-3xl flex-1 px-4 py-8"
      >
        <div className="space-y-4">
          <div className="h-32 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white" />
          <div className="h-56 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white" />
          <div className="h-40 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white" />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
