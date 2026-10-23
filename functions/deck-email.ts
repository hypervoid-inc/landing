import { figmaDeck } from "../app/features/deck/slides.figma.ts";
import { DECK_PDF_FILENAME } from "../shared/deck-schema";
import { replyAddress, sendEmail, toBase64, type EmailEnv } from "./email";
import { keyedHash } from "./embed-session";

/**
 * The email the investor deck's "Download PDF" sends: a short note from the
 * founders with the deck attached, and a link back to the live deck carrying
 * this reader's `?r=`, so a return visit says who it is. Same build as the
 * claim email
 * (`claim-email.ts`): one-to-one and asked for, table layout with inline
 * styles, every link on construct.computer, YouTube or our own profiles, no
 * tracking pixel, and a plain-text part that says the same.
 */

const SITE = "https://construct.computer";
const ICON = `${SITE}/assets/email/construct-icon.png?v=2`;
const ADDRESS = "2261 Market Street STE 68707, San Francisco, CA 94114";
const DEMO = "https://www.youtube.com/watch?v=0lQWyT4PAA8";
const REPLY_FALLBACK = "hello@construct.computer";

/**
 * Construct with the investor code, tagged with who the email went to, so a
 * signup from it is credited to their link like a visit to the deck is.
 */
export function tryLink(recipient: string): string {
  return `${SITE}/?${new URLSearchParams({ promo: "SEEDINVEST", utm_source: "deck", utm_medium: "email", r: recipient })}`;
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** A recipient id for an address that came without one: stable, and not the address. */
export async function recipientForEmail(secret: string, email: string): Promise<string> {
  return `e-${(await keyedHash(secret, "deck-recipient", email)).slice(0, 12)}`;
}

/** The live deck, tagged with who the email went to. */
export function deckLink(recipient: string): string {
  return `${SITE}/deck/?${new URLSearchParams({ r: recipient })}`;
}

export function renderDeckEmail(replyable: boolean, recipient: string) {
  const subject = "The Construct Computer deck";
  const preheader = "Our pre-seed deck is attached.";
  const link = deckLink(recipient);
  const TRY = tryLink(recipient);
  const code = "SEEDINVEST";
  const thanks = "Thanks for taking a look at Construct.";
  const attached = "Our deck is attached.";
  // The round comes from the deck's ask slide (`pnpm deck:sync`).
  const pitch =
    `In short: AI employees for small teams, each with its own desktop, turning recurring work into reusable workflows. We're raising a ${figmaDeck.raise} pre-seed.`;
  const ask = replyable
    ? "Questions? Just reply and it comes straight to both of us."
    : `Questions? Write to ${REPLY_FALLBACK} and it comes straight to both of us.`;
  const latest = "The latest version is always online";
  const latestNote = "We update the deck as we go.";

  const text = [
    "Hi there,",
    "",
    `${thanks} ${attached}`,
    "",
    pitch,
    "",
    `Watch the demo: ${DEMO}`,
    `Try it yourself with code ${code}: ${TRY}`,
    "",
    ask,
    "",
    "Ankush and Nischal",
    "Founders, Construct Computer",
    "",
    `${latest}: ${link}`,
    latestNote,
    "",
    "--",
    "Construct Computer",
    ADDRESS,
    `${SITE}/  ·  X: https://x.com/use_construct  ·  LinkedIn: https://www.linkedin.com/company/construct-computer`,
    "",
    "You're receiving this because you asked for our deck at construct.computer/deck.",
  ].join("\n");

  const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
  const ink = "#0d1630";
  const body = "#3d4457";
  const muted = "#5d6577";
  const line = "#dde2ec";
  const paragraph = (value: string, bottom = 14) =>
    `<p style="margin:0 0 ${bottom}px;font:400 16px/25px ${font};color:${body};">${value}</p>`;
  const inline = (href: string, label: string) =>
    `<a href="${escapeHtml(href)}" style="color:#2a44a8;text-decoration:underline;">${label}</a>`;
  const footLink = (href: string, label: string) =>
    `<a href="${href}" style="color:${muted};text-decoration:underline;">${label}</a>`;
  const dot = `<span style="color:#a3aabb;">&nbsp;&nbsp;&middot;&nbsp;&nbsp;</span>`;
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
<tr><td class="px" style="padding:32px 36px 30px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="padding:0 12px 0 0;line-height:0;"><img src="${ICON}" width="36" height="36" alt="" style="display:block;width:36px;height:36px;border-radius:9px;"></td>
<td style="font:650 19px/36px ${font};color:${ink};letter-spacing:-0.01em;">Construct Computer</td>
</tr></table>
<div style="height:26px;line-height:26px;font-size:0;">&nbsp;</div>
${paragraph("Hi there,", 6)}
${paragraph(`${escapeHtml(thanks)} <strong style="font-weight:700;color:${ink};">${escapeHtml(attached)}</strong>`)}
${paragraph(escapeHtml(pitch))}
${paragraph(`${inline(DEMO, "Watch the demo")}, or ${inline(TRY, "try it yourself")} with code <strong style="color:${ink};">${code}</strong>.`)}
${paragraph(escapeHtml(ask), 22)}
<p style="margin:0;font:600 16px/24px ${font};color:${ink};">Ankush and Nischal</p>
<p style="margin:0;font:400 14px/22px ${font};color:${muted};">Founders, Construct Computer</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f6fb" style="margin-top:28px;background:#f4f6fb;border:1px solid #e6e9f0;border-radius:12px;border-collapse:separate;">
<tr>
<td valign="middle" style="padding:16px 12px 16px 18px;">
<p style="margin:0;font:600 15px/22px ${font};color:${ink};">${escapeHtml(latest)}</p>
<p style="margin:2px 0 0;font:400 13px/20px ${font};color:${muted};">${escapeHtml(latestNote)}</p>
</td>
<td align="right" valign="middle" style="padding:16px 18px 16px 0;white-space:nowrap;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td bgcolor="#ffffff" style="background:#ffffff;border:1px solid ${line};border-radius:999px;">
<a href="${escapeHtml(link)}" style="display:inline-block;padding:8px 16px;font:600 14px/20px ${font};color:${ink};text-decoration:none;border-radius:999px;white-space:nowrap;">Open deck &rarr;</a>
</td>
</tr></table>
</td>
</tr>
</table>
</td></tr>
</table>
<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;">
<tr><td align="center" style="padding:28px 16px 0;font:400 12px/20px ${font};color:${muted};">
${footLink(`${SITE}/`, "Website")}${dot}${footLink("https://x.com/use_construct", "X")}${dot}${footLink("https://www.linkedin.com/company/construct-computer", "LinkedIn")}
</td></tr>
<tr><td align="center" style="padding:14px 16px 0;font:400 12px/19px ${font};color:${muted};">
You're receiving this because you asked for our deck at construct.computer/deck.
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
 * Sends the deck with `pdf` attached and a link to the live deck for
 * `recipient`. Resolves to whether Cloudflare accepted it; never throws.
 */
export async function sendDeckEmail(
  env: EmailEnv,
  to: string,
  recipient: string,
  pdf: Uint8Array,
): Promise<boolean> {
  const { subject, html, text } = renderDeckEmail(Boolean(replyAddress(env)), recipient);
  return sendEmail(env, "deck_email", {
    to,
    subject,
    html,
    text,
    attachments: [{ filename: DECK_PDF_FILENAME, type: "application/pdf", content: toBase64(pdf) }],
  });
}
