import { crtMarkup, placeCrt } from "../show/crt";
import { EASE_OUT, EASE_SPRING, EMAIL_RE, Stopped, el, esc, firstName, localContext, tween, untilTap, wait } from "../show/kit";
import { mascotMarkup, squash } from "../show/mascot";
import type { ShowEnv } from "../show/show-host";
import "./episode.css";

/*
 * Episode 01: The Night Shift. The same night as Night Shift Live, told as
 * a manga in four acts (setup, development, twist, resolution). The viewer
 * names the episode and the founder, picks a line, flips the light switch
 * and answers the one question at dawn. The twist is that the agent stops,
 * and it turns out to be asking rather than stuck.
 */

const PICKS: Array<{ label: string; job: number }> = [
  { label: "The Acme invoice", job: 3 },
  { label: "Forty new leads", job: 1 },
  { label: "The pricing brief", job: 0 },
];

type Tip = { x: number; y: number };

/** A manga balloon: an ellipse with a tail that ends at `tip` (box pixels). */
function balloon(html: string, box: { x: number; y: number; w: number; h: number }, tip: Tip | null, extra = ""): string {
  const { w, h } = box;
  const cx = w / 2;
  const cy = h / 2;
  const rx = w / 2 - 3;
  const ry = h / 2 - 3;
  let tail = "";
  if (tip) {
    const a = Math.atan2((tip.y - cy) / ry, (tip.x - cx) / rx);
    const spread = 0.2;
    const p1 = [cx + (rx - 4) * Math.cos(a - spread), cy + (ry - 4) * Math.sin(a - spread)];
    const p2 = [cx + (rx - 4) * Math.cos(a + spread), cy + (ry - 4) * Math.sin(a + spread)];
    const f = (n: number) => n.toFixed(1);
    tail = `<path d="M${f(p1[0]!)} ${f(p1[1]!)} L${f(tip.x)} ${f(tip.y)} L${f(p2[0]!)} ${f(p2[1]!)} Z" fill="#fff"/><path d="M${f(p1[0]!)} ${f(p1[1]!)} L${f(tip.x)} ${f(tip.y)} L${f(p2[0]!)} ${f(p2[1]!)}" fill="none" stroke="#111" stroke-width="4" stroke-linejoin="round"/>`;
  }
  return `<div class="balloon ${extra}" style="left:${box.x}px;top:${box.y}px;width:${w}px;height:${h}px"><svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#fff" stroke="#111" stroke-width="4"/>${tail}</svg><div class="bt">${html}</div></div>`;
}

const founder = (style: string) => `<svg class="founder" style="${style}" viewBox="0 0 200 200" aria-hidden="true">
  <path d="M18 200 C 22 150 60 128 100 126 C 140 128 178 150 182 200 Z" fill="#111"/>
  <path d="M56 134 C 54 92 76 62 100 60 C 124 62 146 92 144 134 C 128 120 72 120 56 134 Z" fill="#111"/>
  <ellipse cx="100" cy="94" rx="31" ry="35" fill="#111"/>
  <path d="M68 84 L62 58 L80 70 L82 46 L96 64 L104 40 L112 62 L126 46 L128 70 L140 62 L132 90 Z" fill="#111"/>
  <path d="M71 100 C 69 78 80 64 96 61" stroke="#bfe4ff" stroke-width="3" fill="none" opacity=".85"/>
  <rect x="80" y="90" width="18" height="9" rx="3" fill="#cfeaff"/><rect x="103" y="90" width="18" height="9" rx="3" fill="#cfeaff"/>
  <path d="M98 94 L103 94" stroke="#cfeaff" stroke-width="2"/>
</svg>`;

const sweat = (style: string) =>
  `<svg style="position:absolute;${style}" viewBox="0 0 20 30" aria-hidden="true"><path d="M10 2 Q19 18 10 28 Q1 18 10 2Z" fill="#fff" stroke="#111" stroke-width="2.5"/></svg>`;

