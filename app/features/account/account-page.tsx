import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router";

import { SiteFooter, SiteHeader } from "../../components/layout/site-layout";
import * as billingApi from "../../platform/api/billing";
import type {
  BillingInterval,
  BillingPlan,
  CatalogPlan,
  PaidPlanId,
  WorkspaceSummary,
} from "../../platform/api/billing";
import * as authApi from "../../platform/api/auth";
import { getOsOrigin } from "../../platform/env";
import { useAuth } from "../auth/auth-provider";

const fieldClass =
  "w-full rounded-xl border border-[#dcecef] bg-white px-3 py-2.5 text-sm text-[#4e4646] outline-none focus:border-[#01b4c8]";
const btn =
  "inline-flex min-h-10 items-center justify-center rounded-full px-4 text-sm font-semibold";
const btnPrimary = `${btn} bg-black text-white`;
const btnGhost = `${btn} border border-[#dcecef] bg-white text-[#4e4646]`;

function formatBytes(n: number | undefined): string {
  if (n == null) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(1)} GB`;
}

function billingReturnMessage(status: string | null): string | null {
  if (status === "success") return "Subscription activating — refreshing…";
  if (status === "payment_method") return "Payment method updated.";
  return null;
}

export function AccountPage() {
  const { status, user, logout, refresh } = useAuth();
  const [params, setParams] = useSearchParams();
  const billingStatusParam = params.get("billing_status");
  const [plan, setPlan] = useState<BillingPlan | null>(null);
  const [catalog, setCatalog] = useState<CatalogPlan[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(
    null,
  );
  const [interval, setInterval] = useState<BillingInterval>("month");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(() =>
    billingReturnMessage(billingStatusParam),
  );
  const [error, setError] = useState<string | null>(null);
  const [hasPassword, setHasPassword] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNext, setPwNext] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");

  const load = useCallback(async () => {
    const [planRes, catalogRes, wsRes, pw] = await Promise.all([
      billingApi.getPlan(),
      billingApi.getPlanCatalog(),
      billingApi.listWorkspaces(),
      authApi.passwordStatus(),
    ]);
    if (planRes.success) setPlan(planRes.data);
    if (catalogRes.success) setCatalog(catalogRes.data.plans ?? []);
    if (wsRes.success) {
      setWorkspaces(wsRes.data.workspaces ?? []);
      setActiveWorkspaceId(wsRes.data.activeWorkspaceId);
    }
    setHasPassword(pw.hasPassword);
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    void (async () => {
      const [planRes, catalogRes, wsRes, pw] = await Promise.all([
        billingApi.getPlan(),
        billingApi.getPlanCatalog(),
        billingApi.listWorkspaces(),
        authApi.passwordStatus(),
      ]);
      if (cancelled) return;
      if (planRes.success) setPlan(planRes.data);
      if (catalogRes.success) setCatalog(catalogRes.data.plans ?? []);
      if (wsRes.success) {
        setWorkspaces(wsRes.data.workspaces ?? []);
        setActiveWorkspaceId(wsRes.data.activeWorkspaceId);
      }
      setHasPassword(pw.hasPassword);
    })();
    return () => {
      cancelled = true;
    };
  }, [status]);

  useEffect(() => {
    if (!billingStatusParam) return;
    const next = new URLSearchParams(params);
    next.delete("billing_status");
    setParams(next, { replace: true });
  }, [billingStatusParam, params, setParams]);

  useEffect(() => {
    const intent = params.get("plan");
    if (!intent || !plan?.canCheckout) return;
    if (!["lite", "starter", "pro"].includes(intent)) return;
    const next = new URLSearchParams(params);
    next.delete("plan");
    setParams(next, { replace: true });
    void (async () => {
      setBusy("checkout");
      const result = await billingApi.createCheckout(
        intent as PaidPlanId,
        interval,
      );
      setBusy(null);
      if (result.success) window.location.href = result.data.checkoutUrl;
      else setError(result.error);
    })();
  }, [params, plan, interval, setParams]);

  if (status === "loading") {
    return (
      <div className="flex min-h-dvh flex-col bg-[#f7fbfc]">
        <SiteHeader />
        <main className="flex flex-1 items-center justify-center text-sm text-[#627c86]">
          Loading account…
        </main>
      </div>
    );
  }

  if (status === "anonymous" || !user) {
    return <Navigate to="/login" replace />;
  }

  const isOwner = plan?.canManage || plan?.canCheckout || plan?.canChangePlan;

  async function run(
    key: string,
    fn: () => Promise<{ success: boolean; error?: string }>,
  ) {
    setBusy(key);
    setError(null);
    setMessage(null);
    const result = await fn();
    setBusy(null);
    if (!result.success) setError(result.error ?? "Failed");
    else {
      setMessage("Done.");
      await load();
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#f7fbfc]">
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-geist text-3xl font-semibold tracking-tight text-[#4e4646]">
              Account
            </h1>
            <p className="mt-1 text-sm text-[#627c86]">
              {user.email ?? user.username}
            </p>
          </div>
          <div className="flex gap-2">
            <a href={getOsOrigin()} className={btnGhost}>
              Open OS
            </a>
            <button
              type="button"
              className={btnGhost}
              onClick={() => void logout()}
            >
              Log out
            </button>
          </div>
        </div>

        {message ? (
          <p className="mt-4 rounded-lg bg-[#effbfc] px-3 py-2 text-sm text-[#018fa0]">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {!user.onboardingCompleted ? (
          <section className="mt-6 rounded-2xl border border-[#f5d0a9] bg-[#fff8f0] p-5">
            <h2 className="font-semibold text-[#4e4646]">Finish setup</h2>
            <p className="mt-1 text-sm text-[#627c86]">
              Complete onboarding in Construct OS to unlock the full product.
            </p>
            <a href={getOsOrigin()} className={`${btnPrimary} mt-4`}>
              Continue in OS
            </a>
          </section>
        ) : null}

        <section className="mt-8 rounded-2xl border border-[#dcecef] bg-white p-5">
          <h2 className="font-geist text-lg font-semibold text-[#4e4646]">
            Profile
          </h2>
          <dl className="mt-3 grid gap-2 text-sm text-[#627c86]">
            <div>
              <dt className="inline font-medium text-[#4e4646]">Name: </dt>
              <dd className="inline">
                {user.displayName ?? user.username}
              </dd>
            </div>
            <div>
              <dt className="inline font-medium text-[#4e4646]">Email: </dt>
              <dd className="inline">{user.email ?? "—"}</dd>
            </div>
          </dl>

          {workspaces.length > 1 ? (
            <div className="mt-4">
              <label className="text-sm font-medium text-[#4e4646]">
                Active workspace
              </label>
              <select
                className={`${fieldClass} mt-1`}
                value={activeWorkspaceId ?? ""}
                onChange={(e) => {
                  const id = e.target.value;
                  void (async () => {
                    setBusy("switch");
                    const result = await billingApi.switchWorkspace(id);
                    setBusy(null);
                    if (!result.success) setError(result.error);
                    else {
                      setActiveWorkspaceId(id);
                      await load();
                      await refresh();
                    }
                  })();
                }}
              >
                {workspaces.map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.name} ({ws.kind})
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <form
            className="mt-6 space-y-3 border-t border-[#eff3f5] pt-5"
            onSubmit={(e) => {
              e.preventDefault();
              void run("password", async () =>
                authApi.passwordSet({
                  currentPassword: hasPassword ? pwCurrent : undefined,
                  password: pwNext,
                  passwordConfirm: pwConfirm,
                }),
              );
            }}
          >
            <h3 className="text-sm font-semibold text-[#4e4646]">
              {hasPassword ? "Change password" : "Set password"}
            </h3>
            {hasPassword ? (
              <input
                className={fieldClass}
                type="password"
                placeholder="Current password"
                value={pwCurrent}
                onChange={(e) => setPwCurrent(e.target.value)}
                required
              />
            ) : null}
            <input
              className={fieldClass}
              type="password"
              minLength={12}
              placeholder="New password (12+)"
              value={pwNext}
              onChange={(e) => setPwNext(e.target.value)}
              required
            />
            <input
              className={fieldClass}
              type="password"
              minLength={12}
              placeholder="Confirm password"
              value={pwConfirm}
              onChange={(e) => setPwConfirm(e.target.value)}
              required
            />
            <button
              type="submit"
              className={btnPrimary}
              disabled={busy === "password"}
            >
              Save password
            </button>
          </form>
        </section>

        <section className="mt-6 rounded-2xl border border-[#dcecef] bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-geist text-lg font-semibold text-[#4e4646]">
              Billing
            </h2>
            <div className="inline-flex rounded-full border border-[#dcecef] p-0.5 text-xs">
              <button
                type="button"
                className={`rounded-full px-3 py-1.5 ${interval === "month" ? "bg-black text-white" : "text-[#627c86]"}`}
                onClick={() => setInterval("month")}
              >
                Monthly
              </button>
              <button
                type="button"
                className={`rounded-full px-3 py-1.5 ${interval === "year" ? "bg-black text-white" : "text-[#627c86]"}`}
                onClick={() => setInterval("year")}
              >
                Annual
              </button>
            </div>
          </div>

          {plan ? (
            <div className="mt-3 text-sm text-[#627c86]">
              <p>
                Current plan:{" "}
                <span className="font-semibold capitalize text-[#4e4646]">
                  {plan.plan}
                </span>{" "}
                · {plan.status}
                {plan.cancelAtPeriodEnd ? " (cancels at period end)" : ""}
              </p>
              {plan.usage ? (
                <p className="mt-1">
                  Usage — session {Math.round(plan.usage.sessionPct ?? 0)}%,
                  monthly {Math.round(plan.usage.monthlyPct ?? 0)}%
                </p>
              ) : null}
              {plan.ownerUsage ? (
                <p className="mt-1">
                  Agents {plan.ownerUsage.agentsUsed ?? 0}/
                  {plan.ownerUsage.agentsMax ?? "—"} · Storage{" "}
                  {formatBytes(plan.ownerUsage.storageBytesUsed)} /{" "}
                  {formatBytes(plan.ownerUsage.storageBytesMax)}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-sm text-[#627c86]">Loading plan…</p>
          )}

          {!isOwner ? (
            <p className="mt-4 text-sm text-[#627c86]">
              Only the workspace owner can change billing. You can still view
              status here.
            </p>
          ) : (
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {(["lite", "starter", "pro"] as const).map((id) => {
                const cat = catalog.find((p) => p.id === id);
                const price = cat?.prices?.[interval];
                const current = plan?.plan === id;
                return (
                  <div
                    key={id}
                    className="rounded-xl border border-[#eff3f5] p-4"
                  >
                    <p className="font-semibold capitalize text-[#4e4646]">
                      {id}
                    </p>
                    <p className="mt-1 text-sm text-[#627c86]">
                      {price
                        ? `${(price.amount / 100).toFixed(0)} ${price.currency.toUpperCase()}/${interval === "year" ? "yr" : "mo"}`
                        : "—"}
                    </p>
                    {current ? (
                      <p className="mt-3 text-xs font-medium text-[#018fa0]">
                        Current
                      </p>
                    ) : plan?.canCheckout ? (
                      <button
                        type="button"
                        className={`${btnPrimary} mt-3 w-full`}
                        disabled={busy === `checkout-${id}`}
                        onClick={() =>
                          void (async () => {
                            setBusy(`checkout-${id}`);
                            const result = await billingApi.createCheckout(
                              id,
                              interval,
                            );
                            setBusy(null);
                            if (result.success) {
                              window.location.href = result.data.checkoutUrl;
                            } else setError(result.error);
                          })()
                        }
                      >
                        Subscribe
                      </button>
                    ) : plan?.canChangePlan ? (
                      <button
                        type="button"
                        className={`${btnGhost} mt-3 w-full`}
                        disabled={busy === `change-${id}`}
                        onClick={() =>
                          void run(`change-${id}`, async () => {
                            const r = await billingApi.changePlan(id, interval);
                            return r.success
                              ? { success: true }
                              : { success: false, error: r.error };
                          })
                        }
                      >
                        Switch
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}

          {isOwner ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {plan?.canManage ? (
                <button
                  type="button"
                  className={btnGhost}
                  disabled={!!busy}
                  onClick={() =>
                    void (async () => {
                      setBusy("portal");
                      const r = await billingApi.createPortal();
                      setBusy(null);
                      if (r.success) window.location.href = r.data.portalUrl;
                      else setError(r.error);
                    })()
                  }
                >
                  Manage billing
                </button>
              ) : null}
              {plan?.canManage ? (
                <button
                  type="button"
                  className={btnGhost}
                  disabled={!!busy}
                  onClick={() =>
                    void (async () => {
                      setBusy("payment");
                      const r = await billingApi.updatePaymentMethod();
                      setBusy(null);
                      if (r.success) window.location.href = r.data.url;
                      else setError(r.error);
                    })()
                  }
                >
                  Update payment
                </button>
              ) : null}
              {plan?.canManage &&
              plan.plan !== "unsubscribed" &&
              !plan.cancelAtPeriodEnd ? (
                <button
                  type="button"
                  className={btnGhost}
                  disabled={!!busy}
                  onClick={() =>
                    void run("cancel", async () => {
                      const r = await billingApi.cancelSubscription();
                      return r.success
                        ? { success: true }
                        : { success: false, error: r.error };
                    })
                  }
                >
                  Cancel at period end
                </button>
              ) : null}
              {plan?.cancelAtPeriodEnd ? (
                <button
                  type="button"
                  className={btnGhost}
                  disabled={!!busy}
                  onClick={() =>
                    void run("resume", async () => {
                      const r = await billingApi.resumeSubscription();
                      return r.success
                        ? { success: true }
                        : { success: false, error: r.error };
                    })
                  }
                >
                  Resume subscription
                </button>
              ) : null}
            </div>
          ) : null}
        </section>

        <p className="mt-8 text-center text-sm text-[#627c86]">
          <Link to="/" className="text-[#018fa0]">
            Back to home
          </Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
