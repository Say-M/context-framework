import { z } from "zod";
import { objectIdSchema } from "./common.schema";

export const parentTypeSchema = z.enum([
  "BusinessDomain",
  "BusinessModel",
  "OrgContext",
  "AppBlueprint",
]);
export type ParentType = z.infer<typeof parentTypeSchema>;

// Fixed 12 categories for an App Blueprint's Blueprint Studio Step 2 (M4).
// Defined here (not just in apps/api) since the frontend FileTree also
// needs this exact list to render the 12 folders.
export const BLUEPRINT_SECTIONS = [
  "data_model",
  "screens",
  "forms",
  "workflows",
  "business_rules",
  "permissions",
  "states",
  "ai_agents",
  "reports",
  "integrations",
  "notifications",
  "audit_trail",
] as const;
export const blueprintSectionSchema = z.enum(BLUEPRINT_SECTIONS);
export type BlueprintSection = z.infer<typeof blueprintSectionSchema>;

export const createSpecificationSchema = z.object({
  parentType: parentTypeSchema,
  parentId: objectIdSchema,
  // Only meaningful for parentType === 'AppBlueprint'; every other module
  // attaches specs directly to the parent with no subfolder.
  section: blueprintSectionSchema.nullable().default(null),
  // Path of an existing BlueprintFolder to place this spec inside (e.g.
  // "approval_rules/line_items"), or null for directly in the section root.
  // Only meaningful alongside `section`.
  folderPath: z.string().trim().min(1).nullable().default(null),
  title: z.string().trim().min(1).max(200),
  filename: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9_-]+\.md$/, "Filename must be a .md file (letters, numbers, _ and - only)"),
  summary: z.string().trim().max(500).default(""),
  content: z.string().max(200_000).default(""),
});
export type CreateSpecificationInput = z.infer<typeof createSpecificationSchema>;

export const updateSpecificationSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  summary: z.string().trim().max(500).optional(),
  content: z.string().max(200_000).optional(),
});
export type UpdateSpecificationInput = z.infer<typeof updateSpecificationSchema>;

export const listSpecificationsQuerySchema = z.object({
  parentType: parentTypeSchema,
  parentId: objectIdSchema,
  section: blueprintSectionSchema.optional(),
});
export type ListSpecificationsQuery = z.infer<typeof listSpecificationsQuerySchema>;

export const specificationFrontmatterSchema = z.object({
  type: z.string(),
  trustTier: z.string(),
  status: z.string(),
  staleAfter: z.string().datetime(),
});
export type SpecificationFrontmatter = z.infer<typeof specificationFrontmatterSchema>;

export const specificationSchema = z.object({
  id: objectIdSchema,
  parentType: parentTypeSchema,
  parentId: objectIdSchema,
  section: blueprintSectionSchema.nullable(),
  folderPath: z.string().nullable(),
  filename: z.string(),
  path: z.string(),
  title: z.string(),
  summary: z.string(),
  frontmatter: specificationFrontmatterSchema,
  content: z.string(),
  rawSource: z.string(),
  version: z.number(),
  createdBy: objectIdSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Specification = z.infer<typeof specificationSchema>;
