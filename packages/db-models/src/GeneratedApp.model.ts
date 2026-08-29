import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from "mongoose";

// One generated app per (blueprint, platform user) pair — many different
// public users legitimately generate from the same public blueprint, but
// each one only ever gets one working tree per blueprint.
const generatedAppSchema = new Schema(
  {
    blueprintId: { type: Schema.Types.ObjectId, ref: "AppBlueprint", required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "PlatformUser", required: true },
    database: { type: String, enum: ["mongodb", "postgres"], required: true },
    frontendFramework: { type: String, default: "React + Vite + TanStack Query" },
    // Unused until the chat-driven iteration milestone, but belongs in the
    // schema from the start rather than bolted on later: prevents two chat
    // turns from mutating the same working tree at once.
    status: { type: String, enum: ["idle", "working"], required: true, default: "idle" },
  },
  { timestamps: true },
);

generatedAppSchema.index({ blueprintId: 1, createdBy: 1 }, { unique: true });

export type GeneratedAppAttrs = InferSchemaType<typeof generatedAppSchema>;
export type GeneratedAppDocument = HydratedDocument<GeneratedAppAttrs>;
export const GeneratedAppModel =
  (models.GeneratedApp as Model<GeneratedAppAttrs>) ||
  model<GeneratedAppAttrs>("GeneratedApp", generatedAppSchema);
