import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";

import {
  Badge,
  Button,
  CollapsibleCard,
  ErrorState,
  Input,
  Skeleton,
} from "../../../components/ui/primitives";
import {
  resolveSessionDevice,
  SURFACE_LABEL,
} from "../../../domain/session-device";
import type { AuthSession } from "../../../platform/api/schemas";
import { relativeTime } from "../account-format";
import type { Resource } from "../use-account-data";

export function SecuritySection({
  index,
  hasPassword,
  sessions,
  onSetPassword,
  onRevokeSession,
  onLogout,
  isPending,
  onRetry,
}: {
  index: number;
  hasPassword: Resource<boolean>;
  sessions: Resource<AuthSession[]>;
  onSetPassword: (input: {
    currentPassword?: string;
    password: string;
    passwordConfirm: string;
  }) => void;
  onRevokeSession: (id: string) => void;
  onLogout: () => void;
  isPending: (key: string) => boolean;
  onRetry: () => void;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  const mismatch = confirm.length > 0 && next !== confirm;
  const active =
    sessions.state === "ready"
      ? sessions.data.filter((session) => !session.revokedAt)
      : [];
  const summary =
    sessions.state === "ready"
      ? `${active.length} active session${active.length === 1 ? "" : "s"}`
      : sessions.state === "error"
        ? "Couldn't load sessions"
        : undefined;

  return (
    <CollapsibleCard
      index={index}
      title="Security"
      summary={summary}
      defaultOpen={false}
    >
      {hasPassword.state === "error" ? (
        // Never silently assume "no password": that drops the current-password
        // field and turns a change into an unverified set.
        <ErrorState
          message="Couldn't check your password status."
          onRetry={hasPassword.retryable ? onRetry : undefined}
        />
      ) : hasPassword.state === "loading" ? (
        <div className="mt-4 space-y-3">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      ) : (
        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (mismatch) return;
            onSetPassword({
              currentPassword: hasPassword.data ? current : undefined,
              password: next,
              passwordConfirm: confirm,
            });
            setCurrent("");
            setNext("");
            setConfirm("");
          }}
        >
          <h3 className="text-sm font-semibold text-[var(--color-ink)]">
            {hasPassword.data ? "Change password" : "Set a password"}
          </h3>

          {hasPassword.data ? (
            <Input
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              placeholder="Current password"
              value={current}
              onChange={(event) => setCurrent(event.target.value)}
              required
            />
          ) : null}

          <Input
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={12}
            placeholder="New password (12+ characters)"
            value={next}
            onChange={(event) => setNext(event.target.value)}
            required
          />
          <Input
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={12}
            placeholder="Confirm new password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            error={mismatch ? "Passwords don't match." : undefined}
            required
          />

          <Button
            type="submit"
            variant="primary"
            busy={isPending("password")}
            disabled={mismatch}
          >
            {hasPassword.data ? "Update password" : "Set password"}
          </Button>
        </form>
      )}

      <div className="mt-6 border-t border-[var(--color-line-soft)] pt-5">
        <h3 className="text-sm font-semibold text-[var(--color-ink)]">
          Active sessions
        </h3>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          See where your account is signed in and sign out devices you do not
          recognize.
        </p>

        {sessions.state === "loading" ? (
          <div className="mt-3 space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : sessions.state === "error" ? (
          <ErrorState
            message="Couldn't load your sessions."
            onRetry={sessions.retryable ? onRetry : undefined}
          />
        ) : active.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--color-ink-muted)]">
            No other active sessions.
          </p>
        ) : (
          <div className="mt-3 overflow-hidden rounded-[var(--radius-control)] border border-[var(--color-line-soft)]">
            {active.map((session) => (
              <SessionRow
                key={session.id}
                session={session}
                busy={isPending(`revoke-${session.id}`)}
                onRevoke={() => onRevokeSession(session.id)}
              />
            ))}
          </div>
        )}

        <Button variant="secondary" className="mt-4" onClick={onLogout}>
          Log out of this device
        </Button>
      </div>
    </CollapsibleCard>
  );
}

function SessionRow({
  session,
  busy,
  onRevoke,
}: {
  session: AuthSession;
  busy: boolean;
  onRevoke: () => void;
}) {
  const device = resolveSessionDevice(session);
  const surface = SURFACE_LABEL[session.surface] ?? "Web";

  return (
    <div className="group/session flex items-start gap-3 border-b border-[var(--color-line-soft)] px-3 py-3 last:border-b-0">
      <div className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-[0.85rem] border border-[var(--color-line-soft)] bg-[var(--color-brand-tint)] text-[var(--color-brand-strong)]">
        <HugeiconsIcon
          icon={device.icon}
          size={26}
          strokeWidth={1.6}
          aria-hidden
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium text-[var(--color-ink)]">
            {device.label}
          </p>
          {session.isCurrent ? (
            <Badge tone="positive">This device</Badge>
          ) : null}
        </div>
        <p className="mt-1 flex min-h-[18px] max-w-full items-center gap-1 overflow-hidden text-xs text-[var(--color-ink-muted)]">
          <span className="shrink-0">{surface}</span>
          {session.ip ? (
            <>
              <span className="shrink-0 text-[var(--color-ink-subtle)]">·</span>
              <span className="min-w-0 truncate opacity-0 transition-opacity duration-[var(--dur-hover)] group-hover/session:opacity-100 group-focus-within/session:opacity-100">
                {session.ip}
              </span>
            </>
          ) : null}
        </p>
        <p className="mt-0.5 text-[11px] text-[var(--color-ink-subtle)]">
          Last active {relativeTime(session.lastSeenAt)}
        </p>
      </div>
      <div className="shrink-0 self-center">
        {session.isCurrent ? null : (
          <Button size="sm" variant="ghost" busy={busy} onClick={onRevoke}>
            Sign out
          </Button>
        )}
      </div>
    </div>
  );
}
