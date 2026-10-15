import { Bubble } from "../show/bubble";
import { crtMarkup, mascotFace, mascotLeftCheek, placeCrt, screenCenter, type CrtPlacement } from "../show/crt";
import {
  BOARD_H,
  EASE_MOVE,
  EASE_OUT,
  EASE_SPRING,
  EMAIL_RE,
  Stopped,
  clockLabel,
  el,
  esc,
  firstName,
  localContext,
  springTo,
  tween,
  untilTap,
  wait,
} from "../show/kit";
import { mascotMarkup, setFace, squash, trackPointer } from "../show/mascot";
import { PH_DAILY_AWARD, productHuntHref } from "../product-hunt/config";
import type { EmbedJob } from "../../../shared/embed-schema";
import type { ShowEnv } from "../show/show-host";
import "./night-shift.css";

/*
 * Night Shift Live: the launch film with the viewer inside it. The poster
 * wakes up, takes the list, and works one night while the viewer sleeps.
 * During the shift a tap skips ahead and a hold looks inside its screen.
 * It saves one question for the morning and ends on a time card that asks
 * where to send tomorrow's report.
 */

const CRT_HOME: CrtPlacement = { x: 470, y: 316, scale: 0.53 };
/** Product Hunt's mark, inline: the show's CSP serves images from this origin only. */
const PH_MARK = `<svg class="ns-badge-mark" viewBox="0 0 40 40" aria-hidden="true"><path fill="#da552f" d="M40 20c0 11.046-8.954 20-20 20S0 31.046 0 20 8.954 0 20 0s20 8.954 20 20"/><path fill="#fff" d="M22.667 20H17v-6h5.667a3 3 0 0 1 0 6m0-10H13v20h4v-6h5.667a7 7 0 1 0 0-14"/></svg>`;

/** The poster's art window on the board (night-shift.css, .ns-art). */
const ART_X = 22;
const ART_Y = 22;
const ART_W = 824;
const ART_H = 676;
/** Matches the .ns-sky opacity transition. */
const SKY_FADE_MS = 1600;

/**
 * The tube's light at night, printed the way the sky is: an 8 px halftone
 * screen at 20 degrees whose dots swell toward the glass, over a faint
 * smooth bloom. Drawn once into the art window at twice the board's
 * resolution, so it stays crisp when the card is scaled up.
 */
