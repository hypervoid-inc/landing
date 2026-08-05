import { useState, type ReactNode } from "react";

import { ConfirmDialog } from "../../../components/ui/confirm-dialog";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CollapsibleCard,
  ErrorState,
  Input,
  Row,
  Skeleton,
} from "../../../components/ui/primitives";
import { Select } from "../../../components/ui/select";
import { cn } from "../../../lib/cn";
import { BEDROCK_REGIONS, BYOK_PROVIDERS, BYOK_SLOTS } from "../../../platform/api/llm";
import type {
  BedrockRegion,
  ByokMode,
  ByokModel,
  ByokProvider,
  ByokSettings,
  ByokSlot,
  ByokUsage,
} from "../../../platform/api/schemas";
import { getOsOrigin } from "../../../platform/env";
import {
  MODE_DESCRIPTION,
  MODE_LABEL,
  PROVIDER_KEY_HINT,
  PROVIDER_LABEL,
  SLOT_HINT,
  SLOT_LABEL,
  byokUsageTotals,
  formatTokens,
  groupModelsByVendor,
  modelsForSlot,
  providerConnectionState,
  readyProviderCount,
  upgradeCopy,
} from "../byok-format";
import type { Resource } from "../use-account-data";

export function ByokSection({
  index,
  settings,
  models,
  byokUsage,
  onSetKey,
  onRemoveKey,
  onUpdate,
  isPending,
  onRetry,
  collapsible = true,
}: {
  index: number;
  settings: Resource<ByokSettings>;
  models: Resource<ByokModel[]>;
  byokUsage: ByokUsage | undefined;
  onSetKey: (
    provider: ByokProvider,
    apiKey: string,
    region?: BedrockRegion,
  ) => void;
  onRemoveKey: (provider: ByokProvider) => void;
  onUpdate: (input: {
    mode?: ByokMode;
    monthlyLimitUsd?: number | null;
    slots?: Partial<Record<ByokSlot, string | null>>;
  }) => void;
  isPending: (key: string) => boolean;
  onRetry: () => void;
  collapsible?: boolean;
}) {
  const [removing, setRemoving] = useState<ByokProvider | null>(null);

  const summary =
    settings.state === "ready"
      ? settings.data.allowed
        ? `${MODE_LABEL[settings.data.mode]} · ${readyProviderCount(settings.data)} connected`
        : "Upgrade to unlock"
      : undefined;

  const wrap = (body: ReactNode, description?: string) =>
    collapsible ? (
      <CollapsibleCard
        index={index}
        title="Bring your own key"
        summary={summary}
        defaultOpen={false}
      >
        {description ? (
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            {description}
          </p>
        ) : null}
        {body}
      </CollapsibleCard>
    ) : (
      <Card index={index}>
        <CardHeader title="Your API keys" description={description} />
        {body}
      </Card>
    );

  if (settings.state === "loading") {
    return wrap(
      <div className="mt-4 space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>,
    );
  }

  if (settings.state === "error") {
    return wrap(
      <ErrorState
        message="Couldn't load your key settings."
        onRetry={settings.retryable ? onRetry : undefined}
      />,
    );
  }

  const data = settings.data;

  if (!data.allowed) {
    return wrap(
      <p className="mt-3 text-sm text-[var(--color-ink-muted)]">
        {upgradeCopy(data)}
      </p>,
    );
  }

  const usage = byokUsageTotals(byokUsage);
  const anyReady = readyProviderCount(data) > 0;

  return wrap(
    <>
      {/* Mode first: it decides what the keys below actually do. */}
      <div className="mt-4">
        <p className="text-sm font-medium text-[var(--color-ink)]">Mode</p>
        <div
          role="group"
          aria-label="Key usage mode"
          className="mt-2 grid gap-2 sm:grid-cols-3"
        >
          {(["off", "auto", "exclusive"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={data.mode === mode}
              disabled={isPending("byok-mode")}
              onClick={() => onUpdate({ mode })}
              className={cn(
                "rounded-[var(--radius-control)] border p-3 text-left",
                "transition-[border-color,background-color] duration-[var(--dur-hover)]",
                "active:scale-[0.98] motion-reduce:transform-none",
                "disabled:opacity-55",
                data.mode === mode
                  ? "border-[var(--color-brand)] bg-[var(--color-brand-tint)]"
                  : "border-[var(--color-line)] hover:border-[var(--color-brand)]",
              )}
            >
              <span className="block text-sm font-semibold text-[var(--color-ink)]">
                {MODE_LABEL[mode]}
              </span>
              <span className="mt-0.5 block text-xs text-[var(--color-ink-muted)]">
                {MODE_DESCRIPTION[mode]}
              </span>
            </button>
          ))}
        </div>
        {data.mode === "exclusive" && !anyReady ? (
          <p
            role="alert"
            className="mt-2 rounded-[var(--radius-control)] bg-[var(--color-warn-tint)] px-3 py-2 text-xs text-[#b54708]"
          >
            No working key is connected. In this mode requests will fail rather
            than falling back to Construct.
          </p>
        ) : null}
      </div>

      <div className="mt-6 border-t border-[var(--color-line-soft)] pt-4">
        <p className="text-sm font-medium text-[var(--color-ink)]">Providers</p>
        <div className="mt-1">
          {BYOK_PROVIDERS.map((provider) => (
            <ProviderRow
              key={provider}
              provider={provider}
              state={providerConnectionState(data, provider)}
              region={provider === "bedrock" ? data.bedrockRegion : null}
              xaiAuth={provider === "xai" ? data.xaiAuth : null}
              busy={isPending(`byok-key-${provider}`)}
              onSave={(apiKey, regionValue) =>
                onSetKey(provider, apiKey, regionValue)
              }
              onRemove={() => setRemoving(provider)}
            />
          ))}
        </div>
      </div>

      {anyReady ? (
        <ModelSlots
          slots={data.slots}
          models={models}
          isPending={isPending}
          onRetry={onRetry}
          onChange={(slot, modelId) => onUpdate({ slots: { [slot]: modelId } })}
        />
      ) : null}

      <div className="mt-6 border-t border-[var(--color-line-soft)] pt-4">
        <MonthlyLimit
          value={data.monthlyLimitUsd}
          busy={isPending("byok-limit")}
          onSave={(monthlyLimitUsd) => onUpdate({ monthlyLimitUsd })}
        />
      </div>

      {usage ? (
        <div className="mt-6 border-t border-[var(--color-line-soft)] pt-4">
          <p className="text-sm font-medium text-[var(--color-ink)]">
            This month on your keys
          </p>
          <Row label="Estimated cost">
            <span className="tabular text-sm text-[var(--color-ink-muted)]">
              ${usage.costUsd.toFixed(2)}
              {usage.isPartial ? "+" : ""}
            </span>
          </Row>
          <Row label="Tokens">
            <span className="tabular text-sm text-[var(--color-ink-muted)]">
              {formatTokens(usage.tokens)}
            </span>
          </Row>
          <p className="mt-2 text-xs text-[var(--color-ink-subtle)]">
            Estimated from usage. Your provider invoice is authoritative.
          </p>
        </div>
      ) : null}

      <ConfirmDialog
        open={removing != null}
        onOpenChange={(open) => !open && setRemoving(null)}
        destructive
        title={`Remove your ${removing ? PROVIDER_LABEL[removing] : ""} key?`}
        description="Construct will stop using this provider. You can add the key again at any time."
        confirmLabel="Remove key"
        busy={removing ? isPending(`byok-key-${removing}`) : false}
        onConfirm={() => {
          const target = removing;
          setRemoving(null);
          if (target) onRemoveKey(target);
        }}
      />
    </>,
    "Run inference on your own provider accounts instead of Construct's.",
  );
}

