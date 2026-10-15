import type { EmbedEnv } from "./types";

/**
 * The email a Night Shift claim sends: the free month's code, a button that
 * opens the site with the code attached (the site keeps it for checkout and
 * shows the welcome), and how to redeem it. Sent through Cloudflare Email
 * Service's REST API, since Pages Functions can't hold a `send_email`
 * binding. Nothing about the recipient is logged.
 */

const SITE = "https://construct.computer";
const DEFAULT_FROM = "noreply@construct.computer";
const DEFAULT_FROM_NAME = "Construct";

export type ClaimEmailInput = {
  to: string;
  firstName?: string;
  code: string;
  /** The post the viewer came from, carried into the link's campaign tag. */
  src: string;
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** A first name fit for a greeting: letters, spaces, hyphens and apostrophes, or nothing. */
export function greetingName(raw: string | undefined): string | undefined {
  const name = raw?.trim().split(/\s+/)[0]?.slice(0, 24) ?? "";
  return /^[\p{L}][\p{L}'-]*$/u.test(name) ? name : undefined;
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

export function renderClaimEmail(input: ClaimEmailInput, replyable: boolean) {
  const name = greetingName(input.firstName);
  const link = claimLink(input.code, input.src);
  const code = escapeHtml(input.code);
  const subject = "Your free month of Construct Pro (code inside)";
  const preheader = `Code ${input.code} takes your first month of Pro to $0. Here's how to use it tonight.`;
  const reply = replyable
    ? "If anything gets in the way, reply to this email and a real person on the team will answer."
    : "";

  const text = [
    name ? `Hi ${name},` : "Hi there,",
    "",
    "Thanks for sitting through the night shift. As promised, your first month of Construct Pro is on us. Here's the code that makes it free:",
    "",
    `    ${input.code}`,
    "",
    `Start your free month: ${link}`,
    "",
    "How to use it",
    "1. Open the link above. The code is already attached, so there's nothing to type.",
    "2. Sign up with Google or your email. It takes about a minute.",
    `3. Choose Pro, billed monthly. Checkout applies ${input.code} and your first month comes to $0.`,
    "",
    "What to hand it first",
    "Whatever you'd otherwise finish at 11 pm: a pricing brief on your competitors, a pile of leads to score, an invoice to chase. It works on its own computer while you sleep and saves the one question that needs you for the morning.",
    ...(reply ? ["", reply] : []),
    "",
    "The code covers your first month of Pro on the monthly plan, and you can cancel anytime from your account before it renews.",
    "",
    "You're getting this because you claimed a free month in Construct's Night Shift demo.",
    "Construct Computer, construct.computer",
  ].join("\n");

  const step = (n: number, body: string) =>
    `<tr><td valign="top" style="padding:0 12px 12px 0;font:700 15px/22px Arial,Helvetica,sans-serif;color:#01b4c8;">${n}.</td><td style="padding:0 0 12px;font:15px/22px Arial,Helvetica,sans-serif;color:#3d3a3a;">${body}</td></tr>`;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#eef6f8;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef6f8;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #d9eef2;">
  <tr><td style="background:#ffd23f;padding:22px 32px 20px;border-bottom:3px dashed #0d1630;">
    <div style="font:700 12px/16px 'Courier New',Courier,monospace;letter-spacing:2px;color:#0d1630;">NIGHT SHIFT PASS</div>
    <div style="font:800 30px/34px Arial,Helvetica,sans-serif;color:#0d1630;padding-top:6px;">First month free</div>
  </td></tr>
  <tr><td style="padding:30px 32px 8px;font:16px/24px Arial,Helvetica,sans-serif;color:#3d3a3a;">
    <p style="margin:0 0 14px;">${name ? `Hi ${escapeHtml(name)},` : "Hi there,"}</p>
    <p style="margin:0 0 22px;">Thanks for sitting through the night shift. As promised, your first month of Construct Pro is on us. Here's the code that makes it free:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="border:2px dashed #9fe6ef;background:#f3fdff;border-radius:14px;padding:16px;font:700 26px/32px 'Courier New',Courier,monospace;letter-spacing:4px;color:#235061;">${code}</td></tr></table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 8px;"><tr><td align="center">
      <a href="${escapeHtml(link)}" style="display:inline-block;background:#01b4c8;color:#ffffff;text-decoration:none;font:700 17px/22px Arial,Helvetica,sans-serif;padding:15px 34px;border-radius:999px;">Start my free month</a>
    </td></tr></table>
  </td></tr>
  <tr><td style="padding:18px 32px 4px;">
    <div style="font:700 17px/24px Arial,Helvetica,sans-serif;color:#0d1630;padding-bottom:10px;">How to use it</div>
    <table role="presentation" cellpadding="0" cellspacing="0">
      ${step(1, "Tap the button above. The code is already attached, so there's nothing to type.")}
      ${step(2, "Sign up with Google or your email. It takes about a minute.")}
      ${step(3, `Choose Pro, billed monthly. Checkout applies <b>${code}</b> and your first month comes to $0.`)}
    </table>
  </td></tr>
  <tr><td style="padding:10px 32px 4px;font:15px/22px Arial,Helvetica,sans-serif;color:#3d3a3a;">
    <div style="font:700 17px/24px Arial,Helvetica,sans-serif;color:#0d1630;padding-bottom:8px;">What to hand it first</div>
    <p style="margin:0 0 16px;">Whatever you'd otherwise finish at 11 pm: a pricing brief on your competitors, a pile of leads to score, an invoice to chase. It works on its own computer while you sleep and saves the one question that needs you for the morning.</p>
    ${reply ? `<p style="margin:0 0 16px;">${reply}</p>` : ""}
  </td></tr>
  <tr><td style="padding:14px 32px 28px;font:13px/19px Arial,Helvetica,sans-serif;color:#6b7f87;border-top:1px solid #e6f1f4;">
    The code covers your first month of Pro on the monthly plan, and you can cancel anytime from your account before it renews.
  </td></tr>
</table>
<p style="max-width:560px;margin:16px auto 0;font:12px/18px Arial,Helvetica,sans-serif;color:#7c8f96;text-align:center;">You're getting this because you claimed a free month in Construct's Night Shift demo.<br>Construct Computer &middot; <a href="${SITE}/" style="color:#7c8f96;">construct.computer</a></p>
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
