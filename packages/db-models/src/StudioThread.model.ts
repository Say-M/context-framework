import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from "mongoose";

// One Studio conversation. Same shape as GeneratedApp.model.ts: an
// owner-scoped document with a lifecycle status, a paired nullable error
// field, and no separate "collaborators" concept (unlike GeneratedApp,
// Studio threads aren't shared/deployed anywhere else).
const studioThreadSchema = new Schema(
  {
    createdBy: { type: Schema.Types.ObjectId, ref: "PlatformUser", required: true },
    // Null when the user skipped blueprint selection — Studio works
    // generically either way, this just adds grounding context when set.
    blueprintId: { type: Schema.Types.ObjectId, ref: "AppBlueprint", default: null },
    title: { type: String, required: true },
    status: { type: String, enum: ["idle", "working", "failed"], required: true, default: "idle" },
    lastError: { type: String, default: null },
  },
  { timestamps: true },
);

studioThreadSchema.index({ createdBy: 1, createdAt: -1 });

export type StudioThreadAttrs = InferSchemaType<typeof studioThreadSchema>;
export type StudioThreadDocument = HydratedDocument<StudioThreadAttrs>;
export const StudioThreadModel =
  (models.StudioThread as Model<StudioThreadAttrs>) ||
  model<StudioThreadAttrs>("StudioThread", studioThreadSchema);
