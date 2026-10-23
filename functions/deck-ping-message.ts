import type { DeckPingContext, DeckPingSummary } from "../shared/deck-schema";
import type { DeviceDescription } from "./user-agent";

/**
 * The Discord message for one deck visit (`api/deck/ping.ts`), rebuilt on
 * every ping and edited in place, so it reads like a live card. A visit from
 * a tagged link (`?r=`) is someone we sent the deck to: it gets a full card.
 * An untagged one is a forward or a typed URL: a few plain lines. Either
 * shows the reader's email once we know it, from the PDF or an earlier visit.
 */

/** What Cloudflare knows about where a request came from (`request.cf`). */
export type Place = {
  city?: string;
  region?: string;
  country?: string;
  timezone?: string;
  asOrganization?: string;
  asn?: number;
};

type Field = { name: string; value: string; inline?: boolean };

export type DiscordMessage = {
  username: string;
  avatar_url: string;
  content: string;
  embeds: Array<{
    title: string;
    url?: string;
    description?: string;
    color: number;
    author: { name: string; url: string; icon_url: string };
    fields: Field[];
    footer: { text: string };
    timestamp: string;
  }>;
  allowed_mentions: { parse: [] };
};

const SITE = "https://construct.computer";
const ICON = `${SITE}/assets/email/construct-icon.png?v=2`;
const COLOR = { reading: 0x01b4c8, finished: 0x22c55e, left: 0xf59e0b };
/** Our PostHog project (EU cloud); a session id on the end opens its replay. */
const REPLAY = "https://eu.posthog.com/project/144727/replay/";

