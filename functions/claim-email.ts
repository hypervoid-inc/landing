import type { EmbedJob } from "../shared/embed-schema";
import { isDeliverableEmail } from "../shared/deliverable-email";
import type { EmbedEnv } from "./types";

/**
 * The email a Night Shift claim sends, written around the job the viewer
 * handed over first in the show. Built for the inbox rather than the
 * Promotions tab or spam: one-to-one and triggered by the viewer, sent from
 * a mailbox that takes replies, table layout with inline styles, one hero
 * image and a small icon hosted on construct.computer (JPG and PNG, sized,
 * with alt text), every link on construct.computer or our own social
 * profiles, no tracking pixel or redirect, a plain-text part that says the
 * same, and a body well under Gmail's 102 KB clip. Sent through Cloudflare
 * Email Service's REST API, since Pages Functions can't hold a `send_email`
 * binding, so DKIM signs as construct.computer and DMARC aligns. Nothing
 * about the recipient is logged.
 */

const SITE = "https://construct.computer";
const DEFAULT_FROM = "hello@construct.computer";
const DEFAULT_FROM_NAME = "Construct Computer";
// Bump when either image changes: mail clients and their image proxies cache
// by URL, so a new version is the only way to replace one already fetched.
const ASSET_VERSION = "2";
const HERO = `${SITE}/assets/email/night-shift.jpg?v=${ASSET_VERSION}`;
const ICON = `${SITE}/assets/email/construct-icon.png?v=${ASSET_VERSION}`;
const ADDRESS = "2261 Market Street STE 68707, San Francisco, CA 94114";

export type ClaimEmailInput = {
  to: string;
  firstName?: string;
  code: string;
  /** The post the viewer came from, carried into the link's campaign tag. */
  src: string;
  /** The job the viewer handed over first in the show. */
  job?: EmbedJob;
};

