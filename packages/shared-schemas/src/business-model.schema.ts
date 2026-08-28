import { z } from "zod";
import { objectIdSchema, paginationQuerySchema } from "./common.schema";
import { approvalStatusSchema } from "./approvals.schema";

const commaListSchema = z.array(z.string().trim().min(1)).max(50).default([]);

export const createBusinessModelSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{2,30}$/, "Use uppercase letters, numbers, and hyphens only"),
  archetypeCategory: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).default(""),
  monetizationMechanics: z.string().trim().max(500).default(""),
  distributionChannels: commaListSchema,
});
export type CreateBusinessModelInput = z.infer<typeof createBusinessModelSchema>;

export const updateBusinessModelSchema = createBusinessModelSchema.omit({ code: true }).partial();
export type UpdateBusinessModelInput = z.infer<typeof updateBusinessModelSchema>;

export const listBusinessModelsQuerySchema = paginationQuerySchema.extend({
  status: approvalStatusSchema.optional(),
  archetypeCategory: z.string().trim().optional(),
});
export type ListBusinessModelsQuery = z.infer<typeof listBusinessModelsQuerySchema>;

export const businessModelSchema = z.object({
  id: objectIdSchema,
  code: z.string(),
  archetypeCategory: z.string(),
  name: z.string(),
  description: z.string(),
  monetizationMechanics: z.string(),
  distributionChannels: z.array(z.string()),
  specCount: z.number(),
  status: approvalStatusSchema,
  createdBy: objectIdSchema,
  reviewedBy: objectIdSchema.nullable(),
  reviewNote: z.string().nullable(),
  reviewedAt: z.string().datetime().nullable(),
  submittedAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type BusinessModel = z.infer<typeof businessModelSchema>;
