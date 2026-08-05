import * as Dialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";

import { cn } from "../../lib/cn";
import { Button } from "./primitives";

/**
 * Confirmation for genuinely destructive, hard-to-reverse billing actions
 * (cancel, downgrade). The OS gates the same actions behind ConfirmDialog;
 * landing previously fired them straight from a single click.
 *
 * Used sparingly on purpose — confirming everything trains people to click
 * through, which defeats the point.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Never mind",
  destructive = false,
  busy = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        {/* Dim to focus: this is a modal task, so the background goes back. */}
        <Dialog.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-[rgba(37,72,82,0.32)]",
            "motion-safe:data-[state=open]:animate-[fade-in_180ms_var(--ease-snap)]",
          )}
        />
        <Dialog.Content
          className={cn(
            "fixed top-1/2 left-1/2 z-50 w-[min(26rem,calc(100vw-2rem))]",
            "-translate-x-1/2 -translate-y-1/2",
            "rounded-[var(--radius-card)] border border-[var(--color-line)]",
            "bg-white p-5 shadow-[var(--shadow-overlay)]",
            "motion-safe:data-[state=open]:animate-[dialog-in_var(--dur-panel)_var(--ease-snap)]",
          )}
        >
          <Dialog.Title className="font-geist text-base font-semibold text-[var(--color-ink)]">
            {title}
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-[var(--color-ink-muted)]">
            {description}
          </Dialog.Description>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="ghost" disabled={busy}>
                {cancelLabel}
              </Button>
            </Dialog.Close>
            <Button
              variant={destructive ? "danger" : "primary"}
              busy={busy}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
