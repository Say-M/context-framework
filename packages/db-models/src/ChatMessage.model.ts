import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from "mongoose";

// One document per message, not embedded on GeneratedApp — unbounded
// growth over a long chat history, and it's queried independently, same
// reasoning as Specification/ContentVersion being their own collections.
const chatMessageSchema = new Schema(
  {
    generatedAppId: { type: Schema.Types.ObjectId, ref: "GeneratedApp", required: true },
    // Stored per-message (not just on the app) so Plan mode — not
    // implemented yet — doesn't need a schema migration when it lands.
    mode: { type: String, enum: ["build", "ask"], required: true, default: "build" },
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    // Set on an assistant message that produced a new version.
    commitSha: { type: String, default: null },
    // A failed chat turn never fails the GeneratedApp itself (it's still
    // usable — versions already exist) — the failure lives here instead,
    // scoped to just this message.
    failed: { type: Boolean, default: false },
  },
  { timestamps: true },
);

chatMessageSchema.index({ generatedAppId: 1, createdAt: 1 });

export type ChatMessageAttrs = InferSchemaType<typeof chatMessageSchema>;
export type ChatMessageDocument = HydratedDocument<ChatMessageAttrs>;
export const ChatMessageModel =
  (models.ChatMessage as Model<ChatMessageAttrs>) ||
  model<ChatMessageAttrs>("ChatMessage", chatMessageSchema);
