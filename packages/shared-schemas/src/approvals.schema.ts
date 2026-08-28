import { z } from "zod";
import { objectIdSchema } from "./common.schema";

export const approvalStatusSchema = z.enum(["pending", "approved", "rejected"]);
export type ApprovalStatus = z.infer<typeof approvalStatusSchema>;

// Kebab-case URL slugs — the mapping to each Mongoose model/parentType name
// lives server-side in the content-type registry, not here.
export const contentTypeSlugSchema = z.enum([
  "business-domain",
  "business-model",
  "org-context",
  "app-blueprint",
]);
export type ContentTypeSlug = z.infer<typeof contentTypeSlugSchema>;

export const rejectItemSchema = z.object({
  reason: z.string().trim().min(1).max(1000),
});
export type RejectItemInput = z.infer<typeof rejectItemSchema>;

export const approvalQueueItemSchema = z.object({
  id: objectIdSchema,
  type: contentTypeSlugSchema,
  name: z.string(),
  code: z.string(),
  submittedAt: z.string().datetime(),
  createdBy: objectIdSchema,
});
export type ApprovalQueueItem = z.infer<typeof approvalQueueItemSchema>;
