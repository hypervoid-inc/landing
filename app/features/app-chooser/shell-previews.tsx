/**
 * Scale models of the two apps for the chooser at `/app/`, rebuilt from their
 * source (v2 `apps/os` and `apps/dash`) on a 1280×800 screen: every length is
 * the app's own px value times `--u`, one 1280th of the preview's width (see
 * shell-previews.css), so they stay sharp and in proportion at any size. The
 * images are the apps' own (default wallpapers, dock icons, mascot layers) and
 * the glyphs are the Hugeicons both apps use. The content is illustrative:
 * a team of agents (Research, Outreach, Ops) at work, never anyone's data.
 * Each preview is one image to assistive tech.
 */
import { createElement } from "react";

import {
  mascotLayerSrc,
  mascotLayerStyle,
  type MascotLayer,
} from "../content/mascot-layers";
import { HUGE_ICONS, type HugeIconName } from "./hugeicons";
import "./shell-previews.css";

const ASSETS = "/assets/app-chooser";

/** A length in the 1280×800 model, scaled to the preview. */
const u = (px: number) => `calc(${px} * var(--u))`;

function Glyph({
  name,
  size,
  stroke,
  className,
}: {
  name: HugeIconName;
  size: number;
  stroke?: number;
  className?: string;
}) {
  return (
    <svg
      className={className ? `acp-glyph ${className}` : "acp-glyph"}
      viewBox="0 0 24 24"
      fill="none"
      style={{ width: u(size), height: u(size) }}
    >
      {HUGE_ICONS[name].map(([tag, attrs], index) =>
        createElement(tag, {
          key: index,
          ...attrs,
          ...(stroke ? { strokeWidth: String(stroke) } : null),
        }),
      )}
    </svg>
  );
}

type Tint = "construct" | "azure" | "coral" | "mint";

/** An agent's mascot, layered like `@repo/agent-avatar` from the 128px art. */
function Avatar({
  tint,
  wear,
  size,
}: {
  tint: Tint;
  wear?: MascotLayer;
  size: number;
}) {
  const layers: MascotLayer[] = [`body-${tint}`, "gloss", "sockets", "eyes"];
  if (wear) layers.push(wear);
  return (
    <span className="acp-avatar" style={{ width: u(size), height: u(size) }}>
      {layers.map((layer) => (
        <img
          key={layer}
          src={mascotLayerSrc(layer, 128)}
          alt=""
          style={mascotLayerStyle(layer)}
        />
      ))}
    </span>
  );
}

const AGENTS: Record<string, { tint: Tint; wear?: MascotLayer }> = {
  construct: { tint: "construct" },
  research: { tint: "azure", wear: "round-glasses-black" },
  outreach: { tint: "coral", wear: "headset-mic" },
  ops: { tint: "mint", wear: "hard-hat" },
};

type AgentKey = "construct" | "research" | "outreach" | "ops";

function Agent({ who, size }: { who: AgentKey; size: number }) {
  const { tint, wear } = AGENTS[who]!;
  return <Avatar tint={tint} wear={wear} size={size} />;
}

/* ------------------------- Construct OS (always dark) ------------------------- */

function TrafficLights({ focused }: { focused: boolean }) {
  return (
    <span className="acp-os-lights" data-focused={focused}>
      <span />
      <span />
      <span />
    </span>
  );
}

const DOCK: Array<{ app: string; running?: boolean }> = [
  { app: "launchpad" },
  { app: "chat", running: true },
  { app: "calendar" },
  { app: "browser" },
  { app: "email" },
  { app: "files", running: true },
];

const FILES: Array<{
  icon: HugeIconName;
  name: string;
  size: string;
  modified: string;
}> = [
  { icon: "Folder01Icon", name: "Leads", size: "", modified: "Yesterday" },
  { icon: "Folder01Icon", name: "Reports", size: "", modified: "Mon" },
  {
    icon: "TableIcon",
    name: "pricing-table.csv",
    size: "12 KB",
    modified: "09:38 AM",
  },
  {
    icon: "TextIcon",
    name: "outreach-replies.md",
    size: "8 KB",
    modified: "09:12 AM",
  },
  {
    icon: "Pdf01Icon",
    name: "monday-briefing.pdf",
    size: "214 KB",
    modified: "Mon",
  },
];

