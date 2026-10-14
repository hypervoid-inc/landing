import { MASCOT_LAYERS, mascotLayerSrc, type MascotLayer } from "../content/mascot-layers";

/**
 * The glass mascot as markup, built from the agent-avatar layers so it can
 * blink, look at the pointer, smile and squash. Sized by its parent: it
 * fills a square box. The face swaps between open, happy and asleep.
 */
export type Face = "open" | "happy" | "asleep";

function layer(name: MascotLayer, className = ""): string {
  const r = MASCOT_LAYERS[name];
  return `<img alt="" draggable="false" class="m-layer ${className}" src="${mascotLayerSrc(name)}" style="left:${r.x * 100}%;top:${r.y * 100}%;width:${r.w * 100}%;height:${r.h * 100}%">`;
}

function faceMarkup(face: Face): string {
  if (face === "happy") return layer("sockets-happy") + layer("eyes-happy");
  return `${layer("sockets")}<span class="m-eyes" data-face="${face}">${layer("eyes")}</span>`;
}

export function mascotMarkup(face: Face = "open", extra = ""): string {
  return `<div class="m" aria-hidden="true"><div class="m-shadow"></div><div class="m-bob"><div class="m-squash">${layer("body-construct")}${layer("gloss")}<span class="m-face">${faceMarkup(face)}</span>${extra}</div></div></div>`;
}

export function setFace(root: Element | null, face: Face): void {
  const slot = root?.querySelector(".m-face");
  if (slot) slot.innerHTML = faceMarkup(face);
}

/** A quick squash and stretch, the mascot's way of reacting. */
export function squash(root: Element | null): void {
  const s = root?.querySelector(".m-squash");
  s?.animate(
    [
      { transform: "scale(1,1)" },
      { transform: "scale(1.16,.82)", offset: 0.3 },
      { transform: "scale(.94,1.07)", offset: 0.62 },
      { transform: "scale(1,1)" },
    ],
    { duration: 520, easing: "cubic-bezier(.23,1,.32,1)" },
  );
}

/** Eyes follow the pointer within a few percent, the way a pet tracks you. */
export function trackPointer(stage: HTMLElement, mascot: HTMLElement): () => void {
  const onMove = (event: PointerEvent) => {
    const r = mascot.getBoundingClientRect();
    const dx = Math.max(-1, Math.min(1, (event.clientX - (r.left + r.width / 2)) / (r.width * 2.2)));
    const dy = Math.max(-1, Math.min(1, (event.clientY - (r.top + r.height * 0.55)) / (r.height * 2.2)));
    mascot.style.setProperty("--lx", `${(dx * 5).toFixed(2)}%`);
    mascot.style.setProperty("--ly", `${(dy * 4).toFixed(2)}%`);
  };
  stage.addEventListener("pointermove", onMove);
  return () => stage.removeEventListener("pointermove", onMove);
}
