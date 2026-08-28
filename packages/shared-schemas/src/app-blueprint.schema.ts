import { z } from "zod";
import { objectIdSchema, paginationQuerySchema } from "./common.schema";
import { BLUEPRINT_SECTIONS } from "./specification.schema";

export const appBlueprintStatusSchema = z.enum(["draft", "pending", "approved", "rejected"]);
export type AppBlueprintStatus = z.infer<typeof appBlueprintStatusSchema>;

export const connectionsSchema = z.object({
  domainIds: z.array(objectIdSchema).min(1, "Select at least one business domain"),
  modelId: objectIdSchema,
  orgContextId: objectIdSchema,
});
export type ConnectionsInput = z.infer<typeof connectionsSchema>;

export const createAppBlueprintSchema = connectionsSchema.extend({
  namespace: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*$/,
      "Use the form 'owner/blueprint-name', lowercase with hyphens",
    ),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).default(""),
});
export type CreateAppBlueprintInput = z.infer<typeof createAppBlueprintSchema>;

// Namespace is immutable once created (it's the package identity) — only
// name/description can be revised later.
export const updateAppBlueprintMetadataSchema = createAppBlueprintSchema
  .omit({ namespace: true, domainIds: true, modelId: true, orgContextId: true })
  .partial();
export type UpdateAppBlueprintMetadataInput = z.infer<typeof updateAppBlueprintMetadataSchema>;

export const listAppBlueprintsQuerySchema = paginationQuerySchema.extend({
  status: appBlueprintStatusSchema.optional(),
});
export type ListAppBlueprintsQuery = z.infer<typeof listAppBlueprintsQuerySchema>;

const refSchema = z.object({
  id: objectIdSchema,
  code: z.string(),
  name: z.string(),
});

export const okfManifestSchema = z.object({
  okf_version: z.string(),
  namespace: z.string(),
  name: z.string(),
  version: z.string(),
  description: z.string(),
  author: z.object({ name: z.string(), email: z.string() }),
  inherited_domains: z.array(refSchema),
  inherited_models: z.array(refSchema),
  org_context: z.array(refSchema),
});
export type OkfManifest = z.infer<typeof okfManifestSchema>;

export const appBlueprintSchema = z.object({
  id: objectIdSchema,
  namespace: z.string(),
  name: z.string(),
  description: z.string(),
  version: z.string(),
  connections: connectionsSchema,
  sections: z.array(z.enum(BLUEPRINT_SECTIONS)),
  rootSpecId: objectIdSchema.nullable(),
  publishedManifest: okfManifestSchema.nullable(),
  publishedAt: z.string().datetime().nullable(),
  status: appBlueprintStatusSchema,
  createdBy: objectIdSchema,
  reviewedBy: objectIdSchema.nullable(),
  reviewNote: z.string().nullable(),
  reviewedAt: z.string().datetime().nullable(),
  submittedAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type AppBlueprint = z.infer<typeof appBlueprintSchema>;

const specSummarySchema = z.object({
  id: objectIdSchema,
  filename: z.string(),
  path: z.string(),
  title: z.string(),
  frontmatterType: z.string(),
});
export type SpecSummary = z.infer<typeof specSummarySchema>;

export interface FolderNode {
  id: string;
  name: string;
  path: string;
  specs: SpecSummary[];
  folders: FolderNode[];
}
// Folders nest arbitrarily deep, so this schema has to reference itself —
// z.lazy defers evaluating the recursive branch until it's actually parsed.
export const folderNodeSchema: z.ZodType<FolderNode> = z.lazy(() =>
  z.object({
    id: objectIdSchema,
    name: z.string(),
    path: z.string(),
    specs: z.array(specSummarySchema),
    folders: z.array(folderNodeSchema),
  }),
);

export const sectionTreeSchema = z.object({
  root: specSummarySchema.nullable(),
  sections: z.array(
    z.object({
      slug: z.enum(BLUEPRINT_SECTIONS),
      specs: z.array(specSummarySchema),
      folders: z.array(folderNodeSchema),
    }),
  ),
});
export type SectionTree = z.infer<typeof sectionTreeSchema>;

export const createBlueprintFolderSchema = z.object({
  section: z.enum(BLUEPRINT_SECTIONS),
  // Path of the existing parent folder to nest under (e.g.
  // "approval_rules"), or null/omitted to create a top-level folder
  // directly under the section.
  parentFolderPath: z.string().trim().min(1).nullable().default(null),
  name: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9_-]+$/, "Use letters, numbers, underscores, and hyphens only"),
});
export type CreateBlueprintFolderInput = z.infer<typeof createBlueprintFolderSchema>;

export const blueprintFolderSchema = z.object({
  id: objectIdSchema,
  blueprintId: objectIdSchema,
  section: z.enum(BLUEPRINT_SECTIONS),
  parentFolderId: objectIdSchema.nullable(),
  name: z.string(),
  path: z.string(),
  createdBy: objectIdSchema,
  createdAt: z.string().datetime(),
});
export type BlueprintFolder = z.infer<typeof blueprintFolderSchema>;
