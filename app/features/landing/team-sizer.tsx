import { useEffect, useId, useRef, useState } from "react";

import type { BillingPeriod } from "~/content/landing";
import { captureAnalytics } from "../analytics/analytics.client";
import type { PricingPlanView } from "./merge-pricing-catalog";
import { usePriceTicker } from "./price-ticker";
import "./team-sizer.css";

const MIN_PEOPLE = 1;
/** Pro's agent limit; past it a team talks to us about Enterprise. */
const MAX_PEOPLE = 15;

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
 * with more agents, never per person. The plan it shows is lit up in the
 * cards below (`onSuggest`).
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
  const [people, setPeople] = useState(3);
  const [touched, setTouched] = useState(false);
  const reported = useRef(false);

  const plan = planForTeam(plans, people);
  const planId = plan?.id ?? null;
  const price = usePriceTicker(
    plan ? (period === "annual" ? plan.annualMonthlyPrice : plan.price) : "$0",
  );

  useEffect(() => {
    onSuggest(touched ? planId : null);
  }, [touched, planId, onSuggest]);

  const change = (value: number) => {
    setPeople(value);
    setTouched(true);
    if (!reported.current) {
      reported.current = true;
      captureAnalytics("team_sizer_used", {});
    }
  };

  return (
    <div className="team-sizer reveal-item" data-reveal-delay="3">
      <div className="team-sizer-input">
        <label htmlFor={id} className="team-sizer-label">
          <span className="team-sizer-faces" aria-hidden>
            {Array.from({ length: MAX_PEOPLE }, (_, index) => (
              <img
                key={index}
                src="/assets/construct/mascot-eyes-static.webp"
                alt=""
                width="67"
                height="72"
                data-on={index < people ? "true" : "false"}
              />
            ))}
          </span>
          <span>
            Team of <output htmlFor={id}>{people}</output>
          </span>
        </label>
        <input
          id={id}
          type="range"
          min={MIN_PEOPLE}
          max={MAX_PEOPLE}
          step={1}
          value={people}
          aria-label="How many people are on your team"
          onChange={(event) => change(Number(event.target.value))}
          className="team-sizer-range"
          style={{
            ["--fill" as string]: `${((people - MIN_PEOPLE) / (MAX_PEOPLE - MIN_PEOPLE)) * 100}%`,
          }}
        />
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
