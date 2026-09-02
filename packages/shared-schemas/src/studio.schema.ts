import { z } from "zod";
import { objectIdSchema } from "./common.schema";

// --- Threads ---

export const studioThreadStatusSchema = z.enum(["idle", "working", "failed"]);
export type StudioThreadStatus = z.infer<typeof studioThreadStatusSchema>;

export const createStudioThreadSchema = z.object({
  // Null/omitted when the user skips blueprint selection.
  blueprintId: objectIdSchema.nullish(),
});
export type CreateStudioThreadInput = z.infer<typeof createStudioThreadSchema>;

export const studioThreadSchema = z.object({
  id: objectIdSchema,
  blueprintId: objectIdSchema.nullable(),
  blueprintName: z.string().nullable(),
  title: z.string(),
  status: studioThreadStatusSchema,
  lastError: z.string().nullable(),
  createdBy: objectIdSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type StudioThread = z.infer<typeof studioThreadSchema>;

// --- Messages ---

export const studioMessageRoleSchema = z.enum(["user", "assistant"]);
export type StudioMessageRole = z.infer<typeof studioMessageRoleSchema>;

export const sendStudioMessageSchema = z.object({
  content: z.string().trim().min(1).max(4000),
  // The Deep Research toggle in ChatPanel — when set, the turn is
  // instructed to research the web rather than left to infer that from the
  // wording alone. See studioAgent.ts's buildStudioPrompt.
  deepResearch: z.boolean().optional(),
});
export type SendStudioMessageInput = z.infer<typeof sendStudioMessageSchema>;

export const studioMessageSchema = z.object({
  id: objectIdSchema,
  threadId: objectIdSchema,
  role: studioMessageRoleSchema,
  content: z.string(),
  artifactId: objectIdSchema.nullable(),
  failed: z.boolean(),
  deepResearch: z.boolean(),
  createdAt: z.string().datetime(),
});
export type StudioMessage = z.infer<typeof studioMessageSchema>;

// --- Artifacts ---

export const studioArtifactKindSchema = z.enum(["doc", "spreadsheet", "slides", "image", "research"]);
export type StudioArtifactKind = z.infer<typeof studioArtifactKindSchema>;

export const studioArtifactSchema = z.object({
  id: objectIdSchema,
  threadId: objectIdSchema,
  createdBy: objectIdSchema,
  kind: studioArtifactKindSchema,
  title: z.string(),
  version: z.number().int(),
  // Shape depends on `kind` — see StudioArtifact.model.ts for the per-kind
  // documented shapes. Left unvalidated here since one artifact endpoint
  // serves all 5 kinds.
  content: z.unknown(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type StudioArtifact = z.infer<typeof studioArtifactSchema>;

export const updateStudioArtifactSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  content: z.unknown(),
});
export type UpdateStudioArtifactInput = z.infer<typeof updateStudioArtifactSchema>;
