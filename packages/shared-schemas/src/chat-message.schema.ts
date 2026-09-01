import { z } from "zod";
import { objectIdSchema } from "./common.schema";

export const chatModeSchema = z.enum(["build", "ask", "plan"]);
export type ChatMode = z.infer<typeof chatModeSchema>;

export const sendChatMessageSchema = z.object({
  content: z.string().trim().min(1).max(4000),
  mode: chatModeSchema.default("build"),
});
export type SendChatMessageInput = z.infer<typeof sendChatMessageSchema>;

export const planDecisionSchema = z.object({
  decision: z.enum(["approve", "reject"]),
  feedback: z.string().trim().max(2000).optional(),
});
export type PlanDecisionInput = z.infer<typeof planDecisionSchema>;

export const chatMessageRoleSchema = z.enum(["user", "assistant"]);
export type ChatMessageRole = z.infer<typeof chatMessageRoleSchema>;

export const chatMessageSchema = z.object({
  id: objectIdSchema,
  generatedAppId: objectIdSchema,
  mode: chatModeSchema,
  role: chatMessageRoleSchema,
  content: z.string(),
  commitSha: z.string().nullable(),
  failed: z.boolean(),
  createdAt: z.string().datetime(),
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;
