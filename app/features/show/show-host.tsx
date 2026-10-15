import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { embedSessionRequestSchema, type EmbedJob } from "../../../shared/embed-schema";
import { getTurnstileSiteKey } from "../../platform/env";
import { captureAnalytics } from "../analytics/analytics.client";
import { BOARD_H, BOARD_W, Stopped } from "./kit";
import { ERROR_COPY, claimOffer, isFramed, sourceFromLocation, startSession } from "./session-client";
import "./show.css";

const TURNSTILE_SITE_KEY =
  getTurnstileSiteKey() ?? (import.meta.env.DEV ? "1x00000000000000000000AA" : "");

export type ShowName = "night";

export type ShowEnv = {
  src: string;
  framed: boolean;
  /**
   * Where "Start tonight" goes: the site's homepage with the free month's
   * code and the post's tags, in a new tab. The site keeps the code for
   * checkout and welcomes the viewer with it (promo-welcome.tsx).
   */
  startUrl(code: string): string;
  /** Opens a session with the viewer's first name, in the background. */
  begin(name: string): void;
  /** Sends the email and returns the free month's code, or a message to show. */
  /** `job` is the show's first pick, which the email is written around. */
  claim(email: string, name: string, job?: EmbedJob): Promise<{ ok: true; code: string } | { ok: false; message: string }>;
  track(beat: string, extra?: Record<string, string | number | boolean>): void;
};

/**
 * Hosts a show: scales the 960 by 720 artboard to whatever box it is given
 * (a 516 px card in a post, a phone's whole screen, a desktop tab), keeps the
 * invisible Turnstile check ready, and talks to the existing embed functions
 * for the session and the email claim. The show itself is an imperative
 * script mounted into the artboard; React only owns this frame.
 */
export function ShowHost({
  show,
  mount,
  label,
}: {
  show: ShowName;
  label: string;
  mount: (board: HTMLElement, env: ShowEnv) => () => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const tokenRef = useRef("");
  const waitersRef = useRef<Array<(token: string) => void>>([]);
  const [scale, setScale] = useState(0);
  // The check runs quietly from the start. The card shows only when
  // Cloudflare wants a click AND the show is waiting on a token, so it never
  // covers the opening poster; it appears right after the viewer's name.
  const [needsClick, setNeedsClick] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const checking = needsClick && waiting;

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const fit = () => {
      const { width, height } = frame.getBoundingClientRect();
      setScale(Math.min(width / BOARD_W, height / BOARD_H));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const framed = isFramed();
    // The player card's `?src=` says which post or page the viewer came from.
    const src = sourceFromLocation(window.location.search);
    let session: Promise<string | null> | null = null;
    // Why the last session request failed, so the claim can say the real reason.
    let refused: string | null = null;

    // A token is single use. Rather than re-running the check the moment one
    // is spent, which inside X's frame often needs a click and puts the widget
    // back over the show, a fresh one is asked for only when it is needed.
    let spent = false;
    const turnstileToken = () =>
      new Promise<string>((resolve) => {
        if (tokenRef.current) return resolve(tokenRef.current);
        if (spent) {
          spent = false;
          turnstileRef.current?.reset();
        }
        setWaiting(true);
        const done = (token: string) => {
          setWaiting(false);
          resolve(token);
        };
        waitersRef.current.push(done);
        // A click can take a while; give the viewer time before giving up.
        window.setTimeout(() => done(tokenRef.current), 60000);
      });

    const open = (name: string) => {
      session = (async () => {
        const token = await turnstileToken();
        const parsed = embedSessionRequestSchema.safeParse({
          name: name.length >= 2 ? name : "Friend",
          src,
          turnstileToken: token || "missing",
        });
        if (!parsed.success) return null;
        const result = await startSession(parsed.data);
        tokenRef.current = "";
        spent = true;
        if (!result.ok) {
          refused = result.code;
          return null;
        }
        captureAnalytics("show_session_started", { show, src, framed });
        return result.token;
      })();
      return session;
    };

    const env: ShowEnv = {
      src,
      framed,
      startUrl: (code) =>
        `${window.location.origin}/?${new URLSearchParams({ promo: code, utm_source: "x", utm_medium: "player", utm_campaign: src })}`,
      begin: (name) => {
        if (!session) void open(name);
      },
      claim: async (email, name, job) => {
        captureAnalytics("show_email_submitted", { show, src, framed });
        let token = session ? await session : null;
        if (!token) token = await open(name);
        if (!token) return { ok: false, message: ERROR_COPY[refused ?? "verification_failed"] ?? ERROR_COPY.internal_error! };
        const result = await claimOffer({ token, email, ...(name.length >= 2 ? { name } : {}), ...(job ? { job } : {}) });
        if (!result.ok) return { ok: false, message: ERROR_COPY[result.code] ?? ERROR_COPY.internal_error! };
        captureAnalytics("show_code_revealed", { show, src, framed });
        return { ok: true, code: result.code };
      },
      track: (beat, extra) => captureAnalytics("show_beat", { show, src, framed, beat, ...extra }),
    };

    captureAnalytics("show_viewed", { show, src, framed });
    const stop = mount(board, env);
    const onError = (event: PromiseRejectionEvent) => {
      if (event.reason instanceof Stopped) event.preventDefault();
    };
    window.addEventListener("unhandledrejection", onError);
    return () => {
      window.removeEventListener("unhandledrejection", onError);
      stop();
    };
  }, [mount, show]);

  return (
    // Holding the screen is a gesture here, so the context menu stays out of the way.
    <main className="show-frame" ref={frameRef} aria-label={label} onContextMenu={(event) => event.preventDefault()}>
      <div
        className="show-board"
        ref={boardRef}
        style={{
          width: BOARD_W,
          height: BOARD_H,
          transform: `translate(-50%, -50%) scale(${scale || 0.0001})`,
          visibility: scale ? "visible" : "hidden",
          ["--s" as string]: String(scale || 1),
        }}
      />
      {TURNSTILE_SITE_KEY ? (
        <div className={`show-turnstile${checking ? " on" : ""}`} aria-hidden={!checking}>
          <p className="show-turnstile-label">One quick check before we go on</p>
          <Turnstile
            ref={turnstileRef}
            siteKey={TURNSTILE_SITE_KEY}
            options={{ action: "beta_signup", theme: "light", size: "normal", appearance: "interaction-only" }}
            onBeforeInteractive={() => setNeedsClick(true)}
            onAfterInteractive={() => setNeedsClick(false)}
            onError={() => setNeedsClick(false)}
            onSuccess={(token) => {
              setNeedsClick(false);
              tokenRef.current = token;
              waitersRef.current.splice(0).forEach((resolve) => resolve(token));
            }}
            onExpire={() => {
              tokenRef.current = "";
            }}
          />
        </div>
      ) : null}
    </main>
  );
}
