import { Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Children, useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router";

import { captureAnalytics } from "../../features/analytics/analytics.client";
import { StartLink } from "../../features/landing/beta-access";
import { textOf } from "./sortable-table";
import "../../features/content/blog.css";

type Status = "idle" | "copied" | "taken" | "failed";

/**
 * A prompt the reader can paste into Construct, authorable in MDX as
 * `<Prompt>...</Prompt>` with ordinary Markdown inside.
 *
 * Two actions: copy it, or open Construct on it. "Try it" opens the app with
 * the prompt in its URL (`?prompt=`); the app shows it, lets the reader pick
 * the agent and edit it, and only runs it when they say so. A new reader
 * signs up first and the prompt goes with them.
 */
export function Prompt({
  children,
  label = "Prompt",
}: {
  children: ReactNode;
  label?: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  // From the content itself, so the link is in the prerendered page and the
  // copy matches it: one paragraph per block, as the reader sees it.
  const text = Children.toArray(children)
    .map((block) => textOf(block).trim())
    .filter(Boolean)
    .join("\n\n");
  const slug = useLocation().pathname.split("/").filter(Boolean).at(-1) ?? "";

  useEffect(() => {
    if (status !== "copied") return;
    const timer = window.setTimeout(() => setStatus("idle"), 2200);
    return () => window.clearTimeout(timer);
  }, [status]);

  const copy = async (action: "copy" | "try") => {
    captureAnalytics("blog_prompt_used", { slug, action });
    try {
      await navigator.clipboard.writeText(text);
      setStatus(action === "copy" ? "copied" : "taken");
    } catch {
      setStatus("failed");
    }
  };

  return (
    <figure className="prompt-block not-prose my-7 overflow-hidden rounded-2xl border border-[#cdeef2] shadow-[0_18px_40px_-30px_rgba(1,95,110,0.5)]">
      <figcaption className="flex items-center justify-between gap-3 border-b border-[#e3f3f5] px-4 py-2.5">
        <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#017b89]">
          <span
            aria-hidden
            className="h-1.5 w-1.5 rounded-full bg-[#01b4c8] shadow-[0_0_0_3px_rgba(1,180,200,0.18)]"
          />
          {label}
        </span>
        <span className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => void copy("copy")}
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium text-[#526b75] transition-colors hover:bg-[#effbfc] hover:text-[#017b89]"
          >
            <HugeiconsIcon
              icon={status === "copied" ? Tick02Icon : Copy01Icon}
              size={14}
              strokeWidth={1.8}
            />
            {status === "copied" ? "Copied" : "Copy"}
          </button>
          <StartLink
            source="blog_prompt"
            intent="start"
            prompt={text}
            onClick={() => void copy("try")}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#01b4c8] px-3 py-1 text-[12px] font-semibold text-white no-underline transition-colors hover:bg-[#018fa0]"
          >
            Try it in Construct
            <span aria-hidden>&rarr;</span>
          </StartLink>
        </span>
      </figcaption>
      <div className="px-5 pt-4 pb-1 text-[15px] leading-[1.7] text-[#4e4646] lg:text-[16px]">
        {children}
      </div>
      <p
        role="status"
        className={`px-5 text-[12px] text-[#017b89] transition-[padding] ${status === "taken" || status === "failed" ? "pb-3" : "h-0 overflow-hidden pb-0"}`}
      >
        {status === "taken" &&
          "Opening Construct with this prompt. It is also on your clipboard."}
        {status === "failed" &&
          "Your browser blocked copying. Select the text above and copy it."}
      </p>
    </figure>
  );
}
