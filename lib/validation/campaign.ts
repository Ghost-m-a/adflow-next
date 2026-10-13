import { z } from "zod";
import { CAMPAIGN_GOALS, CAMPAIGN_PLATFORMS } from "@/models/Campaign";
import { currencySchema, objectIdSchema } from "@/lib/validation/common";

const stringList = z.array(z.string().trim().min(1).max(80)).max(30).default([]);

const optionalDate = z
  .union([z.coerce.date(), z.literal("")])
  .optional()
  .transform((value) => (value === "" ? undefined : value));

const optionalUrl = z
  .union([z.string().trim().url().max(2048), z.literal("")])
  .optional()
  .transform((v) => (v === "" ? undefined : v));

const OPTIONAL_NUMBER = z
  .union([z.coerce.number().finite().min(0).max(100000000), z.literal("")])
  .optional()
  .transform((v) => (v === "" ? undefined : v));

const REWARD_MODELS = ["per_creator", "cpm", "hybrid"] as const;

const baseShape = {
  organizationId: objectIdSchema,
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(20).max(5000),
  brief: z.string().trim().max(10000).optional().default(""),
  platform: z.enum(CAMPAIGN_PLATFORMS),
  goal: z.enum(CAMPAIGN_GOALS),
  budget: z.coerce.number().finite().min(1).max(100000000),
  currency: currencySchema.default("USD"),
  rewardPerCreator: z.coerce.number().finite().min(0).max(100000000).default(0),
  maxCreators: z.coerce.number().int().min(1).max(1000000),
  targetNiches: stringList,
  targetCountries: z
    .array(z.string().trim().length(2).transform((v) => v.toUpperCase()))
    .max(100)
    .default([]),
  requirements: z.array(z.string().trim().min(1).max(500)).max(50).default([]),
  applicationDeadline: optionalDate,
  startsAt: optionalDate,
  endsAt: optionalDate,
  isPublic: z.boolean().default(true),
  status: z.enum(["draft", "active"]).default("draft"),

  /* Whop-style fields */
  coverImageUrl: optionalUrl,
  logoUrl: optionalUrl,
  category: z.string().trim().max(60).optional(),
  hashtags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  supportedPlatforms: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
  rewardModel: z.enum(REWARD_MODELS).default("per_creator"),
  rewardPerThousand: OPTIONAL_NUMBER,
  rewardPerVideo: OPTIONAL_NUMBER,
  minimumPayout: OPTIONAL_NUMBER,
  referenceMaterials: z
    .array(z.string().trim().url().max(2048))
    .max(20)
    .default([]),
} as const;

function commonRefinements<T extends z.infer<z.ZodObject<typeof baseShape>>>(
  data: T,
  ctx: z.RefinementCtx,
) {
  // Budget must cover rewards for fixed-per-creator model.
  if (data.rewardModel === "per_creator") {
    if (data.rewardPerCreator * data.maxCreators > data.budget) {
      ctx.addIssue({
        code: "custom",
        path: ["budget"],
        message: "Budget must cover rewards for all creator slots.",
      });
    }
  }

  // CPM/hybrid requires at least one reward rate.
  if (data.rewardModel === "cpm" || data.rewardModel === "hybrid") {
    if (!data.rewardPerThousand && !data.rewardPerVideo) {
      ctx.addIssue({
        code: "custom",
        path: ["rewardPerThousand"],
        message:
          "Provide a CPM rate (per 1,000 views) or a per-video rate for this reward model.",
      });
    }
  }

  if (
    data.applicationDeadline &&
    data.startsAt &&
    data.applicationDeadline > data.startsAt
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["applicationDeadline"],
      message: "Application deadline must be on or before the start date.",
    });
  }
  if (data.startsAt && data.endsAt && data.endsAt <= data.startsAt) {
    ctx.addIssue({
      code: "custom",
      path: ["endsAt"],
      message: "End date must be after the start date.",
    });
  }
}

export const createCampaignSchema = z
  .object(baseShape)
  .superRefine(commonRefinements);

export const updateCampaignSchema = z
  .object({
    ...baseShape,
    organizationId: objectIdSchema.optional(),
    status: z
      .enum(["draft", "active", "paused", "completed", "cancelled"])
      .optional(),
  })
  .partial()
  .strict()
  .refine((d) => Object.keys(d).length > 0, {
    message: "Provide at least one field to update.",
  });
