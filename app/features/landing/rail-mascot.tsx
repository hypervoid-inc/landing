import { Clock01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import {
  mascotLayerSrc,
  mascotLayerStyle,
  type MascotLayer,
} from "../content/mascot-layers";

/**
 * What the mascot riding the capability timeline wears for each section,
 * from the product's own avatar wardrobe.
 */
const OUTFITS: Record<string, readonly MascotLayer[]> = {
  workflows: ["safety-goggles"],
  "internal-tools": ["hard-hat"],
  scheduling: ["suit-navy-black-tie"],
  "team-workspaces": ["hoodie-navy"],
  memory: ["round-glasses-gold"],
  research: ["lab-coat", "round-glasses-black"],
  channels: ["headset-mic"],
};

/** Clothing sits under the face; hats, glasses and headsets over it. */
const OVER_FACE: ReadonlySet<MascotLayer> = new Set([
  "hard-hat",
  "safety-goggles",
  "round-glasses-black",
  "round-glasses-gold",
  "headset-mic",
]);

function Layer({ name }: { name: MascotLayer }) {
  return (
    <img
      src={mascotLayerSrc(name)}
      alt=""
      draggable={false}
      style={mascotLayerStyle(name)}
    />
  );
}

/**
 * The timeline's progress marker: the mascot, dressed for whichever
 * capability is on screen. It changes outfit with a small hop as the section
 * changes, and blinks now and then. Decorative; the tabs carry the names.
 *
 * Two sections need more than clothes to read at this size: scheduling gets
 * a clock badge, and the team workspace a teammate standing beside it.
 */
export function RailMascot({ demoId }: { demoId: string }) {
  const outfit = OUTFITS[demoId] ?? [];
  const under = outfit.filter((item) => !OVER_FACE.has(item));
  const over = outfit.filter((item) => OVER_FACE.has(item));
  return (
    <span className="rail-mascot" aria-hidden>
      <span key={demoId} className="rail-mascot-figure">
        <Layer name="body-construct" />
        <Layer name="gloss" />
        {under.map((item) => (
          <Layer key={item} name={item} />
        ))}
        <span className="rail-mascot-blink">
          <Layer name="sockets" />
          <Layer name="eyes" />
        </span>
        {over.map((item) => (
          <Layer key={item} name={item} />
        ))}
        {demoId === "scheduling" ? (
          <span className="rail-mascot-clock">
            <HugeiconsIcon icon={Clock01Icon} strokeWidth={2.4} />
          </span>
        ) : null}
      </span>
      {demoId === "team-workspaces" ? (
        <span className="rail-mascot-teammate">
          <Layer name="body-mint" />
          <Layer name="gloss" />
          <span className="rail-mascot-blink">
            <Layer name="sockets" />
            <Layer name="eyes" />
          </span>
        </span>
      ) : null}
    </span>
  );
}
