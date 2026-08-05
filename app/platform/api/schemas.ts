import { z } from "zod";

/**
 * Response contracts for api.construct.computer.
 *
 * Landing and the OS live in separate repos with no shared package, so these
 * types were previously retyped by hand and silently drifted: `prices` instead
 * of `month`/`year`, `ownerUsage` instead of `pool`, `currentPeriodEnd` instead
 * of `periodEnd`. Every one of those rendered as missing UI with no error.
 *
 * Parsing at the boundary makes a drift loud instead of invisible, and catches
 * a server-side shape change too — not just one a rebuild would have noticed.
 * Unknown keys are stripped, not rejected, so the API stays free to add fields.
 */

export const PaidPlanIdSchema = z.enum(["lite", "starter", "pro"]);
export type PaidPlanId = z.infer<typeof PaidPlanIdSchema>;

export const PlanIdSchema = z.enum(["unsubscribed", "lite", "starter", "pro"]);
export type PlanId = z.infer<typeof PlanIdSchema>;

export const BillingIntervalSchema = z.enum(["month", "year"]);
export type BillingInterval = z.infer<typeof BillingIntervalSchema>;

export const PlanLimitsSchema = z.object({
  maxAgents: z.number(),
  multiAgentEnabled: z.boolean(),
  maxConcurrentSessionsPerAgent: z.number(),
  maxIterations: z.number(),
  maxStorageBytes: z.number(),
  maxScheduledTasks: z.number(),
  byokEnabled: z.boolean(),
  nativeEmail: z.boolean().optional(),
  usageRelativeToLite: z.number().optional(),
  /** Local API only. */
  monthlyCapUsd: z.number().optional(),
  sessionCapUsd: z.number().optional(),
});
export type PlanLimits = z.infer<typeof PlanLimitsSchema>;

export const PlanUsageSchema = z.object({
  sessionPct: z.number(),
  monthlyPct: z.number(),
  byokActive: z.boolean().optional(),
  byokFallback: z.boolean().optional(),
  usingBonus: z.boolean().optional(),
  /** Local API only. */
  sessionUsedUsd: z.number().optional(),
  sessionCapUsd: z.number().optional(),
  monthlyUsedUsd: z.number().optional(),
  monthlyCapUsd: z.number().optional(),
  topupCreditsUsd: z.number().optional(),
});
export type PlanUsage = z.infer<typeof PlanUsageSchema>;

/** Owner-pool totals. The API calls this `pool` — not `ownerUsage`. */
export const OwnerUsagePoolSchema = z.object({
  agentsUsed: z.number(),
  agentsMax: z.number(),
  storageBytesUsed: z.number(),
  storageBytesMax: z.number(),
  scheduledTasksUsed: z.number(),
  scheduledTasksMax: z.number(),
});
export type OwnerUsagePool = z.infer<typeof OwnerUsagePoolSchema>;

export const OwnedWorkspaceUsageSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(["personal", "team"]),
  agents: z.number(),
  storageBytes: z.number(),
  scheduledTasks: z.number(),
  monthlySpendUsd: z.number().optional(),
});
export type OwnedWorkspaceUsage = z.infer<typeof OwnedWorkspaceUsageSchema>;

export const ByokUsageProviderSchema = z.enum([
  "openrouter",
  "openai",
  "anthropic",
  "bedrock",
  "xai",
  "unknown",
]);
export type ByokUsageProvider = z.infer<typeof ByokUsageProviderSchema>;

export const ByokUsageSchema = z.object({
  periodStart: z.number(),
  estimatedCostUsd: z.number(),
  isPartial: z.boolean(),
  promptTokens: z.number(),
  completionTokens: z.number(),
  providers: z.array(
    z.object({
      provider: ByokUsageProviderSchema,
      estimatedCostUsd: z.number(),
      isPartial: z.boolean(),
      promptTokens: z.number(),
      completionTokens: z.number(),
      models: z.array(
        z.object({
          modelId: z.string(),
          label: z.string(),
          estimatedCostUsd: z.number().optional(),
          promptTokens: z.number(),
          completionTokens: z.number(),
        }),
      ),
    }),
  ),
});
export type ByokUsage = z.infer<typeof ByokUsageSchema>;

