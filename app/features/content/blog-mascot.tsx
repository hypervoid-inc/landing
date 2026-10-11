import { useEffect, useRef, useState } from "react";

import { usePrefersReducedMotion } from "../landing/media";
import {
  mascotLayerSrc,
  mascotLayerStyle,
  type MascotLayer,
} from "./mascot-layers";
import "./blog-mascot.css";

/** The eyes' resting centre, and how far they may wander, as box fractions. */
const PIVOT = { x: 0.5, y: 0.59 };
const REACH = { x: 0.045, y: 0.03 };
/** Pointer distance, in px, at which the eyes are fully turned. */
const FULL_TURN_PX = 360;

function Layer({ name }: { name: MascotLayer }) {
  return (
    <img
      src={mascotLayerSrc(name)}
      alt=""
      draggable={false}
      className="blog-mascot-layer"
      style={mascotLayerStyle(name)}
    />
  );
}

/**
 * The mascot peeking over the top edge of the blog's lead post: it rises
 * into view, blinks now and then, follows the pointer with its eyes, smiles
 * while the lead post is hovered, and hops when poked.
 *
 * Purely decorative and `aria-hidden`. With reduced motion it simply sits
 * there, eyes forward, with no rise, blink, gaze or hop.
 *
 * `face` draws only the eyes, to bring a mascot already in the art to life
 * (the hero video's, whose own eyes are painted out): no body, so no breath
 * or hop either, which would pull the eyes off it.
 */
export function PeekingMascot({
  happy,
  className = "",
  rise = true,
  face = false,
  onPoke,
}: {
  happy: boolean;
  className?: string;
  /** Rise into view on mount; off where it already sits in place. */
  rise?: boolean;
  face?: boolean;
  onPoke?: () => void;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const [hops, setHops] = useState(0);

  useEffect(() => {
    if (reducedMotion) return;
    const node = ref.current;
    if (!node) return;
    let frame = 0;
    let target = { x: 0, y: 0 };
    const apply = () => {
      frame = 0;
      node.style.setProperty("--gaze-x", target.x.toFixed(3));
      node.style.setProperty("--gaze-y", target.y.toFixed(3));
    };
    const onMove = (event: PointerEvent) => {
      const box = node.getBoundingClientRect();
      const dx = event.clientX - (box.left + box.width * PIVOT.x);
      const dy = event.clientY - (box.top + box.height * PIVOT.y);
      const distance = Math.hypot(dx, dy) || 1;
      const strength = Math.min(1, distance / FULL_TURN_PX);
      target = {
        x: (dx / distance) * strength * REACH.x * 100,
        y: (dy / distance) * strength * REACH.y * 100,
      };
      if (!frame) frame = requestAnimationFrame(apply);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
    };
  }, [reducedMotion]);

  return (
    <span
      ref={ref}
      aria-hidden
      className={`blog-mascot ${className}`}
      data-happy={happy ? "true" : "false"}
      data-motion={reducedMotion ? "off" : "on"}
      data-rise={rise ? "true" : "false"}
      data-face={face ? "true" : undefined}
      onPointerDown={() => {
        setHops((count) => count + 1);
        onPoke?.();
      }}
    >
      <span
        key={hops}
        className="blog-mascot-body"
        data-hop={hops > 0 && !face ? "true" : "false"}
      >
        {face ? null : (
          <>
            <Layer name="body-construct" />
            <Layer name="gloss" />
          </>
        )}
        <span className="blog-mascot-face">
          <span className="blog-mascot-open">
            <Layer name="sockets" />
            <span className="blog-mascot-blink">
              <Layer name="eyes" />
            </span>
          </span>
          <span className="blog-mascot-smile">
            <Layer name="sockets-happy" />
            <Layer name="eyes-happy" />
          </span>
        </span>
      </span>
    </span>
  );
}
