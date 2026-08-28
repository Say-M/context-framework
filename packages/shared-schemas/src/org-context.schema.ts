import { z } from "zod";
import { objectIdSchema, paginationQuerySchema } from "./common.schema";
import { approvalStatusSchema } from "./approvals.schema";

const commaListSchema = z.array(z.string().trim().min(1)).max(50).default([]);

export const createOrgContextSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{2,30}$/, "Use uppercase letters, numbers, and hyphens only"),
  structureType: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).default(""),
  legalEntities: commaListSchema,
  operatingLocations: commaListSchema,
  // Kept as free-text lines rather than a parsed {min,max,role,sla} shape —
  // authors phrase these tiers in prose ("Tier 1 ($0-$5,000): Direct Line
  // Manager approval (SLA: 4 hrs)") and reliably splitting that on commas
  // while dollar amounts also contain commas isn't worth the fragility for
  // what is purely informational display; each line renders as-is.
  doaTiers: commaListSchema,
  complianceTags: commaListSchema,
});
export type CreateOrgContextInput = z.infer<typeof createOrgContextSchema>;

export const updateOrgContextSchema = createOrgContextSchema.omit({ code: true }).partial();
export type UpdateOrgContextInput = z.infer<typeof updateOrgContextSchema>;

export const listOrgContextsQuerySchema = paginationQuerySchema.extend({
  status: approvalStatusSchema.optional(),
  structureType: z.string().trim().optional(),
});
export type ListOrgContextsQuery = z.infer<typeof listOrgContextsQuerySchema>;

export const orgContextSchema = z.object({
  id: objectIdSchema,
  code: z.string(),
  structureType: z.string(),
  name: z.string(),
  description: z.string(),
  legalEntities: z.array(z.string()),
  operatingLocations: z.array(z.string()),
  doaTiers: z.array(z.string()),
  complianceTags: z.array(z.string()),
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
export type OrgContext = z.infer<typeof orgContextSchema>;