/** Discord markdown in a value we don't control, made literal. */
const literal = (value: string) => value.replace(/[\\*_~`|>[\]()#@]/g, (c) => `\\${c}`);

function flag(country: string): string {
  if (!/^[A-Z]{2}$/.test(country)) return "";
  return String.fromCodePoint(...[...country].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

function countryName(country: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(country) ?? country;
  } catch {
    return country;
  }
}

function duration(total: number): string {
  const s = Math.round(total);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function clock(total: number): string {
  const s = Math.round(total);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function ordinal(n: number): string {
  const tens = n % 100;
  const suffix = tens >= 11 && tens <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${suffix}`;
}

function ago(then: string, now: Date): string {
  const minutes = Math.max(0, Math.round((now.getTime() - new Date(then).getTime()) / 60_000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  return `${Math.round(hours / 24)} days ago`;
}

function localTime(timezone: string | undefined, now: Date): string | undefined {
  if (!timezone) return undefined;
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short", hour: "numeric", minute: "2-digit" }).format(now);
  } catch {
    return undefined;
  }
}

function where(place: Place): string {
  return [place.city, place.region].filter(Boolean).join(", ");
}

function deviceLine(device: DeviceDescription): string {
  const browser = device.browser ? device.browser.replace(/ \d+$/, "") : "a browser";
  return device.app ? `${browser} inside ${device.app}` : browser;
}

function cameFrom(context: DeckPingContext): string {
  return context.referrer ?? "Direct (email, DM or typed)";
}

/** Seconds on each slide, as bars, slides never shown left out. */
function readingChart(summary: DeckPingSummary, titles: string[]): string | undefined {
  const rows = summary.slides
    .map((seconds, index) => ({ n: index + 1, title: titles[index] ?? `Slide ${index + 1}`, seconds }))
    .filter((row) => row.seconds >= 1);
  if (!rows.length) return undefined;
  const longest = Math.max(...rows.map((row) => row.seconds));
  const lines = rows.map((row) => {
    const filled = Math.max(1, Math.round((row.seconds / longest) * 12));
    const name = row.title.length > 15 ? `${row.title.slice(0, 14)}.` : row.title.padEnd(15);
    return `${String(row.n).padStart(2)} ${name} ${"█".repeat(filled)}${"░".repeat(12 - filled)} ${clock(row.seconds).padStart(5)}`;
  });
  return `\`\`\`\n${lines.join("\n")}\n\`\`\``;
}

const VIDEO_NAMES = { demo: "Demo", launch: "Launch video" } as const;

export function deckPingMessage(input: {
  context: DeckPingContext;
  summary?: DeckPingSummary;
  place: Place;
  device: DeviceDescription;
  titles: string[];
  now?: Date;
}): DiscordMessage {
  const { context, summary, place, device, titles } = input;
  const now = input.now ?? new Date();
  const total = titles.length;
  const seen = summary ? summary.slides.filter((seconds) => seconds >= 1).length : 0;
  const status = !summary
    ? "opened"
    : summary.completed && summary.final
      ? "finished"
      : summary.final
        ? "left"
        : "reading";
  const location = where(place);
  const country = place.country ? `${flag(place.country)} ${countryName(place.country)}`.trim() : "";
  const timezone = place.timezone ?? context.timezone;
  const theirTime = localTime(timezone, now);
  const visit = context.visit === 1 ? "First visit" : `${ordinal(context.visit)} visit`;
  const replay = context.session ? `${REPLAY}${context.session}` : undefined;
  const base = { username: "Construct deck", avatar_url: ICON, allowed_mentions: { parse: [] as [] } };

  const email = summary?.pdfEmail ?? context.email;
  const pdfSent = summary?.pdf === "sent";
  const onSlide = summary?.current && !summary.final ? titles[summary.current - 1] : undefined;

  if (!context.r) {
    const heading = {
      opened: "👀 **Deck opened**",
      reading: "📖 **Deck being read**",
      finished: "✅ **Deck read in full**",
      left: `👋 **Deck closed** after ${seen} of ${total} slides`,
    }[status];
    const lines = [
      `${heading} · untagged link`,
      `📍 ${literal([location, country].filter(Boolean).join(", ")) || "Location unknown"}`,
      `💻 ${device.device}${device.os ? ` · ${device.os}` : ""} · ${deviceLine(device)}`,
      `🔗 ${literal(cameFrom(context))} · ${visit.toLowerCase()}`,
    ];
    if (email) lines.push(`✉️ ${pdfSent ? "PDF sent to " : ""}**${literal(email)}**`);
    if (summary) {
      lines.push(
        `⏱️ ${duration(summary.seconds)} reading · ${seen} of ${total} slides${onSlide ? ` · now on ${literal(onSlide)}` : ""}`,
      );
    }
    // Angle brackets stop Discord unfurling the link into a preview.
    if (replay) lines.push(`🎥 [Watch the session replay](<${replay}>)`);
    return { ...base, content: lines.join("\n"), embeds: [] };
  }

  const who = context.r;
  const title = {
    opened: `👀 ${who} opened the deck`,
    reading: `📖 ${who} is reading the deck`,
    finished: `✅ ${who} read the whole deck`,
    left: `👋 ${who} left after ${seen} of ${total} slides`,
  }[status];
  const description = summary
    ? [
        `**${duration(summary.seconds)}** reading`,
        `**${seen} of ${total}** slides`,
        onSlide ? `now on **${literal(onSlide)}**` : undefined,
      ]
        .filter(Boolean)
        .join(" · ")
    : undefined;

  const fields: Field[] = [
    { name: "🏷️ Link", value: `\`${who}\``, inline: true },
    ...(email ? [{ name: "✉️ Email", value: `**${literal(email)}**${pdfSent ? "\nasked for the PDF" : ""}`, inline: true }] : []),
    { name: "📍 Location", value: [literal(location), country].filter(Boolean).join("\n") || "Unknown", inline: true },
    {
      name: "🕐 Their time",
      value: theirTime ? `${theirTime}\n${literal(timezone ?? "")}` : "Unknown",
      inline: true,
    },
    { name: "💻 Device", value: `${device.device}${device.os ? ` · ${device.os}` : ""}\n${deviceLine(device)}`, inline: true },
    {
      name: "🌐 Network",
      value: place.asOrganization ? `${literal(place.asOrganization)}${place.asn ? `\nAS${place.asn}` : ""}` : "Unknown",
      inline: true,
    },
    {
      name: "🔗 Came from",
      value: [
        literal(cameFrom(context)),
        ...Object.entries(context.utm ?? {}).map(([key, value]) => `utm_${key}: \`${value}\``),
      ].join("\n"),
      inline: true,
    },
    {
      name: "🔁 Visits",
      value: context.lastVisitAt ? `${visit}\nlast one ${ago(context.lastVisitAt, now)}` : visit,
      inline: true,
    },
    {
      name: "📐 Screen",
      value: [context.screen ? `${context.screen.width}×${context.screen.height}` : undefined, context.language].filter(Boolean).join("\n") || "Unknown",
      inline: true,
    },
  ];

  const chart = summary ? readingChart(summary, titles) : undefined;
  if (chart) fields.push({ name: "📊 Time on each slide", value: chart });
  const videos = Object.entries(summary?.videos ?? {}).map(
    ([name, percent]) =>
      `${VIDEO_NAMES[name as keyof typeof VIDEO_NAMES]}: ${percent === 0 ? "pressed play" : percent === 100 ? "watched to the end" : `watched ${percent}%`}`,
  );
  if (videos.length) fields.push({ name: "🎬 Videos", value: videos.join("\n"), inline: true });
  if (summary?.pdf) {
    const pdf = {
      sent: `Sent to **${literal(summary.pdfEmail ?? "their address")}**`,
      failed: "Asked for it; the email didn't go out",
      opened: "Opened the form, didn't send it",
    }[summary.pdf];
    fields.push({ name: "📄 PDF", value: pdf, inline: true });
  }
  if (summary?.links?.length) {
    const names = { try: "Try Construct (code SEEDINVEST)", site: "construct.computer" };
    fields.push({ name: "🖱️ Clicked", value: summary.links.map((link) => names[link]).join("\n"), inline: true });
  }
  if (replay) fields.push({ name: "🎥 Session replay", value: `[Watch it in PostHog](${replay})` });

  return {
    ...base,
    content: "",
    embeds: [
      {
        title,
        ...(replay ? { url: replay } : {}),
        ...(description ? { description } : {}),
        color: status === "finished" ? COLOR.finished : status === "left" ? COLOR.left : COLOR.reading,
        author: { name: "Investor deck", url: `${SITE}/deck/`, icon_url: ICON },
        fields,
        footer: { text: `Deck ${context.version}` },
        timestamp: context.openedAt,
      },
    ],
  };
}
