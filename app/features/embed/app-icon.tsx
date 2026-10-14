import { CalendarDays, ListChecks, Mail, NotebookPen } from "lucide-react";

import type { AppId } from "./world";

const ICONS: Record<AppId, typeof NotebookPen> = {
  notes: NotebookPen,
  calendar: CalendarDays,
  tasks: ListChecks,
  mail: Mail,
};

/** The glyph of one of the desktop's four apps, drawn in the current color. */
export function AppIcon({ app, size }: { app: AppId; size: number }) {
  const Icon = ICONS[app];
  return <Icon size={size} strokeWidth={2.2} aria-hidden />;
}
