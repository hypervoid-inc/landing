import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router";

import { SiteFooter, SiteHeader } from "../../components/layout/site-layout";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { Banner, Card, buttonVariants } from "../../components/ui/primitives";
import { cn } from "../../lib/cn";
import * as authApi from "../../platform/api/auth";
import * as billingApi from "../../platform/api/billing";
import { catalogIntervalView } from "../../platform/api/billing";
import { getAppOrigin } from "../../platform/env";
import type {
  BillingInterval,
  PaidPlanId,
} from "../../platform/api/schemas";
import { captureAnalytics } from "../analytics/analytics.client";
import { readAttributionCookie } from "../analytics/campaign-attribution.client";
import { useAuth } from "../auth/auth-provider";
import {
  ACTIVATION_POLL_MS,
  ACTIVATION_TIMEOUT_MS,
  BILLING_RETURN_PARAMS,
  billingReturnSearch,
  billedCatalogPriceLabel,
  billingReturnNotice,
  canChangeBillingPlan,
  formatMoney,
  intervalSuffix,
  isPlanActivated,
  parseBillingInterval,
  planIntentAction,
  planIntentSearch,
} from "./account-format";
import * as llmApi from "../../platform/api/llm";
import { BillingActionsSection } from "./sections/billing-actions-section";
import { ByokSection } from "./sections/byok-section";
import { IdentityHero } from "./sections/identity-hero";
import { PlanSection } from "./sections/plan-section";
import { ProfileSection } from "./sections/profile-section";
import { SecuritySection } from "./sections/security-section";
import { UsageSection } from "./sections/usage-section";
import { usePendingActions, useAccountData } from "./use-account-data";

