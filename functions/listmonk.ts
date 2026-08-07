/**
 * Listmonk subscribe with attribs.
 *
 * Public `/api/public/subscription` cannot set attribs (by design). When API
 * credentials are configured we use the private subscribers API so source /
 * campaign fields land on the subscriber record. Falls back to public subscribe
 * (no attribs) when credentials are missing.
 *
 * Returns `{ ok }` so Construct can mark newsletter sync only when Listmonk
 * actually succeeded (or was intentionally skipped — empty base URL).
 */

import { isLegitPersonName } from "../shared/person-name";
import type { BetaSignupEnv } from "./types";

export const DEFAULT_LISTMONK_BASE = "https://listmonk.construct.computer";
export const DEFAULT_NEWSLETTER_LIST_UUID =
  "7c3e7b8c-7e05-4482-a5eb-a20c7505dbf6";

/** Flat string/number attribs Listmonk can query and segment on. */
export type ListmonkAttribs = Record<string, string | number | boolean>;

export type SubscribeListmonkResult = { ok: boolean };

type ListmonkListMembership = { id: number; status?: string };

const FIRST_TOUCH_KEYS = new Set([
  "source",
  "cta_source",
  "referral",
  "referral_other",
  "subscribed_via",
  "subscribed_at",
  "auth_provider",
  "construct_user_id",
  "construct_username",
  "campaign_ref",
  "campaign_id",
  "campaign_subscriber_id",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "promo_code",
  "landing_path",
]);

export function mergeListmonkAttribs(
  existing: ListmonkAttribs,
  incoming: ListmonkAttribs,
): ListmonkAttribs {
  const out: ListmonkAttribs = { ...existing };
  for (const [key, value] of Object.entries(incoming)) {
    if (value === undefined || value === null || value === "") continue;
    if (FIRST_TOUCH_KEYS.has(key) && out[key] !== undefined && out[key] !== "") {
      continue;
    }
    out[key] = value;
  }
  if (incoming.source) out.last_touch_source = String(incoming.source);
  out.last_touch_at = new Date().toISOString();
  return out;
}

export function buildListmonkAttribs(input: {
  ctaSource: string;
  referral: string;
  referralOther: string | null;
  subscribedVia: "landing_footer" | "construct_auth" | string;
  authProvider?: string;
  constructUserId?: string;
  username?: string;
  campaignRef?: string;
  campaignId?: string;
  campaignSubscriberId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  promoCode?: string;
  landingPath?: string;
}): ListmonkAttribs {
  const attribs: ListmonkAttribs = {
    source: input.ctaSource,
    cta_source: input.ctaSource,
    referral: input.referral,
    subscribed_via: input.subscribedVia,
    subscribed_at: new Date().toISOString(),
  };
  if (input.referralOther) attribs.referral_other = input.referralOther;
  if (input.authProvider) attribs.auth_provider = input.authProvider;
  if (input.constructUserId) attribs.construct_user_id = input.constructUserId;
  if (input.username) attribs.construct_username = input.username;
  if (input.campaignRef) attribs.campaign_ref = input.campaignRef;
  if (input.campaignId) attribs.campaign_id = input.campaignId;
  if (input.campaignSubscriberId) {
    attribs.campaign_subscriber_id = input.campaignSubscriberId;
  }
  if (input.utmSource) attribs.utm_source = input.utmSource;
  if (input.utmMedium) attribs.utm_medium = input.utmMedium;
  if (input.utmCampaign) attribs.utm_campaign = input.utmCampaign;
  if (input.promoCode) attribs.promo_code = input.promoCode;
  if (input.landingPath) attribs.landing_path = input.landingPath;
  return attribs;
}

function basicAuth(user: string, token: string): string {
  return `Basic ${btoa(`${user}:${token}`)}`;
}

function listmonkBase(env: BetaSignupEnv): string | null {
  const base = (
    env.LISTMONK_BASE_URL === undefined
      ? DEFAULT_LISTMONK_BASE
      : env.LISTMONK_BASE_URL
  ).trim();
  return base ? base.replace(/\/$/, "") : null;
}

async function resolveNewsletterListId(
  env: BetaSignupEnv,
  base: string,
  auth: string,
): Promise<number | null> {
  const fromEnv = Number(env.LISTMONK_NEWSLETTER_LIST_ID);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;

  const uuid = (
    env.LISTMONK_NEWSLETTER_LIST_UUID ?? DEFAULT_NEWSLETTER_LIST_UUID
  ).trim();
  if (!uuid) return null;

  const response = await fetch(`${base}/api/lists?per_page=all`, {
    headers: { Authorization: auth },
  });
  if (!response.ok) return null;
  const body = (await response.json()) as {
    data?: { results?: Array<{ id: number; uuid: string }> };
  };
  const match = body.data?.results?.find((list) => list.uuid === uuid);
  return match?.id ?? null;
}

