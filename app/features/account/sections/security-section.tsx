import { useState } from "react";

import {
  Button,
  Card,
  CardHeader,
  ErrorState,
  Input,
  Row,
  Skeleton,
} from "../../../components/ui/primitives";
import { resolveSessionDevice } from "../../../domain/session-device";
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

  return (
    <Card index={index}>
      <CardHeader title="Security" />

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

        {sessions.state === "loading" ? (
          <div className="mt-3 space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
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
          <div className="mt-1">
            {active.map((session) => {
              const device = resolveSessionDevice(session);
              return (
                <Row
                  key={session.id}
                  label={device.label}
                  hint={`${session.ip ?? "unknown IP"} · active ${relativeTime(session.lastSeenAt)}`}
                >
                  {session.isCurrent ? (
                    <span className="text-xs font-medium text-[var(--color-brand-strong)]">
                      This device
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      busy={isPending(`revoke-${session.id}`)}
                      onClick={() => onRevokeSession(session.id)}
                    >
                      Sign out
                    </Button>
                  )}
                </Row>
              );
            })}
          </div>
        )}

        <Button variant="secondary" className="mt-4" onClick={onLogout}>
          Log out of this device
        </Button>
      </div>
    </Card>
  );
}
