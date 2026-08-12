import canvasConfetti from "canvas-confetti";

import { PH_CONFETTI_SESSION_KEY } from "./config";

const PH_COLORS = ["#FF6154", "#FFFFFF", "#FF8A7A", "#FFE8E5"];

/**
 * One celebration burst for launch-day visitors. Session-scoped so SPA remounts
 * and multi-tab hard-refreshes in the same tab session do not spam.
 */
export function fireProductHuntConfetti(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (sessionStorage.getItem(PH_CONFETTI_SESSION_KEY) === "1") return false;
    sessionStorage.setItem(PH_CONFETTI_SESSION_KEY, "1");
  } catch {
    // Private mode / blocked storage — still fire once this call.
  }

  const fire = (originY: number, count: number) => {
    void canvasConfetti({
      particleCount: count,
      spread: 70,
      startVelocity: 38,
      origin: { x: 0.5, y: originY },
      colors: PH_COLORS,
      disableForReducedMotion: true,
    });
  };

  fire(0.15, 90);
  window.setTimeout(() => fire(0.2, 60), 180);
  window.setTimeout(() => fire(0.12, 45), 360);
  return true;
}
