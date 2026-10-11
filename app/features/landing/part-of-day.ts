import { useSyncExternalStore } from "react";

export type PartOfDay = "morning" | "afternoon" | "evening" | "night";

export function partOfDay(hour: number): PartOfDay {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

/**
 * The reader's part of the day, after hydration; `null` while prerendered,
 * so the server copy stays as written.
 */
export function usePartOfDay(): PartOfDay | null {
  return useSyncExternalStore(
    (onChange) => {
      const timer = window.setInterval(onChange, 60_000);
      return () => window.clearInterval(timer);
    },
    () => partOfDay(new Date().getHours()),
    () => null,
  );
}