function skyline(): string {
  let s = '<svg class="skyline" viewBox="0 0 200 60" preserveAspectRatio="none" aria-hidden="true">';
  let x = 0;
  let seed = 11;
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  while (x < 200) {
    const bw = 8 + rnd() * 14;
    const bh = 18 + rnd() * 38;
    s += `<rect x="${x.toFixed(1)}" y="${(60 - bh).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" fill="#05070d"/>`;
    for (let yy = 60 - bh + 4; yy < 58; yy += 5)
      for (let xx = x + 2; xx < x + bw - 2; xx += 4) if (rnd() > 0.74) s += `<rect x="${xx.toFixed(1)}" y="${yy.toFixed(1)}" width="1.6" height="2" fill="#f6d23a"/>`;
    x += bw + 1;
  }
  return `${s}</svg>`;
}

const mbox = (style: string, face: "open" | "happy" = "open") => `<div class="mbox" style="${style}">${mascotMarkup(face)}</div>`;

export function mountEpisode(board: HTMLElement, env: ShowEnv): () => void {
  const ctl = new AbortController();
  const signal = ctl.signal;
  const here = localContext();
  let name = "";
  let pick = 0;
  const W = (ms: number) => wait(ms, signal);

  board.innerHTML = `<div class="ep"></div>`;
  // The empty bands around a non 4:3 frame match the page paper.
  const frame = board.closest<HTMLElement>(".show-frame");
  if (frame) frame.style.background = "#f4f1e8";
  const root = board.querySelector<HTMLElement>(".ep")!;
  const hintEl = el("div", "ep-hint", "");
  hintEl.hidden = true;
  root.appendChild(hintEl);
  const hint = (text: string) => {
    hintEl.textContent = text;
    hintEl.hidden = !text;
  };

  // Pages are built when they are reached, so names and picks are in them.
  let current: HTMLElement | null = null;
  const showPage = async (template: string, layout: string) => {
    const page = el("div", "ep-page", template);
    page.style.cssText = layout;
    root.insertBefore(page, hintEl);
    const prev = current;
    current = page;
    page.classList.add("on");
    if (prev) {
      void tween(prev, [{ transform: "none", opacity: 1 }, { transform: "translateX(-60px) rotate(-1.5deg)", opacity: 0 }], { duration: 420, easing: "cubic-bezier(.55,0,1,.45)" }, signal).then(() => prev.remove());
    }
    const panels = [...page.querySelectorAll<HTMLElement>(".pnl")];
    panels.forEach((p) => (p.style.opacity = "0"));
    await W(prev ? 160 : 0);
    await Promise.all(
      panels.map((p, i) =>
        tween(
          p,
          [
            { opacity: 0, transform: "scale(1.08) rotate(-1deg)" },
            { opacity: 1, transform: "none" },
          ],
          { duration: 460, delay: i * 210, easing: EASE_OUT },
          signal,
        ),
      ),
    );
    page.querySelectorAll<HTMLElement>(".balloon, .sfx, .cap, .stamp").forEach((b, i) =>
      b.animate(
        [
          { opacity: 0, transform: "scale(.6)" },
          { opacity: 1, transform: "none" },
        ],
        { duration: 380, delay: 60 + i * 90, easing: EASE_SPRING, fill: "backwards" },
      ),
    );
    return page;
  };
  // A tap that lands while panels are still coming in is kept, and turns
  // the page as soon as the page is ready, so the reader never taps twice.
  let queuedTap = false;
  let onTurn: (() => void) | null = null;
  root.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest("button, input, a")) return;
    if (onTurn) onTurn();
    else queuedTap = true;
  });
  /** Waits for a tap anywhere that isn't a control. Moves on by itself after `ms`. */
  const turn = (text = "Tap to turn the page", ms = 9000) =>
    new Promise<void>((resolve, reject) => {
      const done = () => {
        onTurn = null;
        window.clearTimeout(timer);
        hint("");
        resolve();
      };
      if (queuedTap) {
        queuedTap = false;
        resolve();
        return;
      }
      hint(text);
      onTurn = done;
      const timer = window.setTimeout(done, ms);
      signal.addEventListener("abort", () => {
        onTurn = null;
        window.clearTimeout(timer);
        reject(new Stopped());
      });
    });

  const run = async () => {
    await document.fonts.load('800 100px "Show Sora"').catch(() => undefined);

    // ── Cover: the viewer names the episode and the founder ─────────────
    const cover = await showPage(
      `<div class="pnl night"><div class="fill tone-l" style="opacity:.35"></div><div class="moon"></div>${skyline()}
        <div class="ep-title"><div class="no">EP.01</div><div class="name">The night<br>shift</div><div class="star"></div></div>
        <div class="sfx light" style="right:34px;top:180px;font-size:40px">チクタク<small>TICK TOCK</small></div>
        <div class="ep-form"><div class="lbl">What's tonight's episode about?</div><div class="chips">${PICKS.map((p, i) => `<button class="chip${i ? " alt" : ""}" type="button">${p.label}</button>`).join("")}</div></div></div>`,
      "grid-template:1fr/1fr",
    );
    const form = cover.querySelector<HTMLElement>(".ep-form")!;
    pick = await untilTap([...form.querySelectorAll(".chip")], signal);
    queuedTap = false;
    env.track("episode_pick", { pick: PICKS[pick]!.job });
    const titleEl = cover.querySelector<HTMLElement>(".name")!;
    titleEl.innerHTML = esc(PICKS[pick]!.label).replace(" ", "<br>");
    titleEl.animate([{ transform: "scale(1.5)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 460, easing: EASE_SPRING });
    form.innerHTML = `<div class="lbl">And who's starring?</div><div class="field"><input id="ep-name" maxlength="20" autocomplete="given-name" enterkeyhint="go" placeholder="Your first name" aria-label="Your first name"><button class="chip" type="button">Roll it</button></div>`;
    const input = form.querySelector<HTMLInputElement>("input")!;
    const typed = await new Promise<string>((resolve) => {
      const done = () => resolve(input.value);
      form.querySelector(".chip")!.addEventListener("click", done);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") done();
      });
      window.setTimeout(done, 15000);
    });
    name = firstName(typed);
    queuedTap = false;
    env.begin(name);
    cover.querySelector(".star")!.textContent = `Starring ${name || "you"}`;
    form.remove();
    await turn("Tap to start the episode");

    const who = name || "You";
    const city = esc(here.city);

    // ── Ki: the babysitting ─────────────────────────────────────────────
    await showPage(
      `<div class="pnl tone-l"><div class="cap" style="left:16px;top:16px">${city}, ${here.time}. The assistant has stopped halfway again.</div>
        <div class="laptop"><div class="lb">assistant</div><div class="msg">Sorry, I stopped halfway. Want me to try again?</div><div class="again">Try again</div><div class="again dim">Try again</div><div class="again dim">Try again</div></div></div>
      <div class="pnl" style="background:radial-gradient(ellipse at 40% 75%,#dbe8ff,#fff 62%)">${founder("left:8%;bottom:-4%;width:84%")}${sweat("left:70%;top:38%;width:34px")}
        ${balloon("Please just work.", { x: 150, y: 30, w: 250, h: 150 }, { x: 70, y: 210 })}
        <div class="sfx" style="left:18px;top:24px;font-size:52px">ゴゴゴ<small>RUMBLE</small></div></div>`,
      "grid-template:1fr/1.15fr 1fr",
    );
    await turn();

    // ── Sho: the drop ───────────────────────────────────────────────────
    const drop = await showPage(
      `<div class="pnl night"><div class="fill speed" style="filter:invert(1);opacity:.5"></div><div class="portal"></div>
        ${mbox("left:50%;top:50%;width:260px;height:260px;margin:-150px 0 0 -130px", "open")}
        <div class="sfx" style="left:34px;top:30px;font-size:150px;color:#f6d23a">ドン!!<small style="color:#fff;font-size:22px">DON</small></div>
        <div class="cap" style="right:24px;bottom:24px">Then something with its own computer showed up.</div></div>`,
      "grid-template:1fr/1fr",
    );
    drop.querySelector(".mbox")?.animate(
      [
        { transform: "translateY(-120%) rotate(-25deg)" },
        { transform: "translateY(5%) rotate(0) scale(1.1,.88)", offset: 0.72 },
        { transform: "none" },
      ],
      { duration: 700, easing: "cubic-bezier(.3,1.3,.5,1)" },
    );
    env.track("episode_drop");
    await turn();

    const offer = await showPage(
      `<div class="pnl tone"><div class="fill speed" style="opacity:.3"></div>${mbox("left:50%;top:58%;width:330px;height:330px;margin:-165px 0 0 -165px")}
        ${balloon("You look like you've been babysitting.", { x: 40, y: 22, w: 370, h: 170 }, { x: 230, y: 250 }, "say3")}</div>
      <div class="pnl">${founder("left:12%;bottom:-6%;width:76%;opacity:.95")}
        ${balloon(`<div class="chips" style="margin:0"><button class="chip" type="button">Who are you?</button><button class="chip alt" type="button">Can you finish this?</button></div>`, { x: 6, y: 30, w: 430, h: 190 }, { x: 190, y: 300 }, "ask")}</div>`,
      "grid-template:1fr/1fr 1fr",
    );
    const line = await untilTap([...offer.querySelectorAll(".ask .chip")], signal, { timeoutMs: 12000 });
    queuedTap = false;
    offer.querySelector<HTMLElement>(".ask .bt")!.textContent = line === 0 ? "Who are you?" : "Can you finish this?";
    const say3 = offer.querySelector<HTMLElement>(".say3 .bt")!;
    say3.textContent = line === 0 ? "I'm the night shift. I brought my own computer." : "All of it, and I brought my own computer.";
    say3.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
    squash(offer.querySelector(".mbox"));
    await turn();

    // The transformation is the computer powering on, not a costume.
    const boot = await showPage(
      `<div class="pnl burst"><div class="bootcrt"></div>
        <div class="stamp" style="right:40px;top:44px">ON SHIFT</div>
        <div class="sfx" style="left:30px;top:30px;font-size:84px">ブゥン<small>VWOOM</small></div>
        <div class="cap" style="left:24px;bottom:24px">It runs on its own computer, so yours can finally close.</div></div>`,
      "grid-template:1fr/1fr",
    );
    const holder = boot.querySelector<HTMLElement>(".bootcrt")!;
    holder.outerHTML = crtMarkup("happy");
    const crt = boot.querySelector<HTMLElement>(".crt")!;
    placeCrt(crt, { x: 270, y: 150, scale: 0.62 });
    crt.dataset.screen = "on";
    crt.querySelector<HTMLElement>(".crt-content")!.innerHTML = `<div style="position:absolute;inset:0;padding:26px 28px;font-size:19px;line-height:1.6;color:#bfe9ff">allocating a computer .. ok<br>mounting /home/${esc((name || "you").toLowerCase())} .. ok<br>shift .. 11:05 pm to 7 am</div>`;
    await W(2400);

    const sw = await showPage(
      `<div class="pnl tone-l">${mbox("left:50%;bottom:20px;width:220px;height:220px;margin-left:-110px")}${balloon("Give me the list and go to bed.", { x: 18, y: 26, w: 254, h: 200 }, { x: 150, y: 330 })}</div>
      <div class="pnl">${founder("left:8%;bottom:-6%;width:84%")}${balloon("You'll need me.", { x: 30, y: 28, w: 230, h: 140 }, { x: 120, y: 330 })}${balloon("Once, maybe.", { x: 110, y: 230, w: 170, h: 100 }, { x: 40, y: 140 }, "small")}</div>
      <div class="pnl" style="background:#f2efe6"><button class="switch" type="button" aria-label="Turn off the light"><i></i></button><div class="cap" style="left:16px;right:16px;bottom:16px;text-align:center;max-width:none">Tap the switch.</div></div>`,
      "grid-template:1fr/1fr 1fr 1fr",
    );
    sw.querySelector<HTMLElement>(".balloon.small")!.style.fontSize = "19px";
    const switchEl = sw.querySelector<HTMLElement>(".switch")!;
    await untilTap([switchEl], signal, { timeoutMs: 12000 });
    queuedTap = false;
    switchEl.classList.add("off");
    env.track("episode_lights_out");
    await W(260);
    const black = el("div", "ep-black", `Good night${name ? `, ${esc(name)}` : ""}.`);
    root.appendChild(black);
    await tween(black, [{ opacity: 0 }, { opacity: 1 }], { duration: 300 }, signal);
    await W(900);

    // Eyecatch: the brand moment in the slot anime keeps for it.
    const ec = await showPage(
      `<div class="pnl eyecatch"><div class="ec-word">CONSTRUCT</div><div class="ecrt"></div><div class="ec-ep">EP.01</div></div>`,
      "grid-template:1fr/1fr",
    );
    ec.querySelector<HTMLElement>(".ecrt")!.outerHTML = crtMarkup("happy");
    placeCrt(ec.querySelector<HTMLElement>(".crt")!, { x: 300, y: 196, scale: 0.6 });
    void tween(black, [{ opacity: 1 }, { opacity: 0 }], { duration: 400 }, signal).then(() => black.remove());
    await W(2300);

    // One genre per hour.
    const gpage = await showPage(
      `<div class="pnl"><div class="fill speed" style="opacity:.16"></div><div class="genre">11:20 PM · ACTION</div><div class="minib"><span class="live">LIVE</span>acme.com/pricing<b>$19 · $49 · $99</b></div><div class="gline">It speed-reads five pricing pages in its own browser.</div><span class="yourpick" data-j="0">YOUR PICK</span></div>
      <div class="pnl tone-l"><div class="genre">12:05 AM · SPORTS</div><div class="huddle">${[0, 1, 2, 3].map(() => mbox("", "happy")).join("")}</div><div class="gline">It calls in three teammates and they split the forty leads.</div><span class="yourpick" data-j="1">YOUR PICK</span></div>
      <div class="pnl"><div class="genre">12:50 AM · SLICE OF LIFE</div><div class="minib" style="width:36%"><b>Lead tracker</b>40 rows, best first</div><div class="gline">You wanted a tracker, so it builds one.</div></div>`,
      "grid-template:1fr 1fr 1fr/1fr",
    );
    gpage.querySelectorAll<HTMLElement>(".yourpick").forEach((y) => {
      if (Number(y.dataset.j) !== PICKS[pick]!.job) y.remove();
    });
    await turn();

    // ── Ten: the twist ──────────────────────────────────────────────────
    await showPage(
      `<div class="pnl" style="background:#111"><div class="fill tone" style="filter:invert(1);opacity:.55"></div><div class="genre" style="background:#f6d23a;color:#111">1:30 AM · SUSPENSE</div>
        ${mbox("left:50%;top:50%;width:250px;height:250px;margin:-150px 0 0 -125px")}
        <div class="sfx light" style="right:24px;top:70px;font-size:66px">ゴゴゴ</div>
        ${balloon("…two Acme invoices are open.", { x: 40, y: 470, w: 380, h: 150 }, { x: 200, y: -60 })}</div>
      <div class="pnl tone-l"><div class="phone"><div class="notif"><b>Construct</b><br>Two Acme invoices are open. Chase both?<span>Answer when you're up.</span></div></div>
        <div class="sfx" style="left:20px;top:24px;font-size:56px">ブルッ<small>BZZT</small></div>
        <div class="cap" style="left:16px;right:16px;bottom:16px;max-width:none">It didn't guess. It asked, and it let you sleep.</div></div>`,
      "grid-template:1fr/1.1fr 1fr",
    );
    env.track("episode_twist");
    await turn();

    // ── Ketsu: dawn ─────────────────────────────────────────────────────
    const dawn = await showPage(
      `<div class="pnl dawnbg"><div style="position:absolute;left:50%;bottom:-170px;width:360px;height:360px;margin-left:-180px;border-radius:50%;background:#fff1b0;box-shadow:0 0 80px #ffe27a"></div>
        ${founder("left:6%;bottom:-6%;width:62%")}
        <div class="sticky">${esc(who)}'s list${["pricing brief", "40 leads", "a tracker", "acme invoice", "monday brief"].map((x, i) => `<span class="${i === 3 ? "pend" : ""}">${x}</span>`).join("")}</div>
        <div class="cap" style="left:16px;top:16px">7:00 am. Four were done and one needed you.</div></div>
      <div class="pnl"><div class="phone" style="top:40%"><div class="notif"><b>Construct needs your input</b><br>Two Acme invoices are open. Chase both?</div>
        <button class="opt rec" type="button"><small>RECOMMENDED</small>Chase #4821 only</button><button class="opt" type="button">Chase both</button></div>
        ${balloon("Told you. Once.", { x: 70, y: 520, w: 280, h: 120 }, null, "told")}</div>`,
      "grid-template:1fr/1.25fr 1fr",
    );
    const told = dawn.querySelector<HTMLElement>(".told")!;
    told.style.opacity = "0";
    hint("Answer on the phone");
    queuedTap = false;
    const ans = await untilTap([...dawn.querySelectorAll(".phone .opt")], signal, { timeoutMs: 14000 });
    hint("");
    env.track("episode_answer", { ans });
    dawn.querySelectorAll(".phone .opt").forEach((o) => o.remove());
    dawn.querySelector(".phone .notif")!.innerHTML = `<b>Sent</b><br>${ans === 0 ? "Reminder for #4821" : "Reminders for #4821 and #4790"} went out at 7:01 am, from ${esc((name || "you").toLowerCase())}@construct-agent.xyz.`;
    dawn.querySelector(".sticky .pend")?.classList.remove("pend");
    told.animate([{ opacity: 0, transform: "scale(.6)" }, { opacity: 1, transform: "none" }], { duration: 420, easing: EASE_SPRING, fill: "forwards" });
    await turn("Tap for next time");

    // ── Next time ───────────────────────────────────────────────────────
    const next = await showPage(
      `<div class="pnl burst"><div class="nt">NEXT TIME ON CONSTRUCT</div><div class="nt-sub">Monday's brief runs itself!</div>
        <div class="nt-form"><div class="q">Get episode 02 in your inbox, with your first month free.</div>
        <div class="row"><input id="ep-email" type="email" autocomplete="email" enterkeyhint="send" placeholder="you@company.com" aria-label="Your email"><button class="go" type="button">Send it</button></div>
        <div class="err" role="alert"></div><div class="fine">No card, and you can leave anytime.</div></div>
        <div class="tbc">To be continued</div></div>`,
      "grid-template:1fr/1fr",
    );
    env.track("episode_end");
    const nf = next.querySelector<HTMLElement>(".nt-form")!;
    const field = nf.querySelector<HTMLInputElement>("input")!;
    const go = nf.querySelector<HTMLButtonElement>(".go")!;
    const err = nf.querySelector<HTMLElement>(".err")!;
    let busy = false;
    const submit = async () => {
      if (busy) return;
      const email = field.value.trim();
      if (!EMAIL_RE.test(email)) {
        err.textContent = "That email doesn't look right. Mind checking it?";
        field.focus();
        return;
      }
      busy = true;
      err.textContent = "";
      go.textContent = "Sending";
      const result = await env.claim(email, name);
      busy = false;
      if (!result.ok) {
        go.textContent = "Send it";
        err.textContent = result.message;
        return;
      }
      const share = encodeURIComponent("I just read a manga where an AI takes my night shift, and then it actually did. construct.computer");
      nf.innerHTML = `<div class="q">Episode 02 is on its way${name ? `, ${esc(name)}` : ""}.</div><div class="fine">Your free month code, in case you'd rather start tonight:</div><div class="code">${esc(result.code)}</div>
        <div class="ctas"><a target="_blank" rel="noopener" href="${esc(env.appUrl)}">Start tonight</a><a class="ghost" target="_blank" rel="noopener" href="https://x.com/intent/post?text=${share}">Share</a></div>`;
      nf.querySelectorAll("a").forEach((a, i) => a.addEventListener("click", () => env.track(i === 0 ? "start_tonight" : "share")));
    };
    go.addEventListener("click", () => void submit());
    field.addEventListener("keydown", (e) => {
      if (e.key === "Enter") void submit();
    });
  };

  run().catch((error: unknown) => {
    if (!(error instanceof Stopped)) console.error(error);
  });
  return () => {
    ctl.abort();
    board.innerHTML = "";
  };
}
