/**
 * Shared window pointer bus for Product Hunt badge holography.
 * One listener drives every registered badge (foil + mild tilt).
 *
 * Autoplay is a continuous sine on θ:
 *   lightX ∝ sin(θ),  tiltY ∝ sin(θ)
 * θ only advances (never resets to the left edge), so L↔R turnarounds ease
 * through 0° with no hard cut between right-rotated and left-rotated.
 *
 * Light + tilt are both exponentially smoothed so pointer↔autoplay handoffs
 * stay glued together too.
 */

const MAX_TILT_DEG = 7;
/** Resume autoplay after the pointer stops moving. */
const IDLE_MS = 1400;
/** Seconds for one L→R half-cycle (full ping-pong is 2×). */
const SWEEP_HALF_S = 2.4;
/** Pose follow rate (1/s) for light + tilt. */
const FOLLOW = 18;

const badges = new Set<HTMLElement>();

let listening = false;
let raf = 0;
let lastNow = 0;
let idleTimer = 0;

let lastPointerX = 0;
let lastPointerY = 0;
let pointerSeen = false;
let pointerVelX = 0;

let currentLightX = 50;
let currentLightY = 45;
let targetLightX = 50;
let targetLightY = 45;

let currentTiltX = 0;
let currentTiltY = 0;
let targetTiltX = 0;
let targetTiltY = 0;

let poseReady = false;

let driving: "pointer" | "autoplay" = "autoplay";
/** Autoplay phase. sin(θ) drives both light and tilt — continuous forever. */
let autoplayTheta = -Math.PI / 2;

function holoAllowed(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return false;
  }
  if (window.matchMedia("(pointer: coarse)").matches) return false;
  return true;
}

/**
 * Sync θ to light progress + direction. sin(θ)=2p-1; pick branch by direction
 * so we resume mid-wave instead of teleporting.
 */
function thetaFromProgress(progress: number, goingRight: boolean): number {
  const s = Math.asin(Math.min(1, Math.max(-1, 2 * progress - 1)));
  return goingRight ? s : Math.PI - s;
}

function applyPose() {
  const root = document.documentElement;
  root.style.setProperty("--ph-holo-x", `${currentLightX}%`);
  root.style.setProperty("--ph-holo-y", `${currentLightY}%`);
  root.style.setProperty("--ph-holo-x-inv", `${100 - currentLightX}%`);
  root.style.setProperty("--ph-holo-y-inv", `${100 - currentLightY}%`);

  const fromCenter = Math.max(
    0,
    1 - Math.min(1, Math.hypot(currentTiltY, currentTiltX) / MAX_TILT_DEG),
  );

  for (const el of badges) {
    el.style.setProperty("--ph-tilt-x", `${currentTiltX.toFixed(2)}deg`);
    el.style.setProperty("--ph-tilt-y", `${currentTiltY.toFixed(2)}deg`);
    el.style.setProperty("--ph-pointer-from-center", fromCenter.toFixed(3));
  }
}

function ensurePose() {
  if (poseReady) return;
  currentLightX = targetLightX = 50;
  currentLightY = targetLightY = 45;
  currentTiltX = targetTiltX = 0;
  currentTiltY = targetTiltY = 0;
  poseReady = true;
}

function setPointerTargets(clientX: number, clientY: number) {
  const vw = Math.max(window.innerWidth, 1);
  const vh = Math.max(window.innerHeight, 1);
  targetLightX = (clientX / vw) * 100;
  targetLightY = (clientY / vh) * 100;

  const tiltRadiusX = vw / 2;
  const tiltRadiusY = vh / 2;

  let sumX = 0;
  let sumY = 0;
  let count = 0;
  for (const el of badges) {
    // offsetWidth/Height are untransformed — avoids tilt feeding back into nx.
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    if (w < 1 || h < 1) continue;
    const rect = el.getBoundingClientRect();
    // AABB center is close enough for pointer; autoplay does not use this path.
    sumX += rect.left + rect.width / 2;
    sumY += rect.top + rect.height / 2;
    count += 1;
  }
  const cx = count ? sumX / count : vw / 2;
  const cy = count ? sumY / count : vh / 2;

  const nx = Math.max(-1, Math.min(1, (clientX - cx) / tiltRadiusX));
  const ny = Math.max(-1, Math.min(1, (clientY - cy) / tiltRadiusY));
  targetTiltX = -ny * MAX_TILT_DEG;
  targetTiltY = nx * MAX_TILT_DEG;
}

