import type { EmbedMood } from "../../../shared/embed-schema";
import {
  mascotLayerSrc,
  mascotLayerStyle,
  type MascotLayer,
} from "../content/mascot-layers";

function Layer({ name }: { name: MascotLayer }) {
  return (
    <img
      src={mascotLayerSrc(name)}
      alt=""
      draggable={false}
      className="embed-mascot-layer"
      style={mascotLayerStyle(name)}
    />
  );
}

/**
 * The demo's agent: the mascot, smiling when it is pleased with itself,
 * looking up while it thinks, and in a hard hat while it works on the
 * desktop. Decorative; the speech bubble beside it carries the words.
 */
export function EmbedMascot({
  mood,
  working,
  className = "",
}: {
  mood: EmbedMood;
  working: boolean;
  className?: string;
}) {
  const happy = mood === "happy" && !working;
  return (
    <span
      aria-hidden
      className={`embed-mascot ${className}`}
      data-mood={mood}
      data-working={working ? "true" : "false"}
    >
      <span className="embed-mascot-body">
        <Layer name="body-construct" />
        <Layer name="gloss" />
        <span className="embed-mascot-face">
          {happy ? (
            <>
              <Layer name="sockets-happy" />
              <Layer name="eyes-happy" />
            </>
          ) : (
            <>
              <Layer name="sockets" />
              <span className="embed-mascot-blink">
                <Layer name="eyes" />
              </span>
            </>
          )}
        </span>
        {working ? <Layer name="hard-hat" /> : null}
      </span>
    </span>
  );
}
