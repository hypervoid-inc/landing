import { useEffect, useId, useRef, useState, type CSSProperties } from "react";

import type { BillingPeriod } from "~/content/landing";
import { captureAnalytics } from "../analytics/analytics.client";
import { mascotLayerSrc, mascotLayerStyle } from "../content/mascot-layers";
import type { PricingPlanView } from "./merge-pricing-catalog";
import { usePriceTicker } from "./price-ticker";
import {
  LOOK_LAYERS,
  lookLayers,
  randomLook,
  STARTING_LOOKS,
  type TeamLook,
} from "./team-looks";
import "./team-sizer.css";

/**
 * Fetch every layer a teammate can wear the first time the slider is
 * touched (36 small files), so a new arrival pops in fully drawn rather
 * than finishing its animation before its images land.
 */
let looksPreloaded = false;
function preloadLooks() {
  if (looksPreloaded) return;
  looksPreloaded = true;
  for (const name of LOOK_LAYERS) {
    new Image().src = mascotLayerSrc(name, 128);
  }
}

const MIN_PEOPLE = 1;
/** Pro's agent limit; past it a team talks to us about Enterprise. */
const MAX_PEOPLE = 15;
/**
 * The team the slider starts on, and so the plan the cards recommend before
 * anyone touches it (three people fit Starter).
 */
export const STARTING_TEAM = STARTING_LOOKS.length;

/**
 * The plan for a team, assuming one agent each. Construct has no per-seat
 * price, so people never move the bill; what a bigger team runs out of is
 * agents, and the smallest plan with room for everyone's is the fit.
 */
export function planForTeam<T extends { agents: number }>(
  plans: readonly T[],
  people: number,
): T | undefined {
  const byRoom = [...plans].sort((a, b) => a.agents - b.agents);
  return byRoom.find((plan) => plan.agents >= people) ?? byRoom.at(-1);
}

/**
 * "Team of N": a one-line strip under the pricing toggle. Drag it and the
 * crowd of mascots grows; the price only moves when the team needs a plan
 * with more agents, never per person. The plan it shows is the one the cards
 * below recommend, from the first render on (`onSuggest`).
 */
export function TeamSizer({
  plans,
  period,
  onSuggest,
}: {
  plans: readonly PricingPlanView[];
  period: BillingPeriod;
  onSuggest: (planId: string | null) => void;
}) {
  const id = useId();
  const [people, setPeople] = useState(STARTING_TEAM);
  // Every teammate who joins gets a fresh random look; the first three are
  // fixed so the prerendered page and the browser agree. `seen` loads a
  // seat's look only once someone has sat there, and keeps it while they go.
  const [looks, setLooks] = useState<readonly TeamLook[]>(() =>
    Array.from(
      { length: MAX_PEOPLE },
      (_, index) => STARTING_LOOKS[index % STARTING_LOOKS.length]!,
    ),
  );
  const [seen, setSeen] = useState(STARTING_TEAM);
  const reported = useRef(false);

  const plan = planForTeam(plans, people);
  const planId = plan?.id ?? null;
  const price = usePriceTicker(
    plan ? (period === "annual" ? plan.annualMonthlyPrice : plan.price) : "$0",
  );

  useEffect(() => {
    onSuggest(planId);
  }, [planId, onSuggest]);

  const change = (value: number) => {
    if (value > people) {
      setLooks((current) => {
        const next = [...current];
        for (let index = people; index < value; index += 1) {
          next[index] = randomLook(next[index - 1]?.tint ?? null);
        }
        return next;
      });
    }
    setSeen((count) => Math.max(count, value));
    setPeople(value);
    if (!reported.current) {
      reported.current = true;
      captureAnalytics("team_sizer_used", {});
    }
  };

  return (
    <div className="team-sizer reveal-item" data-reveal-delay="3">
      <div className="team-sizer-input">
        <label htmlFor={id} className="team-sizer-label">
          Team of <output htmlFor={id}>{people}</output>
        </label>
        {/* The crowd stands on the track, one seat per value: teammates on
            the seats up to the thumb, faint empty seats past it. Nothing
            here changes size as the slider moves. */}
        <div className="team-sizer-track">
          <span className="team-sizer-crowd" aria-hidden>
            {looks.map((look, index) => (
              <span
                key={index}
                className="team-face"
                data-on={index < people ? "true" : "false"}
                style={
                  {
                    "--seat": index / (MAX_PEOPLE - MIN_PEOPLE),
                    "--dy": `${look.nudge.y}px`,
                    "--tilt": `${look.nudge.tilt}deg`,
                  } as CSSProperties
                }
              >
                <img
                  className="team-face-seat"
                  src={mascotLayerSrc("body-construct", 128)}
                  alt=""
                  draggable={false}
                  style={mascotLayerStyle("body-construct")}
                />
                {/* Always there, so a first arrival animates in from its
                    resting state like every later one; the images wait for
                    someone to sit. */}
                <span className="team-face-look">
                  {index < seen
                    ? lookLayers(look).map((name) => (
                        <img
                          key={name}
                          src={mascotLayerSrc(name, 128)}
                          alt=""
                          draggable={false}
                          style={mascotLayerStyle(name)}
                        />
                      ))
                    : null}
                </span>
              </span>
            ))}
          </span>
          <input
            id={id}
            type="range"
            min={MIN_PEOPLE}
            max={MAX_PEOPLE}
            step={1}
            value={people}
            aria-label="How many people are on your team"
            onChange={(event) => change(Number(event.target.value))}
            onPointerDown={preloadLooks}
            onFocus={preloadLooks}
            className="team-sizer-range"
            style={{
              ["--fill" as string]: `${((people - MIN_PEOPLE) / (MAX_PEOPLE - MIN_PEOPLE)) * 100}%`,
            }}
          />
        </div>
      </div>

      <div className="team-sizer-result" aria-live="polite">
        <p className="team-sizer-price">
          <strong>
            {price}
            <span>/mo</span>
          </strong>
          <span>
            {people === 1 ? "for you" : `for all ${people}`} on{" "}
            {plan?.name ?? "Construct"}
          </span>
        </p>
        <p className="team-sizer-why">
          {people === 1 ? "Room for" : "One agent each, room for"}{" "}
          {plan?.agents} agents. No per-seat fees.
        </p>
      </div>
    </div>
  );
}