function setAutoplayTargets(dt: number) {
  autoplayTheta += dt * (Math.PI / SWEEP_HALF_S);

  // Fold into a safe range without changing sin/cos (full-period wrap only).
  const twoPi = Math.PI * 2;
  if (autoplayTheta > twoPi * 4 || autoplayTheta < -twoPi) {
    autoplayTheta = ((autoplayTheta % twoPi) + twoPi) % twoPi;
  }

  const wave = Math.sin(autoplayTheta); // -1 … 1, smooth through both ends
  targetLightX = 50 + wave * 42;
  targetLightY = 44 + Math.cos(autoplayTheta) * 4;
  // Same wave as the light — turnaround eases tilt through 0°, never snaps ±max.
  targetTiltY = wave * MAX_TILT_DEG;
  targetTiltX = -Math.cos(autoplayTheta) * MAX_TILT_DEG * 0.2;
}

function startAutoplay() {
  ensurePose();
  driving = "autoplay";
  // Map live light X back onto the wave and keep traveling the same way.
  const progress = Math.min(1, Math.max(0, (currentLightX - 8) / 84));
  const goingRight =
    Math.abs(pointerVelX) > 0.4
      ? pointerVelX >= 0
      : Math.cos(autoplayTheta) >= 0;
  autoplayTheta = thetaFromProgress(progress, goingRight);
  if (!raf) raf = requestAnimationFrame(tick);
}

function scheduleIdleAutoplay() {
  window.clearTimeout(idleTimer);
  idleTimer = window.setTimeout(() => {
    idleTimer = 0;
    startAutoplay();
  }, IDLE_MS);
}

function tick(now: number) {
  if (!listening) {
    raf = 0;
    return;
  }

  ensurePose();
  const dt = lastNow ? Math.min(0.05, (now - lastNow) / 1000) : 0.016;
  lastNow = now;

  if (driving === "pointer" && pointerSeen) {
    setPointerTargets(lastPointerX, lastPointerY);
  } else {
    setAutoplayTargets(dt);
  }

  const alpha = 1 - Math.exp(-FOLLOW * dt);
  currentLightX += (targetLightX - currentLightX) * alpha;
  currentLightY += (targetLightY - currentLightY) * alpha;
  currentTiltX += (targetTiltX - currentTiltX) * alpha;
  currentTiltY += (targetTiltY - currentTiltY) * alpha;
  applyPose();

  raf = requestAnimationFrame(tick);
}

function onPointerMove(event: PointerEvent) {
  if (pointerSeen) {
    pointerVelX = event.clientX - lastPointerX;
  }
  lastPointerX = event.clientX;
  lastPointerY = event.clientY;
  pointerSeen = true;
  driving = "pointer";
  scheduleIdleAutoplay();
  if (!raf) {
    lastNow = 0;
    raf = requestAnimationFrame(tick);
  }
}

function startListening() {
  if (listening || !holoAllowed()) return;
  listening = true;
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  lastNow = 0;
  startAutoplay();
}

function stopListening() {
  if (!listening) return;
  listening = false;
  window.removeEventListener("pointermove", onPointerMove);
  window.clearTimeout(idleTimer);
  idleTimer = 0;
  if (raf) {
    cancelAnimationFrame(raf);
    raf = 0;
  }
  lastNow = 0;
  poseReady = false;
  pointerSeen = false;
  const root = document.documentElement;
  root.style.removeProperty("--ph-holo-x");
  root.style.removeProperty("--ph-holo-y");
  root.style.removeProperty("--ph-holo-x-inv");
  root.style.removeProperty("--ph-holo-y-inv");
}

/** Register a badge face element for global holo tracking. */
export function registerPhHoloBadge(el: HTMLElement): void {
  if (!holoAllowed()) return;
  badges.add(el);
  if (badges.size === 1) startListening();
}

/** Unregister; tears down the window listener when the last badge leaves. */
export function unregisterPhHoloBadge(el: HTMLElement): void {
  badges.delete(el);
  el.style.removeProperty("--ph-tilt-x");
  el.style.removeProperty("--ph-tilt-y");
  el.style.removeProperty("--ph-pointer-from-center");
  if (badges.size === 0) stopListening();
}
