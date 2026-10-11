import { TOKENS as T, esc, icon, marked, tile } from "../kit.mjs";

/**
 * Product figures: a fragment of Construct's own UI, or of the app the work
 * lands in, filled with the post's own example.
 */

/** What a step used, as the icon Activity shows beside it. */
const TOOL_ICONS = {
  browser: "Globe02",
  terminal: "ComputerTerminal01",
  files: "File02",
  email: "Mail01",
  calendar: "Calendar03",
  memory: "AiBrain01",
  search: "Search01",
  slack: null,
};

/**
 * Construct's Activity panel for one task, a row per step.
 *
 *   { kind: "activity", task: "Monthly shipping rate check", status: "Done",
 *     rows: [{ tool: "browser", text: "Filled the rate calculator" }],
 *     pill: "5 min per browser run" }
 */
export function activity({ task, status = "Done", rows, pill }) {
  const list = rows
    .map(
      (
        row,
      ) => `<div style="display:flex;align-items:center;gap:14px;padding:11px 20px;border-top:1px solid ${T.soft}">
        <span style="width:34px;height:34px;border-radius:10px;background:${T.tint};display:inline-flex;align-items:center;justify-content:center;flex:none">${icon(TOOL_ICONS[row.tool], 19, T.strong)}</span>
        <span style="font:500 17px Geist;color:${T.ink};flex:1">${marked(row.text)}</span>
        <span class="label" style="font-size:12px">${esc(row.tool)}</span>
      </div>`,
    )
    .join("");
  return {
    html: `<div style="display:flex;flex-direction:column;align-items:flex-end;gap:16px;width:520px">
      <div class="panel" style="width:100%;overflow:hidden">
        <div style="display:flex;align-items:center;gap:12px;padding:16px 20px">
          ${tile("Construct", 34)}
          <div style="flex:1"><div class="label" style="font-size:12px">Activity</div><div style="font:600 18px Geist;margin-top:5px">${esc(task)}</div></div>
          <span class="pill" style="color:${T.positive};background:#ecfdf3;border-color:#c6f0d6">${icon("CheckmarkCircle02", 16, T.positive)}${esc(status)}</span>
        </div>${list}
      </div>
      ${pill ? `<span class="pill">${icon("Clock01", 16, T.strong)}${esc(pill)}</span>` : ""}
    </div>`,
  };
}

/**
 * A post in a team channel: the app it lands in, the message, its sources.
 *
 *   { kind: "message", app: "Slack", channel: "daily", sender: "Construct",
 *     time: "7:45 AM", lines: ["..."], sources: ["Google Calendar", "Gmail"],
 *     pill: "Every weekday, 7:45am" }
 */
export function message({
  app,
  channel,
  sender,
  time,
  lines,
  sources = [],
  pill,
}) {
  const body = lines
    .map(
      (line) =>
        `<div style="display:flex;gap:10px;font:400 16.5px/1.45 Geist;color:${T.ink}"><span style="color:${T.brand}">&bull;</span><span>${marked(line)}</span></div>`,
    )
    .join("");
  const from = sources.length
    ? `<div style="display:flex;align-items:center;gap:8px;margin-top:16px"><span class="label" style="font-size:12px;margin-right:4px">From</span>${sources.map((s) => tile(s, 30)).join("")}</div>`
    : "";
  return {
    html: `<div style="display:flex;flex-direction:column;gap:16px;width:520px">
      ${pill ? `<span class="pill" style="align-self:flex-start">${icon("Calendar03", 16, T.strong)}${esc(pill)}</span>` : ""}
      <div class="panel" style="overflow:hidden">
        <div style="display:flex;align-items:center;gap:10px;padding:14px 20px;border-bottom:1px solid ${T.soft}">
          ${tile(app, 28, { radius: 8 })}<span style="font:700 17px Geist"># ${esc(channel)}</span>
        </div>
        <div style="display:flex;gap:14px;padding:18px 20px 20px">
          ${tile(sender, 46, { radius: 12 })}
          <div style="flex:1">
            <div style="display:flex;align-items:baseline;gap:10px;margin-bottom:8px"><span style="font:700 17px Geist">${esc(sender)}</span><span style="font:400 13px Geist;color:${T.subtle}">${esc(time)}</span></div>
            ${body}${from}
          </div>
        </div>
      </div>
    </div>`,
  };
}

/**
 * A working week in Construct's Calendar with the post's jobs on it.
 *
 *   { kind: "week", days: ["Mon", ...], rows: ["07:00", "08:00"],
 *     events: [{ day: 0, row: 0, text: "Invoice summary" },
 *              { day: "all", row: 1, text: "Client follow-ups" }],
 *     pill: "Runs with your laptop closed" }
 */
