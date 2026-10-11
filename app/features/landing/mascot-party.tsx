import canvasConfetti from "canvas-confetti";
import { useEffect, useState, type CSSProperties } from "react";

import { PeekingMascot } from "../content/blog-mascot";
import { trackToy } from "./track-toy";
import "./mascot-party.css";

const WORD = "construct";
const PARTY_MS = 3200;
const GUESTS = 7;

/**
 * The homepage's Easter egg: type "construct" anywhere outside a text field
 * and a row of happy mascots hops up from the bottom of the screen.
 */
export function MascotParty() {
  const [party, setParty] = useState(0);

  useEffect(() => {
    let typed = "";
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        target?.closest("input, textarea, select, [contenteditable]")
      ) {
        return;
      }
      if (event.key.length !== 1) return;
      typed = (typed + event.key.toLowerCase()).slice(-WORD.length);
      if (typed !== WORD) return;
      typed = "";
      setParty((count) => count + 1);
      trackToy("easter-egg");
      void canvasConfetti({
        particleCount: 120,
        spread: 100,
        startVelocity: 38,
        origin: { y: 0.95 },
        colors: ["#01b4c8", "#4cd8ff", "#9fe8f2", "#ffffff", "#f5c542"],
        disableForReducedMotion: true,
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!party) return;
    const timer = window.setTimeout(() => setParty(0), PARTY_MS);
    return () => window.clearTimeout(timer);
  }, [party]);

  if (!party) return null;
  return (
    <div key={party} className="mascot-party" aria-hidden>
      {Array.from({ length: GUESTS }, (_, index) => (
        <span
          key={index}
          className="mascot-party-guest"
          style={{ "--i": index } as CSSProperties}
        >
          <PeekingMascot happy rise={false} className="mascot-party-mascot" />
        </span>
      ))}
    </div>
  );
}
