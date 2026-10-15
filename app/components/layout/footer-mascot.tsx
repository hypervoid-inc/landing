import { useEffect, useRef, useState } from "react";

import {
  mascotLayerSrc,
  mascotLayerStyle,
  type MascotLayer,
} from "../../features/content/mascot-layers";
import { StartLink } from "../../features/landing/beta-access";
import "./footer-mascot.css";

/** How long the reader has to look at the footer before it wakes. */
const WAKE_DELAY_MS = 450;

function Layer({ name, flip }: { name: MascotLayer; flip?: boolean }) {
  return (
    <img
      src={mascotLayerSrc(name)}
      alt=""
      draggable={false}
      style={{
        ...mascotLayerStyle(name),
        ...(flip ? { transform: "scaleY(-1)" } : null),
      }}
    />
  );
}

/**
 * The mascot asleep on the footer's top edge, eyes shut and snoring, who
 * wakes up with a hop when the reader gets there and offers to do the rest.
 * Poking it hops it again. It wakes once per page; the tap target and the
 * button carry the meaning, the figure itself is decorative.
 */
export function FooterMascot() {
  const ref = useRef<HTMLDivElement>(null);
  const [awake, setAwake] = useState(false);
  const [hops, setHops] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node || awake) return;
    let timer = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        window.clearTimeout(timer);
        if (entry?.isIntersecting) {
          timer = window.setTimeout(() => setAwake(true), WAKE_DELAY_MS);
        }
      },
      { rootMargin: "0px 0px -15% 0px" },
    );
    observer.observe(node);
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [awake]);

  return (
    <div ref={ref} className="footer-mascot-shelf page-rail mx-auto w-full">
      <div className="footer-mascot" data-awake={awake ? "true" : "false"}>
        <button
          type="button"
          className="footer-mascot-figure"
          aria-label={awake ? "Say hi to Construct" : "Wake Construct up"}
          onClick={() => {
            setAwake(true);
            setHops((count) => count + 1);
          }}
        >
          <span key={hops} className="footer-mascot-body" data-hop={hops > 0}>
            <Layer name="body-construct" />
            <Layer name="gloss" />
            {awake ? (
              <span className="footer-mascot-eyes">
                <Layer name="sockets" />
                <Layer name="eyes" />
              </span>
            ) : (
              <>
                <Layer name="sockets-happy" flip />
                <Layer name="eyes-happy" flip />
              </>
            )}
          </span>
          {!awake ? (
            <span className="footer-mascot-snore" aria-hidden>
              <span>z</span>
              <span>z</span>
              <span>z</span>
            </span>
          ) : null}
        </button>
        {awake ? (
          <div className="footer-mascot-bubble" role="status">
            <p>
              <span className="footer-mascot-lead">
                You read all the way down.{" "}
              </span>
              Want me to do the rest?
            </p>
            <StartLink source="footer-mascot" className="footer-mascot-cta">
              Start now
            </StartLink>
          </div>
        ) : null}
      </div>
    </div>
  );
}
