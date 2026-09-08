import { z } from "zod";
import { objectIdSchema } from "./common.schema";

export const parentTypeSchema = z.enum([
  "BusinessDomain",
  "BusinessModel",
  "OrgContext",
  "AppBlueprint",
]);
export type ParentType = z.infer<typeof parentTypeSchema>;

// The starting seed for a new App Blueprint's sections (Blueprint Studio
// Step 2) — not an exhaustive list. Sections are dynamic: a blueprint's own
// `sections: string[]` field (packages/db-models/src/AppBlueprint.model.ts)
// is the real source of truth, and a blueprint author can add more via
// POST /:id/sections or remove one via DELETE /:id/sections/:slug. This
// constant only supplies the 12 defaults a freshly-created blueprint starts
// with, matching the original fixed set so nothing changes for existing
// blueprints.
export const DEFAULT_BLUEPRINT_SECTIONS = [
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

// Slug -> display label, generic Title Case with a small acronym override
// list — the single source of truth for section labels (sections aren't
// stored with a separate label field; deriving it from the slug avoids a
// schema/migration change while still rendering e.g. "ai_agents" as
// "AI Agents" rather than "Ai Agents"). Used server-side when building the
// section tree response; the frontend just displays whatever label the API
// sends, no copy of this logic there.
const SECTION_LABEL_ACRONYMS = new Set(["ai", "api", "ui", "id", "url"]);
export function formatSectionLabel(slug: string): string {
  return slug
    .split("_")
    .filter(Boolean)
    .map((word) =>
      SECTION_LABEL_ACRONYMS.has(word.toLowerCase())
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join(" ");
}

export const createSpecificationSchema = z.object({
  parentType: parentTypeSchema,
  parentId: objectIdSchema,
  // Only meaningful for parentType === 'AppBlueprint'; every other module
  // attaches specs directly to the parent with no subfolder. A free string
  // (not an enum) — must match one of the blueprint's own `sections`, which
  // the service layer checks at write time since that list is per-blueprint
  // and dynamic, not a fixed set Zod can validate against.
  section: z.string().trim().min(1).max(100).nullable().default(null),
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
  section: z.string().trim().min(1).max(100).optional(),
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
  section: z.string().nullable(),
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
