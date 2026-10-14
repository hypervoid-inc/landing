import { X } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import { EMBED_MAX_MESSAGE_CHARS } from "../../../shared/embed-schema";
import { GREETING, SPOTLIGHT_COPY, type Job } from "./copy";
import { EmbedMascot } from "./mascot";
import { AppIcon } from "./app-icon";

/**
 * Spotlight: the palette Construct's computer opens to take a job. Type one
 * or pick a suggestion; Return assigns. The first time it opens it greets
 * the person; later it asks what is next.
 */
export function Spotlight({
  open,
  firstName,
  first,
  jobs,
  disabled,
  error,
  onAssign,
  onClose,
}: {
  open: boolean;
  firstName: string;
  first: boolean;
  jobs: readonly Job[];
  disabled: boolean;
  error: string;
  onAssign: (brief: string) => void;
  onClose: (() => void) | null;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => window.clearTimeout(timer);
  }, [open]);

  if (!open) return null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = text.trim();
    const brief = trimmed || jobs[0]?.brief || "";
    if (!brief) return;
    setText("");
    onAssign(brief);
  };

  const onKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape" && onClose) onClose();
  };

  return (
    <form className="embed-spotlight ph-no-capture" onSubmit={submit} data-first={first ? "true" : "false"}>
      <div className="embed-spotlight-row">
        <EmbedMascot mood="happy" working={false} className="embed-spotlight-mascot" />
        <label className="sr-only" htmlFor={inputId}>
          What should Construct do?
        </label>
        <input
          ref={inputRef}
          id={inputId}
          className="embed-spotlight-input"
          type="text"
          autoComplete="off"
          maxLength={EMBED_MAX_MESSAGE_CHARS}
          placeholder={first ? GREETING(firstName) : SPOTLIGHT_COPY.next}
          value={text}
          disabled={disabled}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKey}
        />
        {text.trim() ? (
          <button type="submit" className="embed-spotlight-assign" disabled={disabled}>
            {SPOTLIGHT_COPY.assign}
          </button>
        ) : (
          <span className="embed-spotlight-key">return</span>
        )}
        {onClose ? (
          <button type="button" className="embed-spotlight-close" aria-label={SPOTLIGHT_COPY.close} onClick={onClose}>
            <X size={13} strokeWidth={2.4} aria-hidden />
          </button>
        ) : null}
      </div>
      {error ? (
        <p className="embed-spotlight-error" role="alert">
          {error}
        </p>
      ) : null}
      {jobs.length ? (
        <div className="embed-spotlight-list">
          <p className="embed-spotlight-label">{SPOTLIGHT_COPY.suggested}</p>
          {jobs.map((job, index) => (
            <button
              key={job.label}
              type="button"
              className="embed-spotlight-job"
              data-lead={index === 0 && !text.trim() ? "true" : "false"}
              disabled={disabled}
              onClick={() => onAssign(job.brief)}
            >
              <span className="embed-spotlight-job-icon" data-app={job.app}>
                <AppIcon app={job.app} size={14} />
              </span>
              <span className="embed-spotlight-job-text">
                <span className="embed-spotlight-job-label">{job.label}</span>
                <span className="embed-spotlight-job-result">{job.result}</span>
              </span>
              {index === 0 && !text.trim() ? (
                <span className="embed-spotlight-job-hint">{SPOTLIGHT_COPY.assign}</span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </form>
  );
}
