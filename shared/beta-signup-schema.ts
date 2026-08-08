import { z } from "zod";

import { isLegitPersonName } from "./person-name";

export const CTA_SOURCES = [
  "hero",
  "nav",
  "footer",
  "about",
  "guide",
  "workflow-research",
  "workflow-channels",
  "pricing-lite",
  "pricing-starter",
  "pricing-pro",
] as const;

export const REFERRAL_SOURCES = [
  "twitter",
  "reddit",
  "hackernews",
  "producthunt",
  "linkedin",
  "discord",
  "other",
] as const;

/** Allowlisted campaign / identity fields for Listmonk attribs.
 * Browser Turnstile posts strip constructUserId / authProvider / subscribedVia
 * / username server-side; those are ingest-only.
 */
export const signupMetaSchema = z
  .object({
    subscribedVia: z.string().trim().min(1).max(64).optional(),
    authProvider: z.string().trim().min(1).max(32).optional(),
    constructUserId: z.string().trim().min(1).max(64).optional(),
    /** Construct account username — ingest-only. */
    username: z.string().trim().min(1).max(64).optional(),
    campaignRef: z.string().trim().min(1).max(64).optional(),
    campaignId: z.string().trim().min(1).max(64).optional(),
    campaignSubscriberId: z.string().trim().min(1).max(64).optional(),
    utmSource: z.string().trim().min(1).max(64).optional(),
    utmMedium: z.string().trim().min(1).max(64).optional(),
    utmCampaign: z.string().trim().min(1).max(64).optional(),
    utmContent: z.string().trim().min(1).max(64).optional(),
    promoCode: z.string().trim().min(1).max(16).optional(),
    landingPath: z.string().trim().min(1).max(128).optional(),
  })
  .strict()
  .optional();

export const betaSignupSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    /** Required person name — forwarded to Listmonk, not stored in D1. */
    name: z.string().trim().min(2).max(200),
    ctaSource: z.string().min(1),
    /**
     * Optional on the newsletter footer form. When omitted we store
     * referral=other / referralOther=newsletter for the existing D1 shape.
     */
    referral: z.enum(REFERRAL_SOURCES).optional(),
    referralOther: z.string().trim().min(2).max(120).optional(),
    /** Required for browser Turnstile submissions; omitted for server ingest. */
    turnstileToken: z.string().min(1).max(2048).optional(),
    honeypot: z.string().max(200).optional(),
    meta: signupMetaSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (!isLegitPersonName(value.name, value.email)) {
      context.addIssue({
        code: "custom",
        path: ["name"],
        message: "A real name is required (not your email address)",
      });
    }
    if (value.referral === "other" && !value.referralOther) {
      context.addIssue({
        code: "custom",
        path: ["referralOther"],
        message: "Required for other referrals",
      });
    }
  });

export type BetaSignup = z.infer<typeof betaSignupSchema>;
export type SignupMeta = NonNullable<BetaSignup["meta"]>;
export type CtaSource = BetaSignup["ctaSource"];
export type ReferralSource = BetaSignup["referral"];
