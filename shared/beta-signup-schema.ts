import { z } from "zod";

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

export const betaSignupSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    ctaSource: z.string().min(1),
    referral: z.enum(REFERRAL_SOURCES),
    referralOther: z.string().trim().min(2).max(120).optional(),
    turnstileToken: z.string().min(1).max(2048),
    honeypot: z.string().max(200).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.referral === "other" && !value.referralOther) {
      context.addIssue({
        code: "custom",
        path: ["referralOther"],
        message: "Required for other referrals",
      });
    }
  });

export type BetaSignup = z.infer<typeof betaSignupSchema>;
export type CtaSource = BetaSignup["ctaSource"];
export type ReferralSource = BetaSignup["referral"];