function paintGlow(canvas: HTMLCanvasElement, cx: number, cy: number): void {
  const g = canvas.getContext("2d");
  if (!g) return;
  g.scale(2, 2);
  const bloom = g.createRadialGradient(cx, cy, 0, cx, cy, 230);
  bloom.addColorStop(0, "rgba(140, 220, 255, .42)");
  bloom.addColorStop(0.45, "rgba(90, 180, 255, .14)");
  bloom.addColorStop(1, "rgba(90, 180, 255, 0)");
  g.fillStyle = bloom;
  g.fillRect(0, 0, ART_W, ART_H);

  const PITCH = 8;
  const RX = 360;
  const RY = 290;
  const a = (20 * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const n = Math.ceil(Math.hypot(RX, RY) / PITCH) + 1;
  g.fillStyle = "rgb(150, 226, 255)";
  for (let u = -n; u <= n; u++) {
    for (let v = -n; v <= n; v++) {
      const x = cx + (u * cos - v * sin) * PITCH;
      const y = cy + (u * sin + v * cos) * PITCH;
      // The light falls off faster upward than across: it pools low, toward the desk.
      const dy = (y - cy) / (y < cy ? RY * 0.8 : RY);
      const d = Math.hypot((x - cx) / RX, dy);
      if (d >= 1) continue;
      const r = Math.pow(1 - d, 1.7) * PITCH * 0.5;
      if (r < 0.35) continue;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
  }
}
const CRT_END: CrtPlacement = { x: 52, y: 288, scale: 0.6 };
const TITLE_W_DAY = 770;
const TITLE_W_NIGHT = 560;

const LIST = [
  "Pricing brief on our 5 competitors",
  "Score the 40 new leads",
  "Somewhere I can track them",
  "Chase the Acme invoice",
  "Brief me every Monday",
] as const;

type StopKey = "brief" | "leads" | "tracker" | "ask" | "monday" | "memory";
type Stop = { key: StopKey; job: number; line: string };

const STOPS: Record<StopKey, Stop> = {
  brief: { key: "brief", job: 0, line: "It opens its own browser and reads all five pricing pages." },
  leads: { key: "leads", job: 1, line: "Forty leads is a lot for one, so it calls in three more workers." },
  tracker: { key: "tracker", job: 2, line: "You wanted somewhere to track them, so it builds a little app." },
  ask: { key: "ask", job: 3, line: "One invoice looks off. Instead of guessing, it saves you a question." },
  monday: { key: "monday", job: 4, line: "It saves the Monday brief as a workflow, so you never ask twice." },
  memory: { key: "memory", job: -1, line: "It writes down what it learned. You can read it, fix it or make it forget." },
};
/** The jobs in list order, keyed the way the claim email knows them. */
const ORDER: EmbedJob[] = ["brief", "leads", "tracker", "ask", "monday"];
const TIMES: Array<[number, number]> = [
  [23, 20],
  [0, 5],
  [0, 50],
  [1, 30],
  [2, 10],
  [2, 40],
];
const LOCK_SVG = `<svg class="lock" viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 7V5a3.5 3.5 0 0 1 7 0v2" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="3" y="7" width="10" height="7.5" rx="1.6" fill="currentColor"/></svg>`;
const PILE_SLOTS = [
  { x: 50, y: 214, r: -4 },
  { x: 222, y: 210, r: 3 },
  { x: 394, y: 216, r: -2 },
  { x: 92, y: 350, r: 2 },
  { x: 266, y: 346, r: -3 },
];
const SITES: Array<[string, [string, string, string]]> = [
  ["acme.com/pricing", ["$19", "$49", "$99"]],
  ["globex.io/plans", ["$12", "$45", "Custom"]],
  ["initech.co/pricing", ["$25", "$79", "$150"]],
  ["hooli.app/pricing", ["$9", "$29", "$79"]],
  ["umbrella.dev/plans", ["$15", "$45", "Custom"]],
];

type Tod = "day" | "dusk" | "night" | "dawn";

export function mountNightShift(board: HTMLElement, env: ShowEnv): () => void {
  const ctl = new AbortController();
  const signal = ctl.signal;
  const here = localContext();
  const cleanups: Array<() => void> = [];
  let name = "";
  let pick = 3;

  board.innerHTML = `<div class="ns" data-tod="day">
    <div class="ns-world">
      <div class="ns-art">
        ${(["day", "dusk", "night", "dawn"] as Tod[]).map((k) => `<img class="ns-sky${k === "day" ? " on" : ""}" data-sky="${k}" alt="" draggable="false" decoding="async" ${k === "day" ? `src="/assets/show/sky-${k}.webp"` : `data-src="/assets/show/sky-${k}.webp"`}>`).join("")}
        <canvas class="ns-glow" width="${ART_W * 2}" height="${ART_H * 2}"></canvas>
        <div class="ns-stars"></div>
      </div>
      <div class="ns-vert" aria-hidden="true"><span>CONSTRUCT</span></div>
      <h1 class="ns-title ptype"></h1>
      <div class="ns-pips" hidden>${"<i></i>".repeat(5)}</div>
      <div class="ns-pile"></div>
      <div class="ns-spec">Runs on ....... its own computer\nRemembers ..... what it learned\nWorks ......... while you don't</div>
      <div class="ns-caption" hidden aria-live="polite"><div class="ns-cap-time"></div><div class="ns-cap-line"></div></div>
      <a class="ns-badge" href="${esc(productHuntHref("x-show", "daily"))}" target="_blank" rel="noopener" tabindex="-1" aria-label="${esc(PH_DAILY_AWARD)} on Product Hunt">${PH_MARK}<span><small>Product Hunt</small><b>${esc(PH_DAILY_AWARD)}</b></span></a>
      <div class="ns-url">construct.computer</div>
      ${crtMarkup("asleep")}
      <div class="ns-props"></div>
    </div>
    <div class="ns-inside" aria-live="polite">
      <div class="ns-glass"><div class="ns-appbar"><span class="ns-app-mark">${mascotMarkup("happy")}</span><b>Construct</b><span class="ns-app-where"></span><span class="ns-app-run"><i></i>1 running</span></div><div class="ns-slot"></div><div class="ns-glare"></div></div>
      <div class="ns-chin">
        <div class="ns-line"></div>
        <div class="ns-grille" aria-hidden="true">${"<i></i>".repeat(5)}</div>
        <div class="ns-lcd"><div class="ns-lcd-row"><span class="ns-lcd-k">On shift</span><div class="ns-hud-clock"></div></div><div class="ns-lcd-row"><span class="ns-lcd-k">Jobs</span><div class="ns-pips">${"<i></i>".repeat(5)}</div></div></div>
        <div class="ns-power" aria-hidden="true"><i class="ns-led"></i><b></b></div>
      </div>
    </div>
    <div class="ns-dots">${"<i></i>".repeat(6)}</div>
    <button class="ns-start" type="button" aria-label="Wake it up and start the night shift"></button>
  </div>`;

  const q = <T extends Element = HTMLElement>(sel: string) => board.querySelector(sel) as T;
  const root = q(".ns");
  const world = q(".ns-world");
  const title = q(".ns-title");
  const pips = [...board.querySelectorAll<HTMLElement>(".ns-world .ns-pips i")];
  const pipsIn = [...board.querySelectorAll<HTMLElement>(".ns-inside .ns-pips i")];
  const pile = q(".ns-pile");
  const props = q(".ns-props");
  const spec = q(".ns-spec");
  const caption = q(".ns-caption");
  const capTime = q(".ns-cap-time");
  const capLine = q(".ns-cap-line");
  const crt = q(".crt");
  const mascot = q(".crt .m");
  const screen = q(".crt-content");
  const inside = q(".ns-inside");
  const where = q(".ns-app-where");
  const running = q(".ns-app-run");
  const frame = board.closest<HTMLElement>(".show-frame");
  /** The empty bands around a non 4:3 frame take the colour of the scene. */
  const backdrop = (color: string) => {
    if (frame) frame.style.background = color;
  };
  backdrop("#fbfdff");
  const WHERE: Record<string, string> = {
    handoff: "Messages",
    brief: "Browser",
    leads: "Agents",
    tracker: "Apps",
    ask: "Mail",
    monday: "Automations",
    memory: "Memory",
    morning: "Home",
  };
  const onScreen = (kind: string, html: string) => {
    where.textContent = WHERE[kind] ?? "";
    running.hidden = kind === "morning";
    // These screens draw their own app window, so the Construct bar steps aside.
    inside.classList.toggle("bare", ["handoff", "morning", "brief", "ask"].includes(kind));
    slot.innerHTML = html;
    slot.firstElementChild?.animate([{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }], { duration: 360, easing: EASE_OUT });
  };
  const hud = q(".ns-hud-clock");
  const slot = q(".ns-slot");
  const line = q(".ns-line");
  const start = q<HTMLButtonElement>(".ns-start");
  const bubble = new Bubble(root);
  let place = { ...CRT_HOME };
  placeCrt(crt, place);
  {
    const sc = screenCenter(CRT_HOME);
    paintGlow(q<HTMLCanvasElement>(".ns-glow"), sc.x - ART_X, sc.y - ART_Y);
  }
  cleanups.push(trackPointer(root, mascot));

  // ── small helpers ────────────────────────────────────────────────────
  const W = (ms: number) => wait(ms, signal);
  const dots = (n: number) => board.querySelectorAll(".ns-dots i").forEach((d, i) => d.classList.toggle("on", i < n));
  // Each new sky fades in on top of the one it replaces, which stays fully
  // opaque underneath until it is covered. Fading one out while the other
  // fades in would let the backing show through halfway, a visible dip.
  let skyZ = 1;
  const setTod = (tod: Tod) => {
    root.dataset.tod = tod;
    const skies = [...board.querySelectorAll<HTMLImageElement>(".ns-sky")];
    const next = skies.find((img) => img.dataset.sky === tod)!;
    if (next.classList.contains("on") && Number(next.style.zIndex || 1) === skyZ) return;
    next.style.zIndex = String(++skyZ);
    next.classList.remove("on");
    const show = () => {
      if (root.dataset.tod !== tod) return;
      next.classList.add("on");
      window.setTimeout(() => {
        for (const img of skies) {
          if (img === next || img.dataset.sky === root.dataset.tod) continue;
          img.style.transition = "none";
          img.classList.remove("on");
          void img.offsetWidth;
          img.style.transition = "";
        }
      }, SKY_FADE_MS + 60);
    };
    // A sky that is still decoding would pop in late; wait for it, briefly.
    const ready = next.complete && next.naturalWidth ? next.decode() : new Promise((r) => next.addEventListener("load", r, { once: true }));
    void Promise.race([ready.catch(() => undefined), wait(900, signal)]).then(show, () => undefined);
  };
  // Each finished job plays the next note up the scale, so the night builds a melody.
  let noteStep = 0;
  const pip = (i: number, state: "done" | "wait") => {
    if (state === "done") env.sound.play("note", { step: noteStep++ });
    for (const p of [pips[i], pipsIn[i]]) {
      if (!p) continue;
      p.classList.remove("done", "wait");
      p.classList.add(state);
      p.animate([{ transform: "scale(1.5)" }, { transform: "scale(1)" }], { duration: 420, easing: EASE_SPRING });
    }
  };
  const face = () => mascotLeftCheek(place);
  const say = (html: string, side: "left" | "right" = "left", maxWidth = 400, top = 0) => {
    env.sound.play("blip");
    return bubble.say(
      html,
      // Never over the poster title: the top bound sits under its last row.
      { anchor: face(), side, maxWidth, bounds: { left: 44, top: Math.max(top, title.offsetTop + title.offsetHeight + 18), right: 840, bottom: 640 } },
      signal,
    );
  };
  const hint = (text: string, pos: Partial<CSSStyleDeclaration>) => {
    const h = el("div", "ns-hint", esc(text));
    Object.assign(h.style, pos);
    root.appendChild(h);
    return h;
  };

  // Poster type: measured off-screen so the title always fits its width.
  const measure = el("span", "ptype");
  Object.assign(measure.style, { position: "absolute", left: "-9999px", top: "0", visibility: "hidden", fontSize: "100px" });
  board.appendChild(measure);
  const fit = (text: string, maxW: number, maxSize: number) => {
    measure.textContent = text;
    // offsetWidth is layout size, untouched by the artboard's scale.
    return Math.min(maxSize, (maxW / Math.max(1, measure.offsetWidth)) * 100);
  };
  const letters = (text: string) =>
    [...text].map((c, i) => `<span class="ch" data-i="${i}">${c === " " ? "&nbsp;" : esc(c)}</span>`).join("");
  const setTitle = (rows: string[], maxW: number, maxSize = 112) => {
    const size = Math.min(...rows.map((r) => fit(r, maxW, maxSize)));
    title.style.fontSize = `${size.toFixed(1)}px`;
    title.innerHTML = rows.map((r) => `<span class="row">${letters(r)}</span>`).join("");
    title.setAttribute("aria-label", rows.join(" "));
  };
  const dropTitle = async () => {
    const chars = [...title.querySelectorAll<HTMLElement>(".ch")];
    await Promise.all(
      chars.map((c, i) =>
        tween(
          c,
          [
            { transform: "translateY(0) rotate(0)" },
            { transform: `translateY(-8%) rotate(${(Math.sin(i * 7.1) * 12).toFixed(0)}deg)`, offset: 0.2 },
            { transform: `translateY(820px) rotate(${(Math.sin(i * 3.7) * 90).toFixed(0)}deg)` },
          ],
          { duration: 900, delay: i * 45, easing: "cubic-bezier(.55,0,1,.45)" },
          signal,
        ),
      ),
    );
  };
  const raiseTitle = async (rows: string[], maxW: number, maxSize?: number) => {
    setTitle(rows, maxW, maxSize);
    const chars = [...title.querySelectorAll<HTMLElement>(".ch")];
    await Promise.all(
      chars.map((c, i) =>
        tween(
          c,
          [
            { transform: "translateY(-160%) scale(1.15)", opacity: 0 },
            { transform: "translateY(6%) scale(1)", opacity: 1, offset: 0.7 },
            { transform: "none", opacity: 1 },
          ],
          { duration: 620, delay: i * 38, easing: EASE_OUT },
          signal,
        ),
      ),
    );
  };
  /** The clock as an odometer: only the characters that change roll. */
  const rollTitle = (text: string) => {
    const old = title.textContent ?? "";
    env.sound.play("tick");
    setTitle([text], TITLE_W_NIGHT);
    title.querySelectorAll<HTMLElement>(".ch").forEach((c, i) => {
      if (old[i] === text[i]) return;
      c.animate(
        [
          { transform: "translateY(55%)", opacity: 0 },
          { transform: "none", opacity: 1 },
        ],
        { duration: 460, delay: i * 30, easing: EASE_OUT },
      );
    });
    hud.textContent = text;
  };
  const showCaption = async (time: string, text: string) => {
    spec.hidden = true;
    caption.hidden = false;
    capTime.textContent = time;
    capLine.innerHTML = text
      .split(" ")
      .map((w) => `<span class="w">${esc(w)}</span>`)
      .join(" ");
    capLine.querySelectorAll<HTMLElement>(".w").forEach((w, i) =>
      w.animate(
        [
          { transform: "translateY(60%)", opacity: 0 },
          { transform: "none", opacity: 1 },
        ],
        { duration: 420, delay: i * 26, easing: EASE_OUT, fill: "backwards" },
      ),
    );
    capTime.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
  };
  const setLine = (text: string) => {
    line.innerHTML = `<span>${esc(text)}</span>`;
    line.firstElementChild?.animate(
      [
        { transform: "translateY(110%)" },
        { transform: "none" },
      ],
      { duration: 480, easing: EASE_OUT },
    );
  };

  // Through the glass and back: the world zooms into the tube, then the
  // inside fades up. Short when the viewer is holding to peek.
  let deep = false;
  const dive = async (ms = 760) => {
    env.sound.play("whooshIn");
    backdrop("#d6ccb8");
    const c = screenCenter(place);
    world.style.transformOrigin = `${c.x}px ${c.y}px`;
    deep = true;
    const zoom = tween(
      world,
      [
        { transform: "scale(1)", filter: "blur(0px)" },
        { transform: "scale(3)", filter: "blur(1.5px)", offset: 0.6 },
        { transform: "scale(6.4)", filter: "blur(3px)" },
      ],
      { duration: ms, easing: "cubic-bezier(.6,0,.2,1)" },
      signal,
    );
    await W(ms * 0.55);
    inside.classList.add("on");
    inside.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms * 0.5, fill: "forwards", easing: "ease-out" });
    await zoom;
  };
  const surface = async (ms = 700) => {
    env.sound.play("whooshOut");
    backdrop("#fbfdff");
    deep = false;
    inside.classList.remove("on");
    inside.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms * 0.45, fill: "forwards", easing: "ease-in" });
    await tween(
      world,
      [
        { transform: "scale(6.4)", filter: "blur(3px)" },
        { transform: "scale(1)", filter: "blur(0px)" },
      ],
      { duration: ms, easing: EASE_OUT },
      signal,
    );
  };

  // ── the CRT's own screen ─────────────────────────────────────────────
  const screenShow = (html: string) => {
    const cold = crt.dataset.screen !== "on";
    if (cold) env.sound.play("crt");
    crt.dataset.screen = "on";
    screen.innerHTML = html;
    // From off, the tube warms up the way a real one does: a bright line
    // that opens into the picture.
    if (cold) {
      screen.animate(
        [
          { transform: "scale(.5, .012)", filter: "brightness(5)", opacity: 0.4 },
          { transform: "scale(1, .012)", filter: "brightness(4)", opacity: 1, offset: 0.35 },
          { transform: "none", filter: "brightness(1.6)", offset: 0.8 },
          { transform: "none", filter: "none" },
        ],
        { duration: 560, easing: "cubic-bezier(.2,.8,.2,1)" },
      );
    }
  };
  const screenOff = () => {
    crt.dataset.screen = "off";
  };
  const SCREEN = {
    boot: (lines: string) => `<div class="scr-pad scr-boot">${lines}</div>`,
    browser: (i: number) => {
      const [url, prices] = SITES[i % SITES.length]!;
      return `<div class="scr-browser"><div class="scr-url"><b>LIVE</b>${url}</div><div class="scr-tiles">${prices.map((p) => `<i>${p}</i>`).join("")}</div></div>`;
    },
    sheet: (n: number) => `<div class="scr-pad scr-sheet"><div>leads.csv</div><div class="big">${n}/40</div><div>scored</div></div>`,
    note: (t: string) => `<div class="scr-pad scr-note">${t}</div>`,
  };

  // ── work props ───────────────────────────────────────────────────────
  let pileCount = 0;
  const fly = async (node: HTMLElement, from: { x: number; y: number }, slotIndex: number) => {
    const s = PILE_SLOTS[slotIndex % PILE_SLOTS.length]!;
    node.style.left = `${s.x}px`;
    node.style.top = `${s.y}px`;
    node.style.rotate = `${s.r}deg`;
    pile.appendChild(node);
    const dx = from.x - (s.x + 81);
    const dy = from.y - (s.y + 58);
    await tween(
      node,
      [
        { transform: `translate(${dx}px, ${dy}px) scale(.12) rotate(${-s.r * 3}deg)`, opacity: 0.2 },
        { transform: `translate(${dx * 0.35}px, ${dy * 0.35 - 70}px) scale(1.08) rotate(${s.r}deg)`, opacity: 1, offset: 0.6 },
        { transform: "none", opacity: 1 },
      ],
      { duration: 820, easing: EASE_OUT },
      signal,
    );
    pileCount++;
  };
  const pileItem = (html: string, peek: StopKey) => {
    const node = el("button", "pile-item", html) as HTMLButtonElement;
    node.type = "button";
    node.dataset.peek = peek;
    node.setAttribute("aria-label", "Look inside");
    return node;
  };

  // Each stop has its own little spectacle around the CRT, then leaves
  // something on the pile. `skip` resolves when the viewer taps ahead.
  // A tap during a spectacle is remembered and skips the pause after it.
  let skipNow: (() => void) | null = null;
  let skipPending = false;
  const requestSkip = () => {
    if (skipNow) skipNow();
    else skipPending = true;
  };
  const beat = (ms: number) => {
    if (skipPending) {
      skipPending = false;
      return Promise.resolve();
    }
    return Promise.race([
      W(ms),
      new Promise<void>((resolve) => {
        skipNow = resolve;
      }),
    ]).finally(() => {
      skipNow = null;
    });
  };

  const spectacle: Record<StopKey, () => Promise<void>> = {
    brief: async () => {
      for (let i = 0; i < SITES.length; i++) {
        screenShow(SCREEN.browser(i));
        await W(420);
      }
      await fly(
        pileItem(`<span class="tab">PDF</span><div class="k">Brief</div><div class="t">Pricing brief</div><div class="s">5 sources</div>`, "brief"),
        screenCenter(place),
        pileCount,
      );
    },
    leads: async () => {
      const c = mascotFace(place);
      screenShow(SCREEN.sheet(0));
      const spots = [
        { x: c.x - 132, y: c.y - 78 },
        { x: c.x + 128, y: c.y - 70 },
        { x: c.x - 4, y: c.y - 150 },
      ];
      const clones = spots.map(() => {
        const n = el("div", "clone", `${mascotMarkup("happy")}<span class="badge">0</span>`);
        n.style.left = `${c.x}px`;
        n.style.top = `${c.y}px`;
        props.appendChild(n);
        return n;
      });
      await Promise.all(
        clones.map((n, i) =>
          tween(
            n,
            [
              { transform: "translate(0,0) scale(.2)", opacity: 0 },
              { transform: `translate(${spots[i]!.x - c.x}px, ${spots[i]!.y - c.y}px) scale(1)`, opacity: 1 },
            ],
            { duration: 560, delay: i * 90, easing: EASE_SPRING },
            signal,
          ),
        ),
      );
      for (let k = 1; k <= 10; k++) {
        clones.forEach((n) => (n.querySelector(".badge")!.textContent = String(k)));
        screenShow(SCREEN.sheet(k * 4));
        await W(120);
      }
      await Promise.all(
        clones.map((n, i) =>
          tween(
            n,
            [
              { transform: `translate(${spots[i]!.x - c.x}px, ${spots[i]!.y - c.y}px) scale(1)`, opacity: 1 },
              { transform: "translate(0,0) scale(.2)", opacity: 0 },
            ],
            { duration: 420, delay: i * 70, easing: EASE_MOVE },
            signal,
          ),
        ),
      );
      clones.forEach((n) => n.remove());
      squash(mascot);
      await fly(
        pileItem(`<div class="k">Sheet</div><div class="t">40 leads, scored</div><div class="s">leads.csv</div>`, "leads"),
        screenCenter(place),
        pileCount,
      );
    },
    tracker: async () => {
      const c = screenCenter(place);
      const win = el(
        "div",
        "appwin",
        `<div class="bar">Lead tracker<span>built just now</span></div>${[
          ["Northwind Labs", 96],
          ["Kestrel Works", 94],
          ["Fernway", 91],
          ["Coppergate", 89],
        ]
          .map(([n, s]) => `<div class="row"><span>${n}</span><i style="transform:scaleX(0)"></i><b>${s}</b></div>`)
          .join("")}`,
      );
      win.style.left = "176px";
      win.style.top = "176px";
      props.appendChild(win);
      screenShow(SCREEN.note("building<br>lead-tracker"));
      await tween(
        win,
        [
          { transform: `translate(${c.x - 316}px, ${c.y - 260}px) scale(.1)`, opacity: 0 },
          { transform: "none", opacity: 1 },
        ],
        { duration: 640, easing: EASE_SPRING },
        signal,
      );
      win.querySelectorAll<HTMLElement>(".row i").forEach((b, i) =>
        b.animate([{ transform: "scaleX(0)" }, { transform: `scaleX(${[0.96, 0.94, 0.91, 0.89][i]})` }], {
          duration: 600,
          delay: 120 + i * 130,
          easing: EASE_OUT,
          fill: "forwards",
        }),
      );
      await W(1500);
      await tween(win, [{ transform: "none", opacity: 1 }, { transform: "translate(-40px, 120px) scale(.4)", opacity: 0 }], { duration: 380, easing: EASE_MOVE }, signal);
      win.remove();
      await fly(pileItem(`<div class="k">App</div><div class="t">Lead tracker</div><div class="s">40 rows, by score</div>`, "tracker"), { x: 260, y: 300 }, pileCount);
    },
    ask: async () => {
      const c = mascotFace(place);
      setFace(mascot, "open");
      mascot.style.setProperty("--lx", "-4%");
      mascot.style.setProperty("--ly", "-4%");
      const qm = el("div", "qmark", "?");
      qm.style.left = `${c.x + 30}px`;
      qm.style.top = `${c.y - 150}px`;
      props.appendChild(qm);
      void tween(qm, [{ transform: "scale(0) rotate(-30deg)" }, { transform: "scale(1) rotate(8deg)" }], { duration: 480, easing: EASE_SPRING }, signal);
      screenShow(SCREEN.note(`From ${esc((name || "you").toLowerCase())}@<br>construct-agent.xyz<br><br>invoice #4821 ?`));
      const note = el("div", "sticky", `<b>FOR 7 AM</b>Two Acme invoices are open. Chase both?`);
      note.style.left = "404px";
      note.style.top = "486px";
      note.style.rotate = "-6deg";
      props.appendChild(note);
      env.sound.play("pop", { step: 2 });
      await tween(note, [{ transform: "translateY(-260px) scale(1.4) rotate(14deg)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 520, easing: EASE_SPRING }, signal);
      pip(3, "wait");
      const body = await say(
        `I'm not sure which invoice you meant, so I'll ask you at 7 instead of guessing.<div class="chips"><button class="chip" type="button">Answer now</button><button class="chip alt" type="button">Sleep on it</button></div>`,
        "left",
        460,
      );
      const choice = await untilTap([...body.querySelectorAll(".chip")], signal, { timeoutMs: 8000, fallback: 1 });
      env.sound.play("chip", { step: choice === 0 ? 0 : 2 });
      env.track("ask_choice", { choice: choice === 0 ? "now" : "sleep" });
      squash(mascot);
      await say(choice === 0 ? "It can wait. I'll ask you at 7." : "I'll keep it on the note for 7.");
      await W(1700);
      await bubble.hide(signal);
      qm.remove();
      mascot.style.setProperty("--lx", "0%");
      mascot.style.setProperty("--ly", "0%");
    },
    monday: async () => {
      screenShow(SCREEN.note("save as workflow?<br><br>every monday 8:00"));
      const node = pileItem(`<div class="top">MONDAY</div><div class="day">${nextMonday()}</div><span class="stamp">8:00 BRIEF</span>`, "monday");
      node.classList.add("cal");
      await fly(node, screenCenter(place), pileCount);
      env.sound.play("stamp");
      node.querySelector(".stamp")?.animate([{ transform: "scale(2.4)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }], { duration: 380, easing: EASE_SPRING, fill: "backwards" });
    },
    memory: async () => {
      screenShow(SCREEN.note("memory<br><br>briefs go out<br>on mondays"));
      const node = pileItem(`<div class="k">Memory</div><div class="t mem"></div><div class="s">fix or forget</div>`, "memory");
      await fly(node, screenCenter(place), pileCount);
      const t = node.querySelector(".mem")!;
      for (const ch of "Briefs go out on Mondays") {
        t.textContent += ch;
        await W(32);
      }
    },
  };

  // ── the inside of the screen, at full size ───────────────────────────
  const mail = () => `${esc((name || "you").toLowerCase())}@construct-agent.xyz`;
  /** A Slack-style workspace: aubergine sidebar, then whatever goes in the main pane. */
  const slackShell = (active: "ops" | "dm", main: string) => `<div class="slack">
      <aside class="sl-side"><div class="sl-ws">Acme HQ</div>
        <div class="sl-sec">Channels</div><div class="sl-ch"># general</div><div class="sl-ch${active === "ops" ? " on" : ""}"># ops</div><div class="sl-ch"># sales</div>
        <div class="sl-sec">Direct messages</div><div class="sl-ch app${active === "dm" ? " on" : ""}"><span class="sl-mini">${mascotMarkup("happy")}</span>Construct<i></i></div></aside>
      <section class="sl-main">${main}</section></div>`;
  const CARD: Record<StopKey | "handoff", () => string> = {
    handoff: () =>
      slackShell(
        "ops",
        `<header class="sl-head"><b># ops</b><span>4 members</span></header>
        <div class="sl-feed"><div class="sl-msg"><div class="sl-av">${esc((name || "Y")[0]!.toUpperCase())}</div><div class="sl-body">
          <div class="sl-who"><b>${esc(name || "You")}</b><span>${clockLabel(23, 4)}</span></div>
          <div class="sl-text"><span class="sl-at">@Construct</span> before 9 tomorrow, please:</div>
          <ol class="sl-list">${LIST.map((x, i) => `<li><button class="sl-item" type="button" data-i="${i}">${x}</button></li>`).join("")}</ol>
          <div class="sl-reacts"></div></div></div>
          <div class="sl-reply"></div></div>
        <div class="sl-compose">Message #ops</div>`,
      ),
    brief: () => `<div class="br">
      <div class="br-tabs"><span class="br-tab on"><i style="background:#e2382b">A</i>Acme · Pricing</span><span class="br-tab"><i style="background:#7c3aed">G</i>Globex plans</span><span class="br-tab"><i style="background:#0f766e">I</i>Initech</span>
        <span class="br-who"><span class="sl-mini">${mascotMarkup("happy")}</span>Construct's browser</span></div>
      <div class="br-bar"><span class="br-nav">‹&nbsp;&nbsp;›</span><div class="br-url">LOCK<span>acme.com</span>/pricing</div><span class="ui-pill live"><i class="dot"></i>Live</span><span class="br-ctl">Take control</span></div>
      <div class="br-page"><div class="br-site"><b>acme</b><span>Product</span><span class="on">Pricing</span><span>Docs</span><em>Sign up</em></div>
        <div class="br-h">Simple pricing for every team</div>
        <div class="br-plans">${[["Solo", "$19", "1 seat"], ["Team", "$49", "Up to 10 seats"], ["Business", "$99", "SSO and audit"]].map((p, i) => `<div class="br-plan${i === 1 ? " hot" : ""}"><span>${p[0]}</span><b>${p[1]}<small>/mo</small></b><i>${p[2]}</i></div>`).join("")}</div></div>
      <div class="br-done"><span class="br-pdf">PDF</span><div><b>Pricing brief.pdf</b><span>5 pages read, 5 sources attached, worked for 14 min</span></div><span class="ui-pill green">Done</span></div></div>`.replace("LOCK", LOCK_SVG),
    leads: () => `<div class="ui-card"><div class="ui-row"><div class="ui-av m">${mascotMarkup("happy")}</div><div><div class="ui-h">Handed off to Analyst</div><div class="ui-s ui-mut">Parallel workers · 4</div></div></div>
      <div class="workers">${[1, 11, 21, 31].map((a) => `<div class="wcell"><span>Leads ${a} to ${a + 9}</span><span class="ui-pill green">Done</span></div>`).join("")}</div>
      <div class="foot"><span>leads.csv</span><span class="ui-mut">40 of 40 scored</span></div></div>`,
    tracker: () => `<div class="ui-card"><div class="ui-row sb"><div class="ui-h">Lead tracker</div><span class="ui-pill blue">Built by your agent</span></div>
      <table class="ltab">${[
        ["Northwind Labs", "Series A, hiring ops", 96],
        ["Kestrel Works", "Replacing two tools", 94],
        ["Fernway", "Asked for pricing twice", 91],
        ["Coppergate", "Budget approved", 89],
      ]
        .map((r) => `<tr><td><b>${r[0]}</b></td><td class="ui-mut">${r[1]}</td><td style="width:22%"><div class="bar" style="width:${r[2]}%"></div></td><td style="text-align:right;font-weight:750">${r[2]}</td></tr>`)
        .join("")}</table>
      <div class="foot"><span class="ui-mut">40 leads, sorted by score</span><span class="ui-pill green">Ready</span></div></div>`,
    ask: () => `<div class="mail">
      <aside class="ml-side"><div class="ml-acct"><span class="sl-mini">${mascotMarkup("happy")}</span><b>Mail</b></div>
        <div class="ml-f">Inbox <b>12</b></div><div class="ml-f on">Drafts <b>1</b></div><div class="ml-f">Sent</div><div class="ml-f">Scheduled</div></aside>
      <section class="ml-main"><div class="ml-bar"><b>Draft</b><span class="ui-pill amber">Paused, waiting for you</span></div>
        <div class="ml-fields"><div><span>From</span>${mail()}</div><div><span>To</span>billing@acme.example</div><div><span>Subject</span><b>Invoice #4821: third reminder</b></div></div>
        <div class="ml-body">Hi Acme team, following up on invoice #4821, now 21 days overdue. Could you confirm a payment date?</div>
        <div class="ml-attach">invoice-4821.pdf</div>
        <div class="ml-ask"><span class="ml-av">${mascotMarkup("open")}</span><div><b>Construct needs your input</b><p>Two Acme invoices are open, #4821 and #4790. Chase both?</p><span>Saved for 7 am, so you can sleep.</span></div></div></section></div>`,
    monday: () => `<div class="ui-card"><div class="ui-row sb"><div class="ui-h">Monday pricing brief</div><span class="ui-pill">Workflow</span></div>
      <div class="nodes"><div class="node lit">Every Monday</div><b>›</b><div class="node lit">Research</div><b>›</b><div class="node lit">Write brief</div><b>›</b><div class="node lit">Email you</div></div>
      <div class="foot"><span class="ui-mut">Saved from tonight's chat</span><span class="ui-pill blue">Mondays, 8:00</span></div></div>`,
    memory: () => `<div class="ui-card" style="max-width:640px"><div class="ui-s ui-mut">Memory</div><div class="ui-h" style="font-size:36px;margin-top:8px">Briefs go out on Mondays</div>
      <div class="ui-s ui-mut" style="margin-top:10px">Learned by Construct from tonight's chat</div>
      <div class="ui-row" style="margin-top:20px"><button class="ui-btn ghost" type="button">Correct</button><button class="ui-btn ghost" type="button">Forget</button></div></div>`,
  };

  // ── the show ─────────────────────────────────────────────────────────
  const zz = el("div", "", `<span class="ns-zz">z</span><span class="ns-zz">z</span>`);
  const seat = mascotFace(place);
  zz.querySelectorAll<HTMLElement>(".ns-zz").forEach((z) => {
    z.style.left = `${seat.x + 44}px`;
    z.style.top = `${seat.y - 96}px`;
  });
  world.appendChild(zz);
  const startHint = hint("Tap to wake it up", { left: "260px", top: "214px" });

  const run = async () => {
    await document.fonts.load('800 100px "Show Sora"').catch(() => undefined);
    setTitle(["AI EMPLOYEE"], TITLE_W_DAY);
    await untilTap([start], signal);
    env.sound.play("wake");
    // The other skies load once the viewer is in, so the first frame stays light.
    board.querySelectorAll<HTMLImageElement>("img[data-src]").forEach((img) => {
      img.src = img.dataset.src!;
      img.removeAttribute("data-src");
    });
    start.remove();
    startHint.remove();
    env.track("wake");
    dots(1);

    // 1. It wakes up and notices you.
    zz.remove();
    setFace(mascot, "open");
    squash(mascot);
    await dropTitle();
    if (here.night) {
      setTod("dusk");
      await raiseTitle([here.time.toUpperCase()], TITLE_W_DAY);
      await say(`It's ${here.time} in ${esc(here.city)} and you're still working.`);
    } else {
      await raiseTitle([here.time.toUpperCase()], TITLE_W_DAY);
      await say(`It's ${here.time} in ${esc(here.city)}. Let's skip ahead to tonight.`);
      await W(1600);
      setTod("dusk");
      let mins = here.hours * 60 + here.minutes;
      const target = 23 * 60 + 4 + (mins > 23 * 60 + 4 ? 1440 : 0);
      for (let k = 0; k < 16; k++) {
        mins += (target - mins) / (16 - k);
        const m = Math.round(mins) % 1440;
        setTitle([clockLabel(Math.floor(m / 60), m % 60)], TITLE_W_DAY);
        await W(50);
      }
    }
    await W(1700);
    const b1 = await say(
      `Is today's work done?<div class="chips"><button class="chip" type="button">Not even close</button><button class="chip alt" type="button">Almost</button></div>`,
      "left",
      480,
    );
    const listAnswer = await untilTap([...b1.querySelectorAll(".chip")], signal, { timeoutMs: 9000 });
    env.sound.play("chip", { step: listAnswer === 0 ? 0 : 2 });
    squash(mascot);
    await say(listAnswer === 0 ? "Then hand it to me. I'll work through it tonight." : "Then hand me the rest. I'll finish it tonight.");
    await W(2100);
    await bubble.hide(signal);

    // 2. The hand-off, through the glass.
    dots(2);
    hud.textContent = clockLabel(23, 4);
    onScreen("handoff", CARD.handoff());
    setLine("Tap the job that's keeping you up. It goes first.");
    const card = slot.firstElementChild as HTMLElement;
    const rows = [...card.querySelectorAll<HTMLElement>(".sl-item")];
    // Listen before the zoom ends, so an early tap still counts.
    const chosen = untilTap(rows, signal, { timeoutMs: 12000, fallback: 3 });
    await dive();
    const choice = await chosen;
    env.sound.play("pop");
    window.setTimeout(() => env.sound.play("pop", { step: 2 }), 140);
    pick = choice < LIST.length ? choice : 3;
    rows.forEach((r, i) => r.classList.add(i === pick ? "on" : "dim"));
    env.track("handoff", { pick });
    const reacts = card.querySelector<HTMLElement>(".sl-reacts")!;
    reacts.innerHTML = `<span class="sl-react">🫡 <b>1</b></span><span class="sl-react">👀 <b>1</b></span>`;
    reacts.querySelectorAll("span").forEach((r, i) => r.animate([{ transform: "scale(0)" }, { transform: "scale(1)" }], { duration: 320, delay: i * 120, easing: EASE_SPRING, fill: "backwards" }));
    setLine("Send it from Slack, Telegram, Discord or email. It reads all four.");
    await W(700);
    const reply = card.querySelector<HTMLElement>(".sl-reply")!;
    reply.innerHTML = `<div class="sl-msg"><div class="sl-av m">${mascotMarkup("happy")}</div><div class="sl-body"><div class="sl-who"><b>Construct</b><em>APP</em><span>${clockLabel(23, 4)}</span></div><div class="sl-text">On it. I'll start with <b>${esc(LIST[pick]![0]!.toLowerCase() + LIST[pick]!.slice(1))}</b> and have the rest done before 9.</div></div></div>`;
    env.sound.play("chime");
    reply.animate([{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }], { duration: 380, easing: EASE_OUT });
    await W(2600);
    await surface();

    // 3. A name, and the pull chain.
    dots(3);
    const nb = await say(
      `Before you go, what should I call you?<div class="field"><input id="ns-name" maxlength="20" autocomplete="given-name" enterkeyhint="done" placeholder="First name" aria-label="Your first name"><button class="chip" type="button">That's me</button></div>`,
      "left",
      420,
    );
    const input = nb.querySelector<HTMLInputElement>("input")!;
    const named = await new Promise<string>((resolve, reject) => {
      const done = () => {
        env.sound.play("chip", { step: 4 });
        resolve(input.value);
      };
      nb.querySelector(".chip")!.addEventListener("click", done);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") done();
      });
      const t = window.setTimeout(done, 14000);
      signal.addEventListener("abort", () => {
        window.clearTimeout(t);
        reject(new Stopped());
      });
    });
    name = firstName(named);
    env.begin(name);
    env.track("named", { given: Boolean(name) });
    squash(mascot);
    await say(name ? `Thanks, ${esc(name)}. Pull the chain and get some sleep.` : "Pull the chain and get some sleep.");
    await pullChain();
    env.track("lights_out");

    // Lights out. The room drops dark on the click, the tube warms up, and
    // the night comes up as the eyes adjust. Nothing flashes.
    env.sound.play("lamp");
    void bubble.hide(signal);
    const dim = el("div", "ns-dim");
    world.insertBefore(dim, q(".ns-art").nextSibling);
    void tween(dim, [{ opacity: 0 }, { opacity: 0.62 }], { duration: 90, easing: "ease-out", fill: "forwards" }, signal);
    setTod("night");
    await W(260);
    screenShow(SCREEN.boot(`allocating a computer .. ok<br>mounting /home/${esc((name || "you").toLowerCase())} .. ok<br>shift 11:05 pm to 7:00 am`));
    void tween(dim, [{ opacity: 0.62 }, { opacity: 0 }], { duration: 1500, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" }, signal).then(() => dim.remove());
    await W(200);
    rollTitle(clockLabel(23, 5));
    q(".ns-world .ns-pips").hidden = false;
    await W(700);
    await say(name ? `Good night, ${esc(name)}. Tap to skip ahead, or hold my screen to look in.` : "Good night. Tap to skip ahead, or hold my screen to look in.");
    await W(2600);
    await bubble.hide(signal);

    // 4. The shift. A quick tap skips ahead; holding looks inside.
    dots(4);
    const order: StopKey[] = [ORDER[pick]!, ...ORDER.filter((k) => k !== ORDER[pick])];
    order.push("memory");
    let current: StopKey = order[0]!;
    let holdTimer = 0;
    let holding = false;
    // A tag hung on the monitor, in the same style as the chain's PULL tag.
    const peekHint = el("div", "peek-tag", "HOLD TO LOOK IN");
    const sc = screenCenter(place);
    peekHint.style.left = `${sc.x}px`;
    peekHint.style.top = `${sc.y + 118}px`;
    world.appendChild(peekHint);
    const onDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest(".bub, .chip, input")) return;
      const peekTarget = target.closest<HTMLElement>(".pile-item");
      holdTimer = window.setTimeout(() => {
        holding = true;
        peekHint.hidden = true;
        const key = (peekTarget?.dataset.peek as StopKey | undefined) ?? current;
        hud.textContent = title.textContent ?? "";
        onScreen(key, CARD[key]());
        setLine(STOPS[key].line);
        void dive(420);
      }, 190);
    };
    const onUp = (e: PointerEvent) => {
      window.clearTimeout(holdTimer);
      if (holding) {
        holding = false;
        void surface(420);
        return;
      }
      const target = e.target as HTMLElement;
      if (target.closest(".bub, .chip, input")) return;
      requestSkip();
    };
    root.addEventListener("pointerdown", onDown);
    root.addEventListener("pointerup", onUp);
    root.addEventListener("pointercancel", onUp);
    cleanups.push(() => {
      root.removeEventListener("pointerdown", onDown);
      root.removeEventListener("pointerup", onUp);
      root.removeEventListener("pointercancel", onUp);
    });

    for (let k = 0; k < order.length; k++) {
      const key = order[k]!;
      current = key;
      const stop = STOPS[key];
      const [h, m] = TIMES[k]!;
      const label = clockLabel(h, m);
      rollTitle(label);
      await showCaption(label, stop.line);
      env.track("stop", { key });
      await spectacle[key]();
      if (stop.job >= 0 && key !== "ask") pip(stop.job, "done");
      await beat(key === "ask" ? 900 : 1800);
    }
    root.removeEventListener("pointerdown", onDown);
    peekHint.remove();
    if (deep) await surface(420);

    // 5. Dawn.
    dots(5);
    screenOff();
    await showCaption(clockLabel(3, 0), "By 3 am the work is done. One question waits for 7.");
    for (const [h, tod] of [
      [3, "night"],
      [4, "night"],
      [5, "dawn"],
      [6, "dawn"],
      [7, "day"],
    ] as Array<[number, Tod]>) {
      setTod(tod);
      rollTitle(clockLabel(h, 0));
      await W(700);
    }
    birds();
    env.sound.play("birds");
    setFace(mascot, "happy");
    squash(mascot);
    q(".ns-world .ns-pips").hidden = true;
    await dropTitle();
    await raiseTitle(name ? ["GOOD MORNING,", `${name.toUpperCase()}`] : ["GOOD", "MORNING"], 560, 96);
    caption.hidden = true;
    await say(`Morning${name ? `, ${esc(name)}` : ""}. Four are done, and I saved one question for you.`, "left", 380, 244);
    await W(2600);
    await bubble.hide(signal);

    // 6. The one question.
    dots(6);
    inside.classList.add("morning");
    hud.textContent = clockLabel(7, 2);
    const done = [0, 1, 2, 4].map((j) => ["Pricing brief, 5 sources", "40 leads scored", "Lead tracker built", "", "Monday brief booked"][j]);
    onScreen(
      "morning",
      slackShell(
        "dm",
        `<header class="sl-head"><span class="sl-mini big">${mascotMarkup("happy")}</span><b>Construct</b><span>App</span></header>
        <div class="sl-feed"><div class="sl-msg"><div class="sl-av m">${mascotMarkup("happy")}</div><div class="sl-body">
          <div class="sl-who"><b>Construct</b><em>APP</em><span>${clockLabel(7, 0)}</span></div>
          <div class="sl-text">Good morning${name ? `, ${esc(name)}` : ""}. Here's the night:</div>
          <ul class="sl-done">${done.map((d) => `<li><span class="ok">✓</span>${d}</li>`).join("")}</ul>
          <div class="sl-block"><div class="sl-text"><b>One question.</b> Two Acme invoices are open. Should I chase both?</div>
            <div class="sl-btns"><button class="sl-btn primary" type="button">Chase #4821 only</button><button class="sl-btn" type="button">Chase both</button></div></div>
        </div></div></div>
        <div class="sl-compose">Message Construct</div>`,
      ),
    );
    setLine("Four done by 7, and one question that needs you.");
    const askBox = slot.querySelector<HTMLElement>(".sl-block")!;
    const answered = untilTap([...askBox.querySelectorAll(".sl-btn")], signal, { timeoutMs: 15000 });
    await dive();
    const answer = await answered;
    env.sound.play("chip", { step: answer === 0 ? 2 : 4 });
    env.track("answered", { answer });
    askBox.innerHTML = `<div class="sl-text"><b>One question.</b> Two Acme invoices are open. Should I chase both?</div><div class="sl-answer"><span class="ok">✓</span>${answer === 0 ? "Chased #4821. The reminder went out" : "Chased both. The reminders went out"} from ${mail()} at 7:02 am.</div>`;
    askBox.animate([{ transform: "scale(.96)" }, { transform: "scale(1)" }], { duration: 380, easing: EASE_SPRING });
    for (let i = 0; i < 5; i++) {
      pip(i, "done");
      await W(90);
    }
    setLine("One tap from you and it's all done.");
    await W(2600);
    await surface();

    // 7. The time card.
    env.track("end");
    await endCard();
  };

  // ── the pull chain: drag it down past the line, or press Enter ──────
  async function pullChain() {
    const art = q(".ns-art");
    const chain = el(
      "div",
      "ns-chain",
      `<div class="ns-cord"></div><button class="ns-bead" type="button" aria-label="Pull the chain to turn off the light"></button><span class="ns-tag">PULL</span>`,
    );
    const base = 236;
    chain.style.left = "812px";
    chain.style.setProperty("--len", `${base}px`);
    world.insertBefore(chain, art.nextSibling);
    await tween(chain, [{ transform: "translateY(-300px)" }, { transform: "translateY(0)" }], { duration: 700, easing: EASE_SPRING }, signal);
    chain.style.transform = "";
    const bead = chain.querySelector<HTMLButtonElement>(".ns-bead")!;
    const tag = chain.querySelector<HTMLElement>(".ns-tag")!;
    const scale = () => board.getBoundingClientRect().height / BOARD_H;
    const setLen = (v: number) => chain.style.setProperty("--len", `${v.toFixed(1)}px`);
    await new Promise<void>((resolve, reject) => {
      let startY = 0;
      let startX = 0;
      let len = base;
      let active = false;
      const THRESHOLD = 72;
      const onMove = (e: PointerEvent) => {
        if (!active) return;
        const dy = (e.clientY - startY) / scale();
        const dx = (e.clientX - startX) / scale();
        const pulled = Math.max(0, dy);
        len = base + (pulled < 110 ? pulled : 110 + (pulled - 110) * 0.35);
        setLen(len);
        chain.style.rotate = `${Math.max(-10, Math.min(10, -dx * 0.08)).toFixed(2)}deg`;
        tag.style.opacity = pulled > 20 ? "0" : "1";
      };
      const release = async () => {
        if (!active) return;
        active = false;
        bead.removeEventListener("pointermove", onMove);
        const pulled = len - base;
        chain.style.rotate = "";
        if (pulled >= THRESHOLD) {
          // The light goes out on the click, not after the chain settles.
          void springTo(len, base, setLen, { stiffness: 320, damping: 11, velocity: -900 });
          finish();
        } else {
          tag.style.opacity = "1";
          await springTo(len, base, setLen, { stiffness: 380, damping: 16 });
          chain.classList.remove("held");
        }
      };
      const onDown = (e: PointerEvent) => {
        e.stopPropagation();
        active = true;
        chain.classList.add("held");
        startY = e.clientY;
        startX = e.clientX;
        bead.setPointerCapture(e.pointerId);
        bead.addEventListener("pointermove", onMove);
      };
      const onKey = (e: KeyboardEvent) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        chain.classList.add("held");
        void springTo(base, base + 110, setLen, { stiffness: 300, damping: 30 }).then(() => {
          void springTo(base + 110, base, setLen, { stiffness: 320, damping: 11 });
          finish();
        });
      };
      const finish = () => {
        cleanup();
        resolve();
      };
      const cleanup = () => {
        bead.removeEventListener("pointerdown", onDown);
        bead.removeEventListener("pointerup", release);
        bead.removeEventListener("pointercancel", release);
        bead.removeEventListener("keydown", onKey);
        signal.removeEventListener("abort", onAbort);
      };
      const onAbort = () => {
        cleanup();
        reject(new Stopped());
      };
      bead.addEventListener("pointerdown", onDown);
      bead.addEventListener("pointerup", release);
      bead.addEventListener("pointercancel", release);
      bead.addEventListener("keydown", onKey);
      signal.addEventListener("abort", onAbort);
      bead.focus({ preventScroll: true });
    });
    void bubble.hide(signal);
    tag.remove();
    void tween(chain, [{ transform: "none", opacity: 1 }, { transform: "translateY(-340px)", opacity: 1 }], { duration: 700, delay: 500, easing: EASE_MOVE }, signal).then(() => chain.remove());
  }

  function birds() {
    const b = el("div", "birds", "︶ ︶");
    b.style.left = "120px";
    b.style.top = "150px";
    world.appendChild(b);
    void tween(b, [{ transform: "translate(0,0)", opacity: 0 }, { opacity: 1, offset: 0.2 }, { transform: "translate(420px,-90px)", opacity: 0 }], { duration: 4200, easing: "linear" }, signal).then(() => b.remove());
  }

  async function endCard() {
    const w = q(".ns-world");
    const pileEl = pile;
    void tween(pileEl, [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(40px)" }], { duration: 420, easing: "ease-in" }, signal);
    spec.hidden = true;
    caption.hidden = true;
    setFace(mascot, "open");
    const from = { ...place };
    place = { ...CRT_END };
    const dx = CRT_END.x - from.x;
    const dy = CRT_END.y - from.y;
    const k = CRT_END.scale / from.scale;
    crt.style.transformOrigin = "0 0";
    await tween(crt, [{ transform: "none" }, { transform: `translate(${dx}px, ${dy}px) scale(${k})` }], { duration: 760, easing: EASE_MOVE }, signal);
    crt.style.transform = "";
    crt.style.transformOrigin = "";
    placeCrt(crt, CRT_END);
    void tween(props, [{ opacity: 1 }, { opacity: 0 }], { duration: 400, easing: "ease-in" }, signal);
    await dropTitle();
    await raiseTitle(["AI", "EMPLOYEE"], 380, 104);
    const badge = q<HTMLAnchorElement>(".ns-badge");
    badge.classList.add("on");
    badge.tabIndex = 0;
    badge.addEventListener("click", () => env.track("product_hunt"));
    badge.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, fill: "forwards" });

    // The offer is a pass you tear off, in the poster's own colours: the top
    // says what you get, the stub below the perforation takes the email.
    const card = el("div", "pass");
    const who = name ? `${esc(name)}, want` : "Want";
    card.innerHTML = `<div class="pass-top">
        <div class="pass-kicker">NIGHT SHIFT PASS · NO. 04821</div>
        <div class="pass-big"><span class="pass-big-top">One month</span><span class="pass-big-sub">on us</span></div>
        <div class="pass-sub">${who} it working for you tonight? I'll email you the code.</div>
        <div class="pass-meta">5 jobs done · 1 question for you</div>
      </div>
      <div class="pass-stub">
        <input class="pass-field" id="ns-email" type="email" autocomplete="email" enterkeyhint="send" placeholder="you@company.com" aria-label="Your email"><button class="pass-go wide" type="button">Claim my free month</button>
        <div class="pass-err" role="alert"></div>
        <div class="pass-fine">Your first month free on any plan. Cancel anytime.</div>
      </div>`;
    w.appendChild(card);
    window.setTimeout(() => env.sound.play("pop"), 420);
    await tween(card, [{ transform: "translate(420px, 40px) rotate(14deg)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 760, easing: EASE_SPRING }, signal);
    const field = card.querySelector<HTMLInputElement>(".pass-field")!;
    const go = card.querySelector<HTMLButtonElement>(".pass-go")!;
    const err = card.querySelector<HTMLElement>(".pass-err")!;
    let busy = false;
    const submit = async () => {
      if (busy) return;
      const email = field.value.trim();
      if (!EMAIL_RE.test(email)) {
        err.textContent = "That email doesn't look right. Mind checking it?";
        field.animate([{ transform: "translateX(0)" }, { transform: "translateX(-8px)" }, { transform: "translateX(8px)" }, { transform: "translateX(0)" }], { duration: 300 });
        field.focus();
        return;
      }
      busy = true;
      err.textContent = "";
      go.textContent = "Claiming";
      const result = await env.claim(email, name, ORDER[pick]);
      busy = false;
      if (!result.ok) {
        go.textContent = "Claim my free month";
        err.textContent = result.message;
        return;
      }
      card.querySelector(".pass-sub")!.textContent = "Check your inbox for the code and how to start.";
      env.sound.play("stamp");
      window.setTimeout(() => env.sound.play("logo"), 160);
      const stamp = el("div", "pass-stamp", "CLAIMED");
      card.querySelector(".pass-top")!.appendChild(stamp);
      stamp.animate([{ transform: "scale(2.6)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }], { duration: 420, easing: EASE_SPRING });
      const share = encodeURIComponent("My AI employee worked the night shift while I slept, then asked me one question at 7. construct.computer");
      const stub = card.querySelector<HTMLElement>(".pass-stub")!;
      stub.innerHTML = `<div class="pass-sent">Sent to ${esc(email)}. Your code:</div>
        <div class="pass-code">${esc(result.code)}</div>
        <div class="pass-ctas"><a class="pass-go" target="_blank" rel="noopener" href="${esc(env.startUrl(result.code))}">Start tonight</a><a class="pass-go ghost" target="_blank" rel="noopener" href="https://x.com/intent/post?text=${share}">Share</a></div>`;
      stub.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
      stub.querySelectorAll("a").forEach((a, i) => a.addEventListener("click", () => env.track(i === 0 ? "start_tonight" : "share")));
    };
    go.addEventListener("click", () => void submit());
    field.addEventListener("keydown", (e) => {
      if (e.key === "Enter") void submit();
    });
  }

  run().catch((error: unknown) => {
    if (!(error instanceof Stopped)) console.error(error);
  });

  return () => {
    ctl.abort();
    cleanups.forEach((fn) => fn());
    board.innerHTML = "";
  };
}

function nextMonday(): string {
  const d = new Date();
  const add = ((8 - d.getDay()) % 7) || 7;
  d.setDate(d.getDate() + add);
  return String(d.getDate());
}
