import { z } from "zod";
import { SUBMISSION_CONTENT_TYPES } from "@/models/ContentSubmission";

export const createSubmissionSchema = z.object({
  campaignId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid campaign ID."),
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(10).max(2000),
  contentType: z.enum(SUBMISSION_CONTENT_TYPES),
  contentUrl: z.string().trim().url().max(2048),
  thumbnailUrl: z.string().trim().url().max(2048).optional(),
  trackingLinkId: z
    .string()
    .regex(/^[a-f\d]{24}$/i, "Invalid tracking link ID.")
    .optional(),
}).strict();

export const updateSubmissionSchema = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  description: z.string().trim().min(10).max(2000).optional(),
  contentType: z.enum(SUBMISSION_CONTENT_TYPES).optional(),
  contentUrl: z.string().trim().url().max(2048).optional(),
  thumbnailUrl: z.string().trim().url().max(2048).optional(),
}).strict().refine((d) => Object.keys(d).length > 0, {
  message: "Provide at least one field to update.",
});

export const reviewSubmissionSchema = z.object({
  decision: z.enum(["approve", "reject", "request_changes"]),
  notes: z.string().trim().max(2000).optional(),
  rewardAmount: z.coerce.number().finite().min(0).max(100000000).optional(),
}).strict().superRefine((data, ctx) => {
  if (data.decision === "reject" && !data.notes) {
    ctx.addIssue({
      code: "custom",
      path: ["notes"],
      message: "A reason is required when rejecting a submission.",
    });
  }
});