async function findSubscriber(
  base: string,
  auth: string,
  email: string,
): Promise<{
  id: number;
  status?: string;
  attribs: ListmonkAttribs;
  lists: ListmonkListMembership[];
} | null> {
  const safe = email.replace(/'/g, "''");
  const url = `${base}/api/subscribers?query=${encodeURIComponent(
    `subscribers.email = '${safe}'`,
  )}&per_page=1`;
  const response = await fetch(url, { headers: { Authorization: auth } });
  if (!response.ok) return null;
  const body = (await response.json()) as {
    data?: {
      results?: Array<{
        id: number;
        status?: string;
        attribs?: ListmonkAttribs | null;
        lists?: ListmonkListMembership[] | null;
      }>;
    };
  };
  const row = body.data?.results?.[0];
  if (!row) return null;

  // Query results sometimes omit lists — fetch the full record when needed.
  let lists = Array.isArray(row.lists) ? row.lists : [];
  let status = row.status;
  if (lists.length === 0 || !status) {
    const detail = await fetch(`${base}/api/subscribers/${row.id}`, {
      headers: { Authorization: auth },
    });
    if (detail.ok) {
      const full = (await detail.json()) as {
        data?: {
          status?: string;
          lists?: ListmonkListMembership[] | null;
          attribs?: ListmonkAttribs | null;
        };
      };
      status = full.data?.status ?? status;
      if (Array.isArray(full.data?.lists)) lists = full.data.lists;
      if (full.data?.attribs && typeof full.data.attribs === "object") {
        return {
          id: row.id,
          status,
          attribs: full.data.attribs,
          lists,
        };
      }
    }
  }

  return {
    id: row.id,
    status,
    attribs:
      row.attribs && typeof row.attribs === "object" ? row.attribs : {},
    lists,
  };
}

async function patchAttribs(
  base: string,
  auth: string,
  subscriberId: number,
  attribs: ListmonkAttribs,
  name: string | undefined,
  displayName: string,
): Promise<boolean> {
  const response = await fetch(`${base}/api/subscribers/${subscriberId}`, {
    method: "PATCH",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      attribs,
      ...(name?.trim() ? { name: displayName } : {}),
    }),
  });
  return response.ok;
}

async function subscribePrivate(
  env: BetaSignupEnv,
  base: string,
  email: string,
  name: string | undefined,
  attribs: ListmonkAttribs,
): Promise<boolean> {
  const user = env.LISTMONK_API_USER?.trim();
  const token = env.LISTMONK_API_TOKEN?.trim();
  if (!user || !token) return false;

  const auth = basicAuth(user, token);
  const listId = await resolveNewsletterListId(env, base, auth);
  if (!listId) return false;

  const displayName = name?.trim() ?? "";
  if (!isLegitPersonName(displayName, email)) return false;

  const create = await fetch(`${base}/api/subscribers`, {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      name: displayName,
      status: "enabled",
      lists: [listId],
      attribs,
      preconfirm_subscriptions: true,
    }),
  });

  if (create.ok) return true;
  if (create.status !== 409) return false;

  const existing = await findSubscriber(base, auth, email);
  if (!existing) return false;

  const merged = mergeListmonkAttribs(existing.attribs, attribs);
  const patched = await patchAttribs(
    base,
    auth,
    existing.id,
    merged,
    name,
    displayName,
  );
  if (!patched) return false;

  // Respect blocklist / prior unsubscribe — attribs updated, do not re-add.
  if (existing.status === "blocklisted") return true;
  const membership = existing.lists.find((list) => list.id === listId);
  if (membership?.status === "unsubscribed") return true;
  if (membership?.status === "confirmed") return true;

  const add = await fetch(`${base}/api/subscribers/lists`, {
    method: "PUT",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ids: [existing.id],
      action: "add",
      target_list_ids: [listId],
      status: "confirmed",
    }),
  });
  return add.ok;
}

async function subscribePublic(
  env: BetaSignupEnv,
  base: string,
  email: string,
  name: string,
): Promise<boolean> {
  if (!isLegitPersonName(name, email)) return false;
  const listUuid = (
    env.LISTMONK_NEWSLETTER_LIST_UUID ?? DEFAULT_NEWSLETTER_LIST_UUID
  ).trim();
  if (!listUuid) return false;
  const response = await fetch(`${base}/api/public/subscription`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      name,
      list_uuids: [listUuid],
    }),
  });
  return response.ok;
}

/**
 * Dual-write to Listmonk. Empty base URL → `{ ok: true }` (explicitly disabled).
 * Failures return `{ ok: false }` so Construct can retry; D1 is already written.
 */
export async function subscribeListmonk(
  env: BetaSignupEnv,
  email: string,
  name: string | undefined,
  attribs: ListmonkAttribs,
): Promise<SubscribeListmonkResult> {
  const base = listmonkBase(env);
  if (!base) return { ok: true };

  const displayName = name?.trim() ?? "";
  if (!isLegitPersonName(displayName, email)) return { ok: false };

  try {
    if (env.LISTMONK_API_USER?.trim() && env.LISTMONK_API_TOKEN?.trim()) {
      return {
        ok: await subscribePrivate(env, base, email, displayName, attribs),
      };
    }
    return { ok: await subscribePublic(env, base, email, displayName) };
  } catch {
    return { ok: false };
  }
}
