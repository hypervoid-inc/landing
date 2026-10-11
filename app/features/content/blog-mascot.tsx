import { useEffect, useRef, useState } from "react";

import { usePrefersReducedMotion } from "../landing/media";
import "./blog.css";

/**
 * Where each layer of the mascot sits in its square, as fractions. Copied
 * from the agent-avatar catalog in the product repo
 * (`packages/agent-avatar/src/core/catalog.generated.ts`), whose 512px
 * layers live in `public/assets/construct/mascot/`.
 */
const LAYERS = {
  "body-construct": { x: 0.203125, y: 0.296875, w: 0.59375, h: 0.59375 },
  gloss: { x: 0.21875, y: 0.296875, w: 0.5625, h: 0.59375 },
  sockets: { x: 0.34375, y: 0.46875, w: 0.3125, h: 0.25 },
  eyes: { x: 0.359375, y: 0.484375, w: 0.28125, h: 0.203125 },
  "sockets-happy": { x: 0.328125, y: 0.5, w: 0.34375, h: 0.109375 },
  "eyes-happy": { x: 0.328125, y: 0.5, w: 0.34375, h: 0.109375 },
} as const;

type LayerKey = keyof typeof LAYERS;

/** The eyes' resting centre, and how far they may wander, as box fractions. */
const PIVOT = { x: 0.5, y: 0.59 };
const REACH = { x: 0.045, y: 0.03 };
/** Pointer distance, in px, at which the eyes are fully turned. */
const FULL_TURN_PX = 360;

function Layer({ name }: { name: LayerKey }) {
  const rect = LAYERS[name];
  return (
    <img
      src={`/assets/construct/mascot/${name}.webp`}
      alt=""
      draggable={false}
      className="blog-mascot-layer"
      style={{
        left: `${rect.x * 100}%`,
        top: `${rect.y * 100}%`,
        width: `${rect.w * 100}%`,
        height: `${rect.h * 100}%`,
      }}
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
 */
export function PeekingMascot({
  happy,
  className = "",
}: {
  happy: boolean;
  className?: string;
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
      onPointerDown={() => setHops((count) => count + 1)}
    >
      <span
        key={hops}
        className="blog-mascot-body"
        data-hop={hops > 0 ? "true" : "false"}
      >
        <Layer name="body-construct" />
        <Layer name="gloss" />
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
