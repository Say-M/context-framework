import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from "mongoose";

// One document per message, same reasoning as ChatMessage.model.ts — not
// embedded on StudioThread, queried independently. No "mode" field: unlike
// generated-app chat (Build/Ask/Plan), a Studio turn has exactly one shape
// — the model either replies in text or calls one artifact-producing tool.
const studioMessageSchema = new Schema(
  {
    threadId: { type: Schema.Types.ObjectId, ref: "StudioThread", required: true },
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    // Set on an assistant message that created/updated an artifact.
    artifactId: { type: Schema.Types.ObjectId, ref: "StudioArtifact", default: null },
    // A failed turn never fails the whole thread — same isolation pattern
    // as ChatMessage.failed.
    failed: { type: Boolean, default: false },
    // Set when this user message was sent with ChatPanel's Deep Research
    // toggle on — shown as a badge and used to steer that turn's prompt.
    deepResearch: { type: Boolean, default: false },
  },
  { timestamps: true },
);

studioMessageSchema.index({ threadId: 1, createdAt: 1 });

export type StudioMessageAttrs = InferSchemaType<typeof studioMessageSchema>;
export type StudioMessageDocument = HydratedDocument<StudioMessageAttrs>;
export const StudioMessageModel =
  (models.StudioMessage as Model<StudioMessageAttrs>) ||
  model<StudioMessageAttrs>("StudioMessage", studioMessageSchema);
