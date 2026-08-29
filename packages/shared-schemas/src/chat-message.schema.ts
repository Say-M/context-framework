import { z } from "zod";
import { objectIdSchema } from "./common.schema";

// "plan" isn't implemented yet, but the field already lives on every stored
// message so it won't need a migration when it lands.
export const chatModeSchema = z.enum(["build", "ask"]);
export type ChatMode = z.infer<typeof chatModeSchema>;

export const sendChatMessageSchema = z.object({
  content: z.string().trim().min(1).max(4000),
  mode: chatModeSchema.default("build"),
});
export type SendChatMessageInput = z.infer<typeof sendChatMessageSchema>;

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
