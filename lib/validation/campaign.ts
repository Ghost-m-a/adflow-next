import { z } from "zod";
import {
  CAMPAIGN_GOALS,
  CAMPAIGN_PLATFORMS,
} from "@/models/Campaign";
import {
  currencySchema,
  objectIdSchema,
} from "@/lib/validation/common";

const stringList = z
  .array(z.string().trim().min(1).max(80))
  .max(30)
  .default([]);

const optionalDate = z
  .union([z.coerce.date(), z.literal("")])
  .optional()
  .transform((value) => value === "" ? undefined : value);

export const createCampaignSchema = z.object({
  organizationId: objectIdSchema,
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(20).max(5000),
  brief: z.string().trim().max(10000).optional().default(""),
  platform: z.enum(CAMPAIGN_PLATFORMS),
  goal: z.enum(CAMPAIGN_GOALS),
  budget: z.coerce.number().finite().min(1).max(100000000),
  currency: currencySchema.default("USD"),
  rewardPerCreator: z.coerce.number().finite().min(0.01).max(100000000),
  maxCreators: z.coerce.number().int().min(1).max(1000000),
  targetNiches: stringList,
  targetCountries: z.array(
    z.string().trim().length(2).transform((value) => value.toUpperCase()),
  ).max(100).default([]),
  requirements: z.array(z.string().trim().min(1).max(500))
    .max(50).default([]),
  applicationDeadline: optionalDate,
  startsAt: optionalDate,
  endsAt: optionalDate,
  isPublic: z.boolean().default(true),
  status: z.enum(["draft", "active"]).default("draft"),
}).superRefine((data, ctx) => {
  if (data.rewardPerCreator * data.maxCreators > data.budget) {
    ctx.addIssue({
      code: "custom",
      path: ["budget"],
      message: "Budget must cover rewards for all creator slots.",
    });
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
});

export const updateCampaignSchema = z.object({
  title: z.string().trim().min(3).max(120).optional(),
  description: z.string().trim().min(20).max(5000).optional(),
  brief: z.string().trim().max(10000).optional(),
  platform: z.enum(CAMPAIGN_PLATFORMS).optional(),
  goal: z.enum(CAMPAIGN_GOALS).optional(),
  budget: z.coerce.number().finite().min(1).max(100000000).optional(),
  currency: currencySchema.optional(),
  rewardPerCreator: z.coerce.number().finite().min(0.01)
    .max(100000000).optional(),
  maxCreators: z.coerce.number().int().min(1).max(1000000).optional(),
  targetNiches: stringList.optional(),
  targetCountries: z.array(
    z.string().trim().length(2).transform((value) => value.toUpperCase()),
  ).max(100).optional(),
  requirements: z.array(z.string().trim().min(1).max(500))
    .max(50).optional(),
  applicationDeadline: optionalDate,
  startsAt: optionalDate,
  endsAt: optionalDate,
  isPublic: z.boolean().optional(),
  status: z.enum([
    "draft", "active", "paused", "completed", "cancelled",
  ]).optional(),
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  { message: "Provide at least one field to update." },
);
