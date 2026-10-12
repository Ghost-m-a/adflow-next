import { z } from "zod";

export const createApplicationSchema = z.object({
  message: z.string().trim().min(10).max(2000),
  proposedRate: z.coerce.number().finite().min(0).max(100000000).optional(),
}).strict();

export const reviewApplicationSchema = z.object({
  status: z.enum(["accepted", "rejected"]),
}).strict();