/** How each of the show's jobs reads in the email: what they handed it, and the real-life version. */
const JOBS: Record<EmbedJob, { handed: string; real: string }> = {
  brief: { handed: "the pricing brief on five competitors", real: "A pricing brief on your competitors" },
  leads: { handed: "the 40 new leads to score", real: "Scoring your newest leads" },
  tracker: { handed: "a tracker for those leads", real: "A tracker for your pipeline" },
  ask: { handed: "the Acme invoice to chase", real: "Chasing an unpaid invoice" },
  monday: { handed: "a Monday briefing", real: "A briefing every Monday morning" },
};
const DEFAULT_LIST: EmbedJob[] = ["brief", "leads", "ask"];

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** A first name fit for a greeting: letters, hyphens and apostrophes, capitalised, or nothing. */
export function greetingName(raw: string | undefined): string | undefined {
  const name = raw?.trim().split(/\s+/)[0]?.slice(0, 24) ?? "";
  if (!/^[\p{L}][\p{L}'-]*$/u.test(name)) return undefined;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function claimLink(code: string, src: string): string {
  const params = new URLSearchParams({
    promo: code,
    utm_source: "email",
    utm_medium: "night_shift",
    utm_campaign: src,
  });
  return `${SITE}/?${params}`;
}

/** Their pick first, then the usual first jobs, three in all. */
function jobList(job: EmbedJob | undefined): Array<{ key: EmbedJob; mine: boolean }> {
  const keys = job ? [job, ...DEFAULT_LIST.filter((k) => k !== job)] : DEFAULT_LIST;
  return keys.slice(0, 3).map((key) => ({ key, mine: key === job }));
}

export function renderClaimEmail(input: ClaimEmailInput, replyable: boolean) {
  const name = greetingName(input.firstName);
  const link = claimLink(input.code, input.src);
  const code = input.code;
  const hi = name ? `Hi ${name},` : "Hi there,";
  const subject = "Your first night shift is on us";
  const preheader = name
    ? `${name}, hand it tonight's work. Your first month of Construct Pro is on us.`
    : "Hand it tonight's work. Your first month of Construct Pro is on us.";
  const intro = input.job
    ? `In the demo you handed Construct ${JOBS[input.job].handed} first. Tonight it can do the real thing with your own work while you sleep, and your first month of Pro is on us.`
    : "Your first month of Construct Pro is on us. Give it the work you'd otherwise finish at 11 pm, then read the report with your morning coffee.";
  const list = jobList(input.job);
  const reply = replyable ? " Questions? Just reply to this email." : "";

  const text = [
    hi,
    "",
    intro,
    "",
    `Your code: ${code}`,
    "It's applied automatically when you claim it.",
    "",
    `Start my free month: ${link}`,
    "",
    "Worth handing it tonight:",
    ...list.map(({ key, mine }) => `- ${JOBS[key].real}${mine ? " (your pick)" : ""}`),
    "",
    `The code works on any plan, Pro included, and you can cancel anytime before it renews.${reply}`,
    "",
    "Construct Computer",
    ADDRESS,
    `${SITE}/  ·  X: https://x.com/use_construct  ·  LinkedIn: https://www.linkedin.com/company/construct-computer  ·  Discord: https://discord.gg/puArEQHYN9`,
    "",
    "You're receiving this because you claimed a free month in Construct Computer's Night Shift demo.",
  ].join("\n");

  const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
  const mono = "ui-monospace,SFMono-Regular,Menlo,Consolas,'Courier New',monospace";
  const ink = "#0d1630";
  const body = "#3d4457";
  const muted = "#5d6577";
  const line = "#dde2ec";
  const footLink = (href: string, label: string) =>
    `<a href="${href}" style="color:${muted};text-decoration:underline;">${label}</a>`;
  const dot = `<span style="color:#a3aabb;">&nbsp;&nbsp;&middot;&nbsp;&nbsp;</span>`;
  const items = list
    .map(
      ({ key, mine }) => `<tr>
<td width="24" valign="top" style="padding:0 0 10px;font:600 15px/22px ${font};color:#2a44a8;">&#10003;</td>
<td valign="top" style="padding:0 0 10px;font:${mine ? 600 : 400} 15px/22px ${font};color:${mine ? ink : body};">${escapeHtml(JOBS[key].real)}${mine ? `&nbsp;&nbsp;<span style="display:inline-block;padding:1px 8px;border-radius:999px;background:#e8ecfb;color:#2a44a8;font:600 11px/18px ${font};letter-spacing:0.02em;vertical-align:1px;">Your pick</span>` : ""}</td>
</tr>`,
    )
    .join("\n");

  // Invisible filler after the preheader keeps the body from leaking into the inbox preview.
  const filler = "&#847;&zwnj;&nbsp;".repeat(60);

  const html = `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(subject)}</title>
<style>
body{margin:0;padding:0;-webkit-text-size-adjust:100%;}
img{border:0;outline:none;text-decoration:none;}
a{color:#2a44a8;}
@media (max-width:600px){.px{padding-left:24px!important;padding-right:24px!important;}.outer{padding:16px 10px 24px!important;}}
</style>
</head>
<body style="margin:0;padding:0;background:#eef1f6;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(preheader)}${filler}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#eef1f6" style="background:#eef1f6;">
<tr><td align="center" class="outer" style="padding:32px 16px 40px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;background:#ffffff;border:1px solid ${line};border-radius:16px;border-collapse:separate;">
<tr><td style="padding:0;line-height:0;font-size:0;">
<img src="${HERO}" width="560" height="350" alt="One month on us. Construct's mascot on a glowing monitor at night." style="display:block;width:100%;max-width:560px;height:auto;border-radius:16px 16px 0 0;">
</td></tr>
<tr><td class="px" style="padding:30px 36px 32px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="padding:0 10px 0 0;line-height:0;"><img src="${ICON}" width="24" height="24" alt="" style="display:block;width:24px;height:24px;border-radius:6px;"></td>
<td style="font:600 13px/24px ${font};color:${ink};letter-spacing:0.02em;">Construct Computer</td>
</tr></table>
<h1 style="margin:16px 0 12px;font:650 26px/32px ${font};letter-spacing:-0.02em;color:${ink};">Hand it tonight's work.</h1>
<p style="margin:0 0 6px;font:400 15px/24px ${font};color:${body};">${escapeHtml(hi)}</p>
<p style="margin:0 0 24px;font:400 15px/24px ${font};color:${body};">${escapeHtml(intro)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f7f8fb" style="background:#f7f8fb;border:1px solid ${line};border-radius:12px;border-collapse:separate;">
<tr>
<td style="padding:14px 18px;font:400 13px/20px ${font};color:${muted};">Your code</td>
<td align="right" style="padding:14px 18px;font:600 16px/20px ${mono};letter-spacing:0.14em;color:${ink};">${escapeHtml(code)}</td>
</tr>
</table>
<p style="margin:8px 0 20px;font:400 13px/20px ${font};color:${muted};">Applied automatically when you claim it.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td align="center" bgcolor="${ink}" style="border-radius:10px;background:${ink};">
<a href="${escapeHtml(link)}" style="display:block;padding:15px 20px;font:600 15px/20px ${font};color:#ffffff;text-decoration:none;border-radius:10px;">Start my free month</a>
</td>
</tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:30px;border-top:1px solid #e6e9f0;">
<tr><td style="padding:22px 0 12px;font:600 13px/20px ${font};color:${ink};">Worth handing it tonight</td></tr>
<tr><td><table role="presentation" cellpadding="0" cellspacing="0" border="0">
${items}
</table></td></tr>
</table>
</td></tr>
</table>
<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;">
<tr><td align="center" style="padding:28px 16px 0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="padding:0 8px 0 0;line-height:0;"><img src="${ICON}" width="20" height="20" alt="" style="display:block;width:20px;height:20px;border-radius:5px;"></td>
<td style="font:600 13px/20px ${font};color:${ink};">Construct Computer</td>
</tr></table>
</td></tr>
<tr><td align="center" style="padding:14px 16px 0;font:400 12px/20px ${font};color:${muted};">
${footLink(`${SITE}/`, "Website")}${dot}${footLink(`${SITE}/pricing/`, "Pricing")}${dot}${footLink(`${SITE}/blog/`, "Blog")}${dot}${footLink(`${SITE}/support/`, "Support")}
</td></tr>
<tr><td align="center" style="padding:6px 16px 0;font:400 12px/20px ${font};color:${muted};">
${footLink("https://x.com/use_construct", "X")}${dot}${footLink("https://www.linkedin.com/company/construct-computer", "LinkedIn")}${dot}${footLink("https://discord.gg/puArEQHYN9", "Discord")}
</td></tr>
<tr><td align="center" style="padding:18px 16px 0;font:400 12px/19px ${font};color:${muted};">
The code works on any plan, Pro included, and you can cancel anytime before it renews.${escapeHtml(reply)}<br>
You're receiving this because you claimed a free month in Construct Computer's Night Shift demo.
</td></tr>
<tr><td align="center" style="padding:12px 16px 0;font:400 12px/19px ${font};color:${muted};">
Construct Computer, ${escapeHtml(ADDRESS)}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  return { subject, html, text };
}

/**
 * Sends the claim email. Resolves to whether Cloudflare accepted it; never
 * throws, since the code is already on the viewer's screen either way.
 */
export async function sendClaimEmail(env: EmbedEnv, input: ClaimEmailInput): Promise<boolean> {
  const token = env.EMAIL_API_TOKEN?.trim();
  const account = env.CLOUDFLARE_ACCOUNT_ID?.trim();
  if (!token || !account) {
    console.warn("claim_email skipped: EMAIL_API_TOKEN or CLOUDFLARE_ACCOUNT_ID unset");
    return false;
  }
  if (!isDeliverableEmail(input.to)) {
    console.warn("claim_email skipped: reserved test domain");
    return false;
  }
  const replyTo = env.EMBED_EMAIL_REPLY_TO?.trim();
  const { subject, html, text } = renderClaimEmail(input, Boolean(replyTo));
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/email/sending/send`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          to: input.to,
          from: {
            address: env.EMBED_EMAIL_FROM?.trim() || DEFAULT_FROM,
            name: env.EMBED_EMAIL_FROM_NAME?.trim() || DEFAULT_FROM_NAME,
          },
          ...(replyTo ? { reply_to: replyTo } : {}),
          subject,
          html,
          text,
        }),
      },
    );
    const body = (await response.json().catch(() => null)) as {
      success?: boolean;
      errors?: Array<{ code?: number; message?: string }>;
      result?: { permanent_bounces?: string[] };
    } | null;
    if (!response.ok || !body?.success) {
      const reason = body?.errors?.[0];
      console.error("claim_email failed", { status: response.status, code: reason?.code, message: reason?.message });
      return false;
    }
    if (body.result?.permanent_bounces?.length) {
      console.warn("claim_email bounced");
      return false;
    }
    return true;
  } catch {
    console.error("claim_email failed: network");
    return false;
  }
}