function ProviderRow({
  provider,
  state,
  region,
  xaiAuth,
  busy,
  onSave,
  onRemove,
}: {
  provider: ByokProvider;
  state: ReturnType<typeof providerConnectionState>;
  region: BedrockRegion | null;
  xaiAuth: "oauth" | "api_key" | null;
  busy: boolean;
  onSave: (apiKey: string, region?: BedrockRegion) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [regionValue, setRegionValue] = useState<BedrockRegion>(
    region ?? "us-east-1",
  );

  const connected = state !== "disconnected";
  // xAI keys created through the OS's OAuth flow can't be edited as a raw key.
  const oauthManaged = provider === "xai" && xaiAuth === "oauth";

  return (
    <div className="border-t border-[var(--color-line-soft)] py-3 first:border-t-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--color-ink)]">
            {PROVIDER_LABEL[provider]}
          </p>
          <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
            {state === "connected"
              ? provider === "bedrock" && region
                ? `Connected · ${region}`
                : "Connected"
              : state === "needs_attention"
                ? "Key saved but not working"
                : PROVIDER_KEY_HINT[provider]}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {state === "connected" ? <Badge tone="positive">Ready</Badge> : null}
          {state === "needs_attention" ? (
            <Badge tone="warning">Check key</Badge>
          ) : null}
          {oauthManaged ? null : (
            <Button size="sm" variant="ghost" onClick={() => setOpen(!open)}>
              {connected ? "Replace" : "Connect"}
            </Button>
          )}
          {connected ? (
            <Button size="sm" variant="ghost" onClick={onRemove}>
              Remove
            </Button>
          ) : null}
        </div>
      </div>

      {oauthManaged ? (
        <p className="mt-2 text-xs text-[var(--color-ink-subtle)]">
          Connected through xAI sign-in.{" "}
          <a
            href={getOsOrigin()}
            className="text-[var(--color-brand-strong)] underline"
          >
            Manage it in the OS
          </a>
          .
        </p>
      ) : null}

      {open && !oauthManaged ? (
        <form
          className="mt-3 space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (apiKey.trim().length < 8) return;
            onSave(
              apiKey.trim(),
              provider === "bedrock" ? regionValue : undefined,
            );
            setApiKey("");
            setOpen(false);
          }}
        >
          <Input
            name={`${provider}-key`}
            // type=password keeps the key out of replay DOM as well as shoulders.
            type="password"
            autoComplete="off"
            minLength={8}
            maxLength={2048}
            placeholder={`${PROVIDER_LABEL[provider]} API key`}
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            required
          />
          {provider === "bedrock" ? (
            <Select
              name="bedrock-region"
              label="Region"
              value={regionValue}
              onChange={(event) =>
                setRegionValue(event.target.value as BedrockRegion)
              }
              options={BEDROCK_REGIONS.map((value) => ({
                value,
                label: value,
              }))}
            />
          ) : null}
          <div className="flex gap-2">
            <Button type="submit" variant="primary" size="sm" busy={busy}>
              Save key
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setApiKey("");
                setOpen(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

function ModelSlots({
  slots,
  models,
  isPending,
  onRetry,
  onChange,
}: {
  slots: Record<ByokSlot, string | null>;
  models: Resource<ByokModel[]>;
  isPending: (key: string) => boolean;
  onRetry: () => void;
  onChange: (slot: ByokSlot, modelId: string | null) => void;
}) {
  return (
    <div className="mt-6 border-t border-[var(--color-line-soft)] pt-4">
      <p className="text-sm font-medium text-[var(--color-ink)]">Models</p>
      <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
        Leave a role on Automatic to let Construct pick.
      </p>

      {models.state === "loading" ? (
        <div className="mt-3 space-y-2">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      ) : models.state === "error" ? (
        <ErrorState
          message="Couldn't load models for your keys."
          onRetry={models.retryable ? onRetry : undefined}
        />
      ) : models.data.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--color-ink-muted)]">
          No models available from your connected providers yet.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {BYOK_SLOTS.map((slot) => {
            const available = modelsForSlot(models.data, slot);
            const grouped = groupModelsByVendor(available);
            const value = slots[slot] ?? "";
            // A previously-chosen model can vanish when a key is removed; keep
            // it selectable so the UI doesn't silently reassign the slot.
            const missing =
              value && !available.some((model) => model.id === value);

            return (
              <div key={slot}>
                <label
                  htmlFor={`slot-${slot}`}
                  className="mb-1 block text-sm font-medium text-[var(--color-ink)]"
                >
                  {SLOT_LABEL[slot]}
                </label>
                <select
                  id={`slot-${slot}`}
                  value={value}
                  disabled={isPending("byok-slots")}
                  onChange={(event) =>
                    onChange(slot, event.target.value || null)
                  }
                  className={cn(
                    "w-full appearance-none rounded-[var(--radius-control)] border",
                    "border-[var(--color-line)] bg-white px-3 py-2.5 text-sm",
                    "text-[var(--color-ink)] outline-none",
                    "focus:border-[var(--color-brand)] disabled:opacity-55",
                  )}
                >
                  <option value="">Automatic</option>
                  {missing ? (
                    <option value={value}>{value} (unavailable)</option>
                  ) : null}
                  {grouped.map((group) => (
                    <optgroup key={group.vendor} label={group.vendor}>
                      {group.models.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <p className="mt-0.5 text-xs text-[var(--color-ink-subtle)]">
                  {SLOT_HINT[slot]}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MonthlyLimit({
  value,
  busy,
  onSave,
}: {
  value: number | null;
  busy: boolean;
  onSave: (value: number | null) => void;
}) {
  const [draft, setDraft] = useState(value == null ? "" : String(value));
  const parsed = draft.trim() === "" ? null : Number(draft);
  const invalid = parsed != null && (!Number.isFinite(parsed) || parsed <= 0);

  return (
    <form
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (invalid) return;
        onSave(parsed);
      }}
    >
      <Input
        name="byok-monthly-limit"
        label="Monthly spend limit (USD)"
        inputMode="decimal"
        placeholder="No limit"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        error={invalid ? "Enter a positive amount, or leave blank." : undefined}
      />
      <p className="text-xs text-[var(--color-ink-subtle)]">
        Construct stops using your keys once estimated spend passes this. Leave
        blank for no limit.
      </p>
      <Button type="submit" size="sm" busy={busy} disabled={invalid}>
        Save limit
      </Button>
    </form>
  );
}