export function DesktopPreview() {
  return (
    <div
      className="acp"
      role="img"
      aria-label="Construct OS: a dark desktop over Mount Fuji with an agent chat window, a Files window and a dock"
    >
      <div className="acp-screen acp-os">
        <img
          className="acp-os-wall"
          src={`${ASSETS}/desktop-wallpaper.webp`}
          alt=""
        />

        <div className="acp-os-menubar acp-os-glass">
          <span className="acp-os-logo">
            <img src={`${ASSETS}/os-logo.webp`} alt="" />
          </span>
          <span className="acp-os-workspace">
            <span className="acp-os-workspace-mark">A</span>
            Ada's space
            <Glyph name="ArrowDown01Icon" size={13} className="acp-os-faint" />
          </span>
          <span className="acp-os-zen">
            <Glyph name="SparklesIcon" size={13} stroke={2.25} />
            Zen Mode
          </span>
          <span className="acp-os-status">
            <Glyph name="Search01Icon" size={16} stroke={1.8} />
            <Glyph name="ViewSidebarLeftIcon" size={16} stroke={1.8} />
            <Glyph name="FullSignalIcon" size={16} stroke={1.8} />
            <span className="acp-os-clock">09:41 AM</span>
            <Glyph name="NotificationSquareIcon" size={16} stroke={1.8} />
          </span>
        </div>

        <div className="acp-os-window acp-os-window--files acp-os-glass">
          <div className="acp-os-titlebar">
            <TrafficLights focused={false} />
            <span className="acp-os-title">
              <img src={`${ASSETS}/dock-files.webp`} alt="" />
              Files
            </span>
          </div>
          <div className="acp-os-files">
            <div className="acp-os-files-side">
              <span className="acp-os-files-place acp-os-files-place--on">
                Private
              </span>
              <span className="acp-os-files-place">Shared with me</span>
              <span className="acp-os-files-place">Team</span>
            </div>
            <div className="acp-os-files-list">
              <div className="acp-os-files-row acp-os-files-row--head">
                <span>Name</span>
                <span>Size</span>
                <span>Modified</span>
              </div>
              {FILES.map((file) => (
                <div key={file.name} className="acp-os-files-row">
                  <span className="acp-os-files-name">
                    <Glyph name={file.icon} size={16} className="acp-os-dim" />
                    {file.name}
                  </span>
                  <span className="acp-os-muted">{file.size}</span>
                  <span className="acp-os-muted">{file.modified}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="acp-os-window acp-os-window--chat acp-os-glass">
          <div className="acp-os-titlebar">
            <TrafficLights focused />
            <span className="acp-os-title">
              <img src={`${ASSETS}/dock-chat.webp`} alt="" />
              Construct
            </span>
          </div>
          <div className="acp-os-chat">
            <div className="acp-os-rail">
              {(["construct", "research", "outreach", "ops"] as const).map(
                (who) => (
                  <span
                    key={who}
                    className={
                      who === "research"
                        ? "acp-os-rail-agent acp-os-rail-agent--on"
                        : "acp-os-rail-agent"
                    }
                  >
                    <Agent who={who} size={40} />
                  </span>
                ),
              )}
            </div>
            <div className="acp-os-sessions">
              <span className="acp-os-sessions-head">Chats</span>
              <span className="acp-os-session acp-os-session--on">
                Competitor pricing
              </span>
              <span className="acp-os-session">Weekly market scan</span>
              <span className="acp-os-session">Pricing page teardown</span>
            </div>
            <div className="acp-os-thread-pane">
              <div className="acp-os-thread-head">Competitor pricing</div>
              <div className="acp-os-thread">
                <div className="acp-os-bubble acp-os-bubble--me">
                  Pull every competitor's pricing page into a table and flag
                  what changed.
                </div>
                <div className="acp-os-bubble acp-os-bubble--agent">
                  <p>
                    Done. Five competitors, and two changed prices this week:
                  </p>
                  <table>
                    <thead>
                      <tr>
                        <th>Company</th>
                        <th>Plan</th>
                        <th>Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Acme</td>
                        <td>Pro, $59</td>
                        <td>Up $10</td>
                      </tr>
                      <tr>
                        <td>Globex</td>
                        <td>Team, $99</td>
                        <td>Same</td>
                      </tr>
                      <tr>
                        <td>Initech</td>
                        <td>Starter, $24</td>
                        <td>Up $5</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="acp-os-composer">
                <div className="acp-os-composer-box">
                  <span className="acp-os-placeholder">
                    Message Research… (@ for files &amp; apps)
                  </span>
                  <span className="acp-os-composer-row">
                    <span className="acp-os-attach">
                      <Glyph name="Attachment01Icon" size={14} />
                      Attach
                    </span>
                    <Glyph
                      name="Mic01Icon"
                      size={16}
                      className="acp-os-muted acp-os-mic"
                    />
                    <span className="acp-os-send">
                      <Glyph name="SentIcon" size={16} />
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="acp-os-clippy">
          <span className="acp-os-clippy-plate" />
          <img src={`${ASSETS}/clippy-computer.webp`} alt="" />
          <span className="acp-os-clippy-screen">
            <Avatar tint="construct" size={40} />
          </span>
        </div>

        <div className="acp-os-dock acp-os-glass">
          {DOCK.map(({ app, running }) => (
            <span key={app} className="acp-os-dock-slot">
              <span className="acp-os-dock-icon">
                <img src={`${ASSETS}/dock-${app}.webp`} alt="" />
                {app === "calendar" ? (
                  <>
                    <b className="acp-os-cal-month">OCT</b>
                    <b className="acp-os-cal-day">15</b>
                  </>
                ) : null}
              </span>
              <span
                className={running ? "acp-os-dot acp-os-dot--on" : "acp-os-dot"}
              />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* --------------------------- Zen Mode (light theme) --------------------------- */

const NAV: Array<{ icon: HugeIconName; label: string; on?: boolean }> = [
  { icon: "Home01Icon", label: "Home", on: true },
  { icon: "UserMultiple02Icon", label: "Agents" },
  { icon: "DashboardSquare01Icon", label: "Apps" },
];

const WORKSPACE_NAV: Array<{ icon: HugeIconName; label: string }> = [
  { icon: "WorkflowSquare10Icon", label: "Automations" },
  { icon: "Folder01Icon", label: "Files" },
  { icon: "Mail01Icon", label: "Mail" },
  { icon: "Brain02Icon", label: "Memory" },
  { icon: "Activity01Icon", label: "Activity" },
];

const RECENTS: Array<{ icon: HugeIconName; label: string }> = [
  { icon: "BubbleChatIcon", label: "Competitor pricing" },
  { icon: "BubbleChatIcon", label: "Score the new leads" },
  { icon: "Calendar03Icon", label: "Monday briefing" },
  { icon: "Mail01Icon", label: "Invoice follow-ups" },
];

const STARTERS: Array<{ icon: HugeIconName; label: string }> = [
  { icon: "Search01Icon", label: "Research a topic" },
  { icon: "WorkflowSquare10Icon", label: "Schedule a daily briefing" },
  { icon: "PencilEdit02Icon", label: "Draft a document" },
  { icon: "ChartLineData01Icon", label: "Compare options" },
];

function NavRow({
  icon,
  label,
  on,
}: {
  icon: HugeIconName;
  label: string;
  on?: boolean;
}) {
  return (
    <span className={on ? "acp-zen-nav acp-zen-nav--on" : "acp-zen-nav"}>
      <Glyph name={icon} size={18} />
      {label}
    </span>
  );
}

export function DashboardPreview() {
  return (
    <div
      className="acp"
      role="img"
      aria-label="Zen Mode: a calm dashboard with a sidebar, a greeting, a message box, what needs you and what is coming up"
    >
      <div className="acp-screen acp-zen">
        <img
          className="acp-zen-wall"
          src={`${ASSETS}/dashboard-wallpaper.webp`}
          alt=""
        />
        <img
          className="acp-zen-wall ac-night"
          src={`${ASSETS}/dashboard-wallpaper-night.webp`}
          alt=""
        />
        <span className="acp-zen-tint" />

        <div className="acp-zen-side">
          <span className="acp-zen-switcher">
            <Agent who="construct" size={28} />
            <span className="acp-zen-switcher-text">
              <b>Ada's space</b>
              <small>Personal</small>
            </span>
            <Glyph name="UnfoldMoreIcon" size={16} className="acp-zen-subtle" />
          </span>
          <span className="acp-zen-new">
            <span className="acp-zen-new-chat">
              <Glyph name="PencilEdit02Icon" size={18} />
              New chat
            </span>
            <span className="acp-zen-square">
              <Glyph name="Search01Icon" size={18} />
            </span>
          </span>
          {NAV.map((item) => (
            <NavRow key={item.label} {...item} />
          ))}
          <span className="acp-zen-label">Workspace</span>
          {WORKSPACE_NAV.map((item) => (
            <NavRow key={item.label} {...item} />
          ))}
          <span className="acp-zen-label">Recents</span>
          {RECENTS.map(({ icon, label }) => (
            <span key={label} className="acp-zen-recent">
              <Glyph name={icon} size={16} className="acp-zen-subtle" />
              {label}
            </span>
          ))}
          <span className="acp-zen-profile">
            <span className="acp-zen-me">A</span>
            Ada Lovelace
            <Glyph
              name="Settings01Icon"
              size={16}
              className="acp-zen-muted acp-zen-push"
            />
          </span>
        </div>

        <div className="acp-zen-panel">
          <div className="acp-zen-header">
            <Glyph name="SidebarLeftIcon" size={18} className="acp-zen-muted" />
            <b>Home</b>
            <span className="acp-zen-open-os">
              <Glyph name="ComputerIcon" size={14} />
              Open OS
            </span>
            <Glyph
              name="Notification03Icon"
              size={18}
              className="acp-zen-muted"
            />
          </div>

          <div className="acp-zen-home">
            <div className="acp-zen-hello">Good morning, Ada</div>
            <div className="acp-zen-sub">
              What should Construct take off your plate?
            </div>

            <div className="acp-zen-composer">
              <span className="acp-zen-placeholder">
                Ask Construct to research, write, build or automate something
              </span>
              <span className="acp-zen-toolbar">
                <span className="acp-zen-tool">
                  <Glyph name="Attachment01Icon" size={18} />
                </span>
                <span className="acp-zen-tool">
                  <Glyph name="AtIcon" size={18} />
                </span>
                <span className="acp-zen-agent-pill">
                  <Agent who="construct" size={20} />
                  Construct
                  <Glyph name="ArrowDown01Icon" size={14} />
                </span>
                <span className="acp-zen-enter">Enter to send</span>
                <span className="acp-zen-tool">
                  <Glyph name="Mic01Icon" size={18} />
                </span>
                <span className="acp-zen-send">
                  <Glyph name="ArrowUp02Icon" size={18} />
                </span>
              </span>
            </div>

            <div className="acp-zen-starters">
              {STARTERS.map(({ icon, label }) => (
                <span key={label} className="acp-zen-chip">
                  <Glyph name={icon} size={14} className="acp-zen-muted" />
                  {label}
                </span>
              ))}
            </div>

            <div className="acp-zen-grid">
              <div className="acp-zen-col">
                <div className="acp-zen-section">
                  <span className="acp-zen-section-head">
                    Needs you <span className="acp-zen-badge">2</span>
                  </span>
                  <div className="acp-zen-card">
                    <div className="acp-zen-need">
                      <Agent who="outreach" size={32} />
                      <span className="acp-zen-need-text">
                        <b>12 replies are ready to send</b>
                        <small>Waiting for your review · 5m ago</small>
                      </span>
                      <span className="acp-zen-button">Review</span>
                    </div>
                    <div className="acp-zen-need">
                      <Agent who="ops" size={32} />
                      <span className="acp-zen-need-text">
                        <b>Send the Acme invoice reminder?</b>
                        <small>Needs your approval · 22m ago</small>
                      </span>
                      <span className="acp-zen-button">Approve</span>
                    </div>
                  </div>
                </div>
                <div className="acp-zen-section">
                  <span className="acp-zen-section-head">
                    Recent chats <span className="acp-zen-link">View all</span>
                  </span>
                  <div className="acp-zen-card">
                    {[
                      ["Competitor pricing", "9:38 AM"],
                      ["Score the new leads", "Yesterday"],
                      ["Monday briefing", "Mon"],
                    ].map(([title, time]) => (
                      <div key={title} className="acp-zen-chat">
                        <Glyph
                          name="BubbleChatIcon"
                          size={16}
                          className="acp-zen-subtle"
                        />
                        <span className="acp-zen-chat-title">{title}</span>
                        <span className="acp-zen-status" />
                        <span className="acp-zen-time">{time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="acp-zen-col">
                <div className="acp-zen-section">
                  <span className="acp-zen-section-head">Running now</span>
                  <div className="acp-zen-card">
                    <div className="acp-zen-need">
                      <Agent who="research" size={32} />
                      <span className="acp-zen-need-text">
                        <b>Checking competitor pricing</b>
                        <small>Research · started 2m ago</small>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="acp-zen-section">
                  <span className="acp-zen-section-head">
                    Coming up <span className="acp-zen-link">Automations</span>
                  </span>
                  <div className="acp-zen-card">
                    {[
                      ["Mon", "9:00", "Monday briefing", "Ops · Every Monday"],
                      [
                        "Tue",
                        "8:00",
                        "Score new leads",
                        "Outreach · Every weekday",
                      ],
                    ].map(([day, time, title, meta]) => (
                      <div key={title} className="acp-zen-need">
                        <span className="acp-zen-when">
                          <small>{day}</small>
                          <b>{time}</b>
                        </span>
                        <span className="acp-zen-need-text">
                          <b>{title}</b>
                          <small>{meta}</small>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
