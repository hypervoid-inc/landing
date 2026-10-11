import type { CSSProperties } from "react";

import "./faq-demos.css";

const STEPS = 30;

/** A run that dies at step 30, then a next run that keeps the 29 and resumes. */
function ResumeDemo() {
  const row = (run: "first" | "next") => (
    <div className="faq-run" data-run={run}>
      <span className="faq-run-label">
        {run === "first" ? "Run 1" : "Run 2"}
      </span>
      <span className="faq-run-steps">
        {Array.from({ length: STEPS }, (_, index) => (
          <span
            key={index}
            className="faq-step"
            data-last={index === STEPS - 1 ? "" : undefined}
            style={{ "--i": index } as CSSProperties}
          />
        ))}
      </span>
      <span className="faq-run-note">
        {run === "first" ? "Failed at step 30" : "Kept 29, finished 30"}
      </span>
    </div>
  );
  return (
    <div className="faq-demo" aria-hidden>
      {row("first")}
      {row("next")}
    </div>
  );
}

const LOG = [
  ["09:30", "Read 42 emails", "Gmail"],
  ["09:31", "Saved summary.md", "Files"],
  ["09:31", "Asked: archive the newsletters?", "You"],
  ["09:33", "You said yes, archived 14", "Gmail"],
] as const;

/** A few lines of Activity: what it did, where, and when. */
function ActivityDemo() {
  return (
    <ol className="faq-demo faq-log" aria-hidden>
      {LOG.map(([time, what, where], index) => (
        <li key={what} style={{ "--i": index } as CSSProperties}>
          <time>{time}</time>
          <span>{what}</span>
          <span className="faq-log-tag" data-who={where}>
            {where}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** The small picture that plays under an FAQ answer when it opens. */
export function FaqDemo({ demo }: { demo: "resume" | "activity" }) {
  return demo === "resume" ? <ResumeDemo /> : <ActivityDemo />;
}
