import { z } from "zod";
import { objectIdSchema, paginationQuerySchema } from "./common.schema";
import { approvalStatusSchema } from "./approvals.schema";

// Comma-separated free text in the create form is split+trimmed client-side
// before hitting this schema, so the API always receives an array.
const commaListSchema = z
  .array(z.string().trim().min(1))
  .max(50)
  .default([]);

export const createBusinessDomainSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{2,30}$/, "Use uppercase letters, numbers, and hyphens only"),
  category: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).default(""),
  capabilities: commaListSchema,
  keyEntities: commaListSchema,
});
export type CreateBusinessDomainInput = z.infer<typeof createBusinessDomainSchema>;

export const updateBusinessDomainSchema = createBusinessDomainSchema
  .omit({ code: true })
  .partial();
export type UpdateBusinessDomainInput = z.infer<typeof updateBusinessDomainSchema>;

export const listBusinessDomainsQuerySchema = paginationQuerySchema.extend({
  status: approvalStatusSchema.optional(),
  category: z.string().trim().optional(),
});
export type ListBusinessDomainsQuery = z.infer<typeof listBusinessDomainsQuerySchema>;

export const businessDomainSchema = z.object({
  id: objectIdSchema,
  code: z.string(),
  category: z.string(),
  name: z.string(),
  description: z.string(),
  capabilities: z.array(z.string()),
  keyEntities: z.array(z.string()),
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
export type BusinessDomain = z.infer<typeof businessDomainSchema>;