export const BillingPlanSchema = z.object({
  plan: PlanIdSchema,
  status: z.string(),
  access: z.boolean(),
  grantSource: z.string(),
  interval: BillingIntervalSchema.nullable(),
  trialEndsAt: z.number().nullable(),
  trialUsed: z.boolean(),
  cancelAtPeriodEnd: z.boolean(),
  /** Unix seconds. The API does not send an ISO `currentPeriodEnd`. */
  periodEnd: z.number().nullable(),
  canCheckout: z.boolean(),
  canManage: z.boolean(),
  canChangePlan: z.boolean(),
  paymentError: z
    .object({
      code: z.string().nullable(),
      message: z.string().nullable(),
    })
    .nullable(),
  limits: PlanLimitsSchema,
  overrides: z
    .object({
      byokEnabled: z.boolean().nullable(),
      multiAgentEnabled: z.boolean().nullable(),
      maxAgents: z.number().nullable(),
      monthlyCapUsd: z.number().nullable().optional(),
      sessionCapUsd: z.number().nullable().optional(),
    })
    .optional(),
  models: z.record(z.string(), z.string()).optional(),
  usage: PlanUsageSchema,
  pool: OwnerUsagePoolSchema.optional(),
  workspaces: z.array(OwnedWorkspaceUsageSchema).optional(),
  byokUsage: ByokUsageSchema.optional(),
  freeAllowanceActive: z.boolean().optional(),
  freeAllowanceUsedPct: z.number().optional(),
  freeSpendUsd: z.number().optional(),
  freeSpendCapUsd: z.number().optional(),
});
export type BillingPlan = z.infer<typeof BillingPlanSchema>;

export const CatalogMoneySchema = z.object({
  amount: z.number(),
  currency: z.string(),
});
export type CatalogMoney = z.infer<typeof CatalogMoneySchema>;

export const CatalogDisplayPriceSchema = z.object({
  amount: z.number(),
  currency: z.string(),
  source: z.enum(["base", "localized", "fx"]),
  rate: z.number().optional(),
  asOf: z.string().optional(),
});
export type CatalogDisplayPrice = z.infer<typeof CatalogDisplayPriceSchema>;

export const CatalogIntervalCommercialSchema = z.object({
  /** Post-discount. */
  price: CatalogMoneySchema.nullable(),
  /** Pre-discount list when it differs from `price`; drives the strikethrough. */
  listPrice: CatalogMoneySchema.nullable().optional(),
  display: CatalogDisplayPriceSchema.nullable(),
  trialDays: z.number().nullable(),
});
export type CatalogIntervalCommercial = z.infer<
  typeof CatalogIntervalCommercialSchema
>;

/** Per-interval commercials live on `month`/`year` — there is no `prices` map. */
export const CatalogPlanSchema = z.object({
  id: PaidPlanIdSchema,
  name: z.string(),
  limits: PlanLimitsSchema,
  month: CatalogIntervalCommercialSchema,
  year: CatalogIntervalCommercialSchema.nullable(),
});
export type CatalogPlan = z.infer<typeof CatalogPlanSchema>;

export const PlanCatalogSchema = z.object({
  plans: z.array(CatalogPlanSchema),
  recommendedPlan: z.enum(["starter", "pro"]).optional().default("starter"),
});

export const WorkspaceSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(["personal", "team"]),
  role: z.string().optional(),
});
export type WorkspaceSummary = z.infer<typeof WorkspaceSummarySchema>;

export const WorkspaceListSchema = z.object({
  workspaces: z.array(WorkspaceSummarySchema),
  activeWorkspaceId: z.string().nullable(),
});

export const AuthUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().nullable(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  timezone: z.string().nullable(),
  onboardingCompleted: z.boolean(),
  createdAt: z.string(),
});
export type AuthUser = z.infer<typeof AuthUserSchema>;

/** `/auth/me` returns the user bare or wrapped; accept both. */
export const MeResponseSchema = z.union([
  AuthUserSchema,
  z.object({ user: AuthUserSchema, token: z.string().optional() }),
]);

export const SessionSurfaceSchema = z.enum([
  "web",
  "mobile_app",
  "desktop_app",
]);
export type SessionSurface = z.infer<typeof SessionSurfaceSchema>;

export const AuthSessionSchema = z.object({
  id: z.string(),
  loginProvider: z.string(),
  surface: SessionSurfaceSchema,
  deviceLabel: z.string().nullable(),
  userAgent: z.string().nullable(),
  ip: z.string().nullable(),
  createdAt: z.number(),
  lastSeenAt: z.number(),
  revokedAt: z.number().nullable(),
  isCurrent: z.boolean().optional(),
});
export type AuthSession = z.infer<typeof AuthSessionSchema>;

export const SessionListSchema = z.object({
  sessions: z.array(AuthSessionSchema),
});

