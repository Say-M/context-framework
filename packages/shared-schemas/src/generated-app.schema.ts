import { z } from "zod";
import { objectIdSchema } from "./common.schema";

export const databaseChoiceSchema = z.enum(["mongodb", "postgres"]);
export type DatabaseChoice = z.infer<typeof databaseChoiceSchema>;

export const createGeneratedAppSchema = z.object({
  blueprintId: objectIdSchema,
  database: databaseChoiceSchema,
  frontendFramework: z.string().trim().max(200).optional(),
  prompt: z.string().trim().max(4000).optional(),
});
export type CreateGeneratedAppInput = z.infer<typeof createGeneratedAppSchema>;

export const generatedAppStatusSchema = z.enum(["idle", "working", "failed", "awaiting_approval"]);
export type GeneratedAppStatus = z.infer<typeof generatedAppStatusSchema>;

export const generatedAppSchema = z.object({
  id: objectIdSchema,
  blueprintId: objectIdSchema,
  blueprintName: z.string(),
  database: databaseChoiceSchema,
  frontendFramework: z.string(),
  initialPrompt: z.string(),
  status: generatedAppStatusSchema,
  lastError: z.string().nullable(),
  // Populated only while status is "awaiting_approval" — the Plan-mode
  // proposal waiting on the user's Approve/Request-changes decision.
  pendingPlan: z.string().nullable(),
  createdBy: objectIdSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type GeneratedApp = z.infer<typeof generatedAppSchema>;

export const generatedAppVersionSchema = z.object({
  sha: z.string(),
  shortSha: z.string(),
  message: z.string(),
  authorDate: z.string(),
});
export type GeneratedAppVersion = z.infer<typeof generatedAppVersionSchema>;
