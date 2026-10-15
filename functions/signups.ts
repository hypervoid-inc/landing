import type { BetaSignup } from "../shared/beta-signup-schema";
import { buildListmonkAttribs, subscribeListmonk } from "./listmonk";
import type { BetaSignupEnv } from "./types";

function referralOf(data: BetaSignup) {
  const referral = data.referral ?? "other";
  const referralOther =
    referral === "other" ? (data.referralOther ?? "newsletter") : null;
  return { referral, referralOther };
}

function resolveSubscribedVia(data: BetaSignup): string {
  if (data.meta?.subscribedVia) return data.meta.subscribedVia;
  if (data.ctaSource.startsWith("auth-")) return "construct_auth";
  if (data.ctaSource === "footer") return "landing_footer";
  return data.ctaSource;
}

/** The Listmonk subscriber for a lead, with its first-touch attribs. */
export async function pushSignupToListmonk(
  env: BetaSignupEnv,
  data: BetaSignup,
): Promise<boolean> {
  const { referral, referralOther } = referralOf(data);
  const meta = data.meta ?? {};
  const listmonk = await subscribeListmonk(
    env,
    data.email,
    data.name,
    buildListmonkAttribs({
      ctaSource: data.ctaSource,
      referral,
      referralOther,
      subscribedVia: resolveSubscribedVia(data),
      authProvider: meta.authProvider,
      constructUserId: meta.constructUserId,
      username: meta.username,
      campaignRef: meta.campaignRef,
      campaignId: meta.campaignId,
      campaignSubscriberId: meta.campaignSubscriberId,
      utmSource: meta.utmSource,
      utmMedium: meta.utmMedium,
      utmCampaign: meta.utmCampaign,
      utmContent: meta.utmContent,
      promoCode: meta.promoCode,
      landingPath: meta.landingPath,
    }),
  );
  return listmonk.ok;
}