export const ByokProviderSchema = z.enum([
  "openrouter",
  "openai",
  "anthropic",
  "bedrock",
  "xai",
]);
export type ByokProvider = z.infer<typeof ByokProviderSchema>;

export const BYOK_PROVIDERS = ByokProviderSchema.options;

export const ByokModeSchema = z.enum(["off", "auto", "exclusive"]);
export type ByokMode = z.infer<typeof ByokModeSchema>;

export const ByokSlotSchema = z.enum([
  "main",
  "subagent",
  "vision",
  "coding",
  "compaction",
]);
export type ByokSlot = z.infer<typeof ByokSlotSchema>;

export const BYOK_SLOTS = ByokSlotSchema.options;

/** Per-provider booleans, not a list of records. */
const ByokProviderFlagsSchema = z.object({
  openrouter: z.boolean(),
  openai: z.boolean(),
  anthropic: z.boolean(),
  bedrock: z.boolean(),
  xai: z.boolean(),
});
export type ByokProviderFlags = z.infer<typeof ByokProviderFlagsSchema>;

export const ByokSlotsSchema = z.object({
  main: z.string().nullable(),
  subagent: z.string().nullable(),
  vision: z.string().nullable(),
  coding: z.string().nullable(),
  compaction: z.string().nullable(),
});
export type ByokSlots = z.infer<typeof ByokSlotsSchema>;

/** Mirrors BEDROCK_REGIONS in v2 apps/api/src/domain/llm/byok-types.ts. */
export const BEDROCK_REGIONS = [
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "us-west-2",
  "af-south-1",
  "ap-east-1",
  "ap-east-2",
  "ap-south-1",
  "ap-south-2",
  "ap-northeast-1",
  "ap-northeast-2",
  "ap-northeast-3",
  "ap-southeast-1",
  "ap-southeast-2",
  "ap-southeast-3",
  "ap-southeast-4",
  "ap-southeast-5",
  "ap-southeast-6",
  "ap-southeast-7",
  "ca-central-1",
  "ca-west-1",
  "eu-central-1",
  "eu-central-2",
  "eu-north-1",
  "eu-south-1",
  "eu-south-2",
  "eu-west-1",
  "eu-west-2",
  "eu-west-3",
  "il-central-1",
  "me-central-1",
  "me-south-1",
  "mx-central-1",
  "sa-east-1",
] as const;
export const BedrockRegionSchema = z.enum(BEDROCK_REGIONS);
export type BedrockRegion = z.infer<typeof BedrockRegionSchema>;

export const ByokSettingsSchema = z.object({
  mode: ByokModeSchema,
  /** Usable right now (a key is stored and validated). */
  ready: z.boolean(),
  /** The current plan permits BYOK at all. */
  allowed: z.boolean(),
  requiredPlan: PaidPlanIdSchema.nullable(),
  allowedPlans: z.array(PaidPlanIdSchema),
  /** A key is stored. */
  providers: ByokProviderFlagsSchema,
  /** The stored key actually works. */
  providersReady: ByokProviderFlagsSchema,
  slots: ByokSlotsSchema,
  monthlyLimitUsd: z.number().nullable(),
  bedrockRegion: BedrockRegionSchema.nullable(),
  xaiAuth: z.enum(["oauth", "api_key"]).nullable(),
});
export type ByokSettings = z.infer<typeof ByokSettingsSchema>;

export const ByokModelSchema = z.object({
  id: z.string(),
  label: z.string(),
  source: z.string(),
  vendor: z.string(),
  status: z.string(),
  tags: z.array(z.string()).optional(),
  context: z.object({ windowTokens: z.number() }).optional(),
  pricing: z
    .object({
      inputPer1M: z.number(),
      outputPer1M: z.number(),
      cachedInputPer1M: z.number().optional(),
    })
    .optional(),
  capabilities: z
    .object({
      tools: z.boolean(),
      vision: z.boolean(),
      reasoning: z.boolean(),
      structuredOutput: z.boolean().optional(),
      streaming: z.boolean(),
      batch: z.boolean().optional(),
    })
    .optional(),
});
export type ByokModel = z.infer<typeof ByokModelSchema>;

export const ByokModelsResponseSchema = z.object({
  models: z.array(ByokModelSchema),
  warnings: z
    .array(z.object({ provider: ByokProviderSchema, message: z.string() }))
    .optional(),
});

export const CheckoutSchema = z.object({ checkoutUrl: z.string() });
export const PortalSchema = z.object({ portalUrl: z.string() });
export const PaymentMethodSchema = z.object({ url: z.string() });
export const PasswordStatusSchema = z.object({ hasPassword: z.boolean() });
