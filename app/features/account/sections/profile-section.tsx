import { useState } from "react";

import {
  Button,
  Card,
  CardHeader,
  Input,
  Row,
} from "../../../components/ui/primitives";
import { Select } from "../../../components/ui/select";
import { browserTimezone, timezoneSelectOptions } from "../../../domain/timezone";
import type { AuthUser, WorkspaceSummary } from "../../../platform/api/schemas";

/**
 * Editable profile, matching the OS's account section. The previous landing
 * page rendered name and email as a read-only <dl> and never surfaced the
 * avatar or timezone at all, despite fetching both.
 */
export function ProfileSection({
  index,
  user,
  workspaces,
  activeWorkspaceId,
  onSave,
  onSwitchWorkspace,
  saving,
  switching,
}: {
  index: number;
  user: AuthUser;
  workspaces: WorkspaceSummary[];
  activeWorkspaceId: string | null;
  onSave: (input: { displayName: string; timezone: string }) => void;
  onSwitchWorkspace: (id: string) => void;
  saving: boolean;
  switching: boolean;
}) {
  // Seeded from props once. The caller keys this component on user.id, so a
  // different signed-in user (focus revalidation, workspace switch) remounts it
  // with fresh values instead of syncing props into state via an effect.
  const [displayName, setDisplayName] = useState(user.displayName ?? "");
  const [timezone, setTimezone] = useState(user.timezone ?? browserTimezone());

  const dirty =
    displayName.trim() !== (user.displayName ?? "").trim() ||
    timezone !== (user.timezone ?? browserTimezone());

  return (
    <Card index={index}>
      <CardHeader title="Profile" />

      <form
        className="mt-4 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSave({ displayName: displayName.trim(), timezone });
        }}
      >
        <Input
          name="displayName"
          label="Display name"
          maxLength={80}
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder={user.username}
        />

        <Select
          name="timezone"
          label="Timezone"
          value={timezone}
          options={timezoneSelectOptions(user.timezone)}
          onChange={(event) => setTimezone(event.target.value)}
        />

        <div className="border-t border-[var(--color-line-soft)] pt-3">
          <Row label="Email" hint="Contact support to change your email.">
            <span className="text-sm text-[var(--color-ink-muted)]">
              {user.email ?? "—"}
            </span>
          </Row>
        </div>

        <Button type="submit" variant="primary" busy={saving} disabled={!dirty}>
          Save changes
        </Button>
      </form>

      {workspaces.length > 0 ? (
        <div className="mt-5 border-t border-[var(--color-line-soft)] pt-5">
          <Select
            name="workspace"
            label="Active workspace"
            value={activeWorkspaceId ?? ""}
            disabled={switching || workspaces.length < 2}
            options={workspaces.map((workspace) => ({
              value: workspace.id,
              label: `${workspace.name} (${workspace.kind})`,
            }))}
            onChange={(event) => onSwitchWorkspace(event.target.value)}
          />
          {workspaces.length < 2 ? (
            <p className="mt-1 text-xs text-[var(--color-ink-subtle)]">
              Create a team workspace in the OS to switch between them.
            </p>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