export function AccountPage() {
  const { status, user, logout, refresh: refreshAuth } = useAuth();
  const [params, setParams] = useSearchParams();
  const billingStatusParam = params.get("billing_status");

  const authed = status === "authenticated";
  const { data, refresh, refreshPlan } = useAccountData(authed);
  const { isPending, run } = usePendingActions();

  // Seeded from `?interval=` so annual picked on pricing stays annual here.
  const [intervalChoice, setIntervalChoice] = useState<BillingInterval | null>(
    () => parseBillingInterval(params.get("interval")),
  );
  const [returnNotice] = useState(() => billingReturnNotice(params));
  // Read once: the params are dropped from the URL before auth resolves.
  const [billingReturn] = useState(() => billingReturnSearch(params));
  const [message, setMessage] = useState<string | null>(() =>
    returnNotice?.tone === "info" && !returnNotice.activating
      ? returnNotice.text
      : null,
  );
  const [activationShown, setActivationShown] = useState(
    () => returnNotice?.activating === true,
  );
  const [activationTimedOut, setActivationTimedOut] = useState(false);
  const activated =
    data.plan.state === "ready" && isPlanActivated(data.plan.data);
  const [error, setError] = useState<string | null>(() =>
    returnNotice?.tone === "error" ? returnNotice.text : null,
  );
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [pendingSwitch, setPendingSwitch] = useState<PaidPlanId | null>(null);

  // Derived, not synced: until the user picks, show the interval they're
  // already billed on so the toggle reflects reality rather than defaulting to
  // monthly and needing an effect to correct itself.
  const planInterval =
    data.plan.state === "ready" ? data.plan.data.interval : null;
  const interval: BillingInterval = intervalChoice ?? planInterval ?? "month";
  const setInterval = setIntervalChoice;

  // Dodo returns before its webhook lands, so poll the plan until it turns on
  // instead of leaving "activating" up until a manual reload. Keyed to the
  // return itself, not the banner, so dismissing the banner keeps polling, and
  // started only once the first load has written the plan so that load can't
  // overwrite a newer poll result.
  const awaitingActivation = returnNotice?.activating === true;
  const planLoaded = data.plan.state !== "loading";
  const polledRef = useRef(false);
  useEffect(() => {
    if (!authed || !awaitingActivation || !planLoaded || activated) return;
    polledRef.current = true;
    const poll = window.setInterval(() => {
      void refreshPlan();
    }, ACTIVATION_POLL_MS);
    const stop = window.setTimeout(() => {
      window.clearInterval(poll);
      setActivationTimedOut(true);
    }, ACTIVATION_TIMEOUT_MS);
    return () => {
      window.clearInterval(poll);
      window.clearTimeout(stop);
    };
  }, [authed, awaitingActivation, planLoaded, activated, refreshPlan]);

  // Polling only swaps the plan; plan-gated data like BYOK was loaded while
  // still unsubscribed, so reload everything once when the plan turns on.
  useEffect(() => {
    if (!activated || !polledRef.current) return;
    polledRef.current = false;
    void (async () => {
      await refresh();
    })();
  }, [activated, refresh]);

  useEffect(() => {
    if (!billingStatusParam) return;
    const next = new URLSearchParams(params);
    for (const key of BILLING_RETURN_PARAMS) next.delete(key);
    setParams(next, { replace: true });
  }, [billingStatusParam, params, setParams]);

  const startCheckout = useCallback(
    async (id: PaidPlanId, chosen: BillingInterval) => {
      setError(null);
      const promoCode = readAttributionCookie()?.p;
      // Same event name and property shape as the pricing CTA and apps/web, so
      // all three roll up into one checkout funnel split by `source`.
      captureAnalytics("checkout_started", {
        plan: id,
        interval: chosen,
        source: "account",
        ...(promoCode ? { promo_code: promoCode } : {}),
      });
      const result = await run(`checkout-${id}`, async () => {
        const response = await billingApi.createCheckout(id, chosen, promoCode);
        if (response.success) {
          captureAnalytics("checkout_redirected", {
            plan: id,
            interval: chosen,
            source: "account",
          });
          window.location.href = response.data.checkoutUrl;
          return { success: true };
        }
        return { success: false, error: response.error };
      });
      if (!result.success) {
        captureAnalytics("checkout_failed", {
          plan: id,
          interval: chosen,
          source: "account",
        });
        setError(result.error ?? "Couldn't start checkout.");
      }
    },
    [run],
  );

  // `?plan=` is the handoff from the pricing CTAs. It is consumed once the
  // plan loads: a reader who can't check out is told where they stand, and one
  // whose Pro trial is spent confirms the charge, since the CTA said free.
  const planIntent = params.get("plan");
  const loadedPlan = data.plan.state === "ready" ? data.plan.data : null;
  const [intentNotice, setIntentNotice] = useState<IntentNotice>(null);
  // A plan reload can hand the effect a new loadedPlan before the param
  // removal commits; the ref keeps that from starting a second checkout. It
  // resets once the param is gone, so a later ?plan= still works.
  const intentConsumedRef = useRef(false);
  useEffect(() => {
    if (!planIntent) {
      intentConsumedRef.current = false;
      return;
    }
    if (!loadedPlan || intentConsumedRef.current) return;
    intentConsumedRef.current = true;
    void (async () => {
      const next = new URLSearchParams(params);
      next.delete("plan");
      next.delete("interval");
      setParams(next, { replace: true });
      const action = planIntentAction(loadedPlan, planIntent);
      if (action === "ignore") return;
      const wanted = planIntent as PaidPlanId;
      if (action === "checkout") {
        await startCheckout(wanted, interval);
        return;
      }
      setIntentNotice({ kind: action, wanted });
    })();
  }, [planIntent, loadedPlan, params, setParams, interval, startCheckout]);

  if (status === "loading") {
    return <AccountSkeleton />;
  }
  if (status === "anonymous" || !user) {
    // Keep a pricing CTA's plan through sign-in (the checkout_failed fallback
    // for an expired session lands here), and a checkout return's notice.
    const to = planIntent
      ? `/login/${planIntentSearch(planIntent, parseBillingInterval(params.get("interval")))}`
      : `/login/${billingReturn}`;
    return <Navigate to={to} replace />;
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
  const currentView =
    planData?.interval != null && currentCatalog
      ? catalogIntervalView(currentCatalog, planData.interval)
      : null;
  const heroPrice =
    planData && currentView
      ? billedCatalogPriceLabel(planData, currentView.price)
      : null;
  const showPlanPicker = planData != null && canChangeBillingPlan(planData);

  const intentCatalog = intentNotice
    ? catalogPlans.find((p) => p.id === intentNotice.wanted)
    : undefined;
  const intentPrice = intentCatalog
    ? formatMoney(catalogIntervalView(intentCatalog, interval).price)
    : null;
  const intentPriceLabel = intentPrice
    ? `${intentPrice}${intervalSuffix(interval)}`
    : null;

  const workspaceData =
    data.workspaces.state === "ready"
      ? data.workspaces.data
      : { workspaces: [], activeWorkspaceId: null };

  const openPortal = () =>
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
    );

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--color-canvas)]">
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        {message ? (
          <Banner tone="info" onDismiss={() => setMessage(null)}>
            {message}
          </Banner>
        ) : null}
        {activationShown ? (
          <Banner
            tone={activated || !activationTimedOut ? "info" : "warning"}
            onDismiss={() => setActivationShown(false)}
          >
            {activated ? (
              <>
                Your plan is active.{" "}
                <a
                  href="/app/"
                  className="font-medium underline underline-offset-2"
                >
                  Open app
                </a>
              </>
            ) : activationTimedOut ? (
              <>
                Payment received, but your plan hasn&apos;t switched on yet.
                Refresh in a minute, or email{" "}
                <a
                  href="mailto:support@construct.computer"
                  className="underline underline-offset-2"
                >
                  support@construct.computer
                </a>{" "}
                if it stays this way.
              </>
            ) : (
              returnNotice?.text
            )}
          </Banner>
        ) : null}
        {intentNotice?.kind === "trial-used" ? (
          <Banner tone="warning" onDismiss={() => setIntentNotice(null)}>
            You&apos;ve already used your Pro trial, so Pro starts
            {intentPriceLabel ? ` at ${intentPriceLabel}` : ""} today.{" "}
            <button
              type="button"
              className="font-medium underline underline-offset-2"
              disabled={isPending(`checkout-${intentNotice.wanted}`)}
              onClick={() => {
                const wanted = intentNotice.wanted;
                setIntentNotice(null);
                void startCheckout(wanted, interval);
              }}
            >
              Continue to checkout
            </button>
          </Banner>
        ) : null}
        {intentNotice?.kind === "subscribed" && planData ? (
          <Banner tone="info" onDismiss={() => setIntentNotice(null)}>
            You&apos;re already on{" "}
            <span className="capitalize">{planData.plan}</span>.{" "}
            {planData.plan !== intentNotice.wanted && showPlanPicker ? (
              <>
                You can switch to{" "}
                <span className="capitalize">{intentNotice.wanted}</span> below.
              </>
            ) : (
              <a
                href={getAppOrigin()}
                className="font-medium underline underline-offset-2"
              >
                Open app
              </a>
            )}
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
            onManage={openPortal}
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
                Complete onboarding in Construct to unlock the full product.
              </p>
              <a
                href={getAppOrigin()}
                className={cn(
                  buttonVariants({ variant: "primary" }),
                  "mt-4 no-underline",
                )}
              >
                Continue to Construct
              </a>
            </Card>
          ) : null}

          <ProfileSection
            // Remount on a different account so the form reseeds from the new
            // user rather than syncing props into state.
            key={user.id}
            index={2}
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

          <UsageSection index={3} plan={data.plan} onRetry={refresh} />

          {showPlanPicker ? (
            <PlanSection
              index={4}
              plan={data.plan}
              catalog={data.catalog}
              interval={interval}
              onIntervalChange={setInterval}
              isPending={isPending}
              onRetry={refresh}
              onCheckout={(id) => void startCheckout(id, interval)}
              onChangePlan={(id) => setPendingSwitch(id)}
              manageBusy={isPending("portal")}
              onManage={openPortal}
            />
          ) : null}

          {data.byok ? (
            <ByokSection
              index={5}
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
            onPortal={openPortal}
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

type IntentNotice = {
  kind: "trial-used" | "subscribed";
  wanted: PaidPlanId;
} | null;

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
