import { isDeliverableEmail } from "../shared/deliverable-email";
import type { EmbedEnv } from "./types";

/**
 * Sends one email through Cloudflare Email Service's REST API, since Pages
 * Functions can't hold a `send_email` binding, so DKIM signs as
 * construct.computer and DMARC aligns. Shared by every email the site sends.
 * Nothing about the recipient is logged.
 */

const DEFAULT_FROM = "hello@construct.computer";
const DEFAULT_FROM_NAME = "Construct Computer";

export type EmailEnv = Pick<
  EmbedEnv,
  | "EMAIL_API_TOKEN"
  | "CLOUDFLARE_ACCOUNT_ID"
  | "EMBED_EMAIL_FROM"
  | "EMBED_EMAIL_FROM_NAME"
  | "EMBED_EMAIL_REPLY_TO"
>;

export type OutgoingEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** `content` is base64. The whole message, encoded, must stay under 5 MiB. */
  attachments?: Array<{ filename: string; type: string; content: string }>;
};

/** Where replies go, when a mailbox for them is configured. */
export function replyAddress(env: EmailEnv): string | undefined {
  return env.EMBED_EMAIL_REPLY_TO?.trim() || undefined;
}

/**
 * Resolves to whether Cloudflare accepted the email; never throws. `label`
 * names the email in the logs, such as `claim_email`.
 */
export async function sendEmail(env: EmailEnv, label: string, email: OutgoingEmail): Promise<boolean> {
  const token = env.EMAIL_API_TOKEN?.trim();
  const account = env.CLOUDFLARE_ACCOUNT_ID?.trim();
  if (!token || !account) {
    console.warn(`${label} skipped: EMAIL_API_TOKEN or CLOUDFLARE_ACCOUNT_ID unset`);
    return false;
  }
  if (!isDeliverableEmail(email.to)) {
    console.warn(`${label} skipped: reserved test domain`);
    return false;
  }
  const replyTo = replyAddress(env);
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/email/sending/send`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          to: email.to,
          from: {
            address: env.EMBED_EMAIL_FROM?.trim() || DEFAULT_FROM,
            name: env.EMBED_EMAIL_FROM_NAME?.trim() || DEFAULT_FROM_NAME,
          },
          ...(replyTo ? { reply_to: replyTo } : {}),
          subject: email.subject,
          html: email.html,
          text: email.text,
          ...(email.attachments?.length
            ? { attachments: email.attachments.map((file) => ({ ...file, disposition: "attachment" })) }
            : {}),
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
      console.error(`${label} failed`, { status: response.status, code: reason?.code, message: reason?.message });
      return false;
    }
    if (body.result?.permanent_bounces?.length) {
      console.warn(`${label} bounced`);
      return false;
    }
    return true;
  } catch {
    console.error(`${label} failed: network`);
    return false;
  }
}

/** Base64 for an attachment, in chunks so a few MiB doesn't overflow the call stack. */
export function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}