export function week({ days, rows, events, pill }) {
  // The rows share the stacked layout's height, so two rows fill it as well as four.
  const cell = Math.min(140, Math.floor(296 / rows.length) - 12);
  const cols = `grid-template-columns:76px repeat(${days.length},1fr)`;
  const head = `<div style="display:grid;${cols};padding:14px 18px 10px">${["", ...days].map((d) => `<div class="label" style="text-align:center">${esc(d)}</div>`).join("")}</div>`;
  const body = rows
    .map((time, row) => {
      const cells = days
        .map((_, day) => {
          const event = events.find(
            (e) => e.row === row && (e.day === day || e.day === "all"),
          );
          return `<div style="padding:5px">${
            event
              ? `<div style="border-radius:10px;padding:10px 11px;background:${event.day === "all" ? T.tint : "#fff6ec"};border:1px solid ${event.day === "all" ? "#bfeaf0" : "#f5d0a9"};font:600 14px/1.25 Geist;color:${event.day === "all" ? T.strong : "#9a5b13"};height:${cell}px">${esc(event.text)}</div>`
              : `<div style="height:${cell}px;border-radius:10px;background:repeating-linear-gradient(135deg,transparent 0 6px,${T.soft} 6px 7px)"></div>`
          }</div>`;
        })
        .join("");
      return `<div style="display:grid;${cols};align-items:center;padding:0 18px;border-top:1px solid ${T.soft}"><div style="font:500 14px Geist;color:${T.subtle}">${esc(time)}</div>${cells}</div>`;
    })
    .join("");
  return {
    layout: "stack",
    height: 360,
    gx: "50%",
    html: `<div style="position:relative;width:100%">
      <div class="panel" style="overflow:hidden;padding-bottom:10px">${head}${body}</div>
      ${pill ? `<span class="pill" style="position:absolute;right:22px;top:-20px;background:#fff">${icon("CloudUpload", 16, T.strong)}${esc(pill)}</span>` : ""}
    </div>`,
  };
}

/**
 * A message in the agent's own inbox, and the agent's note on what it did.
 *
 *   { kind: "email", to: "studio@construct-agent.xyz", from: "You",
 *     subject: "Fwd: Print supplier quote", body: "...",
 *     reply: "Saved a one-page summary to Files. Draft reply ready, not sent." }
 */
export function email({ to, from, subject, body, reply }) {
  return {
    html: `<div style="position:relative;width:520px;padding-bottom:60px">
      <div class="panel" style="overflow:hidden">
        <div style="display:flex;align-items:center;gap:10px;padding:14px 20px;border-bottom:1px solid ${T.soft}">
          ${icon("Mail01", 20, T.strong)}<span style="font:600 15px Geist;color:${T.muted}">Inbox</span>
        </div>
        <div style="padding:18px 22px 22px">
          <div style="display:grid;grid-template-columns:62px 1fr;row-gap:8px;font:400 15px Geist;color:${T.muted}">
            <span>From</span><span style="color:${T.ink}">${esc(from)}</span>
            <span>To</span><span style="color:${T.strong};font-weight:600">${esc(to)}</span>
          </div>
          <div style="font:700 21px Geist;margin:16px 0 8px">${esc(subject)}</div>
          <div style="font:400 15.5px/1.5 Geist;color:${T.muted}">${marked(body)}</div>
        </div>
      </div>
      <div class="panel" style="position:absolute;left:60px;right:-10px;bottom:0;display:flex;gap:12px;align-items:center;padding:14px 16px;border-radius:16px">
        ${tile("Construct", 38, { radius: 10 })}<span style="font:500 15.5px/1.4 Geist;color:${T.ink}">${marked(reply)}</span>
      </div>
    </div>`,
  };
}

/**
 * A short exchange with the agent, in the homepage hero's bubbles. `app`
 * names the channel it happens in, shown as a logo; left out, it is the web.
 *
 *   { kind: "chat", app: "Telegram",
 *     messages: [{ from: "you", text: "..." }, { from: "agent", text: "..." }] }
 */
export function chat({ app, messages }) {
  const bubbles = messages
    .map((m) =>
      m.from === "you"
        ? `<div style="align-self:flex-end;max-width:78%;padding:13px 17px;border-radius:20px 20px 6px 20px;background:linear-gradient(180deg,#4fb2f0,#2e8fe0);color:#fff;font:500 17px/1.4 Geist;box-shadow:0 14px 30px -16px rgba(30,120,200,.7)">${marked(m.text)}</div>`
        : `<div style="display:flex;gap:10px;align-items:flex-end;max-width:88%">${tile("Construct", 38, { radius: 11 })}<div class="panel" style="padding:13px 17px;border-radius:20px 20px 20px 6px;font:450 16.5px/1.45 Geist;color:${T.ink}">${marked(m.text)}</div></div>`,
    )
    .join("");
  return {
    html: `<div style="display:flex;flex-direction:column;gap:14px;width:520px">
      ${app ? `<span class="pill" style="align-self:flex-start;background:#fff">${tile(app, 20, { radius: 6 })}${esc(app)}</span>` : ""}
      ${bubbles}
    </div>`,
  };
}
