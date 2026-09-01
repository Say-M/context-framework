import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from "mongoose";

// A platform user may generate any number of apps from the same blueprint
// (e.g. to try different prompts/database choices) — each is its own
// working tree, so no uniqueness constraint on (blueprintId, createdBy).
const generatedAppSchema = new Schema(
  {
    blueprintId: { type: Schema.Types.ObjectId, ref: "AppBlueprint", required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "PlatformUser", required: true },
    database: { type: String, enum: ["mongodb", "postgres"], required: true },
    frontendFramework: { type: String, default: "React + Vite + TanStack Query" },
    // Extra free-text instructions supplied at creation time, appended to
    // the generation prompt alongside the blueprint's specs.
    initialPrompt: { type: String, default: "" },
    // "working" also guards against two chat turns mutating the same
    // working tree at once. "awaiting_approval" is Plan mode paused on a
    // proposed plan, waiting for the user's Approve/Request-changes call.
    status: {
      type: String,
      enum: ["idle", "working", "failed", "awaiting_approval"],
      required: true,
      default: "idle",
    },
    // Populated only when status is "failed" — the agent's error, shown to
    // the user so a stuck generation isn't a silent dead end.
    lastError: { type: String, default: null },
    // Populated only when status is "awaiting_approval" — the Plan-mode
    // proposal text shown to the user for approval.
    pendingPlan: { type: String, default: null },
  },
  { timestamps: true },
);

generatedAppSchema.index({ blueprintId: 1, createdBy: 1 });

export type GeneratedAppAttrs = InferSchemaType<typeof generatedAppSchema>;
export type GeneratedAppDocument = HydratedDocument<GeneratedAppAttrs>;
export const GeneratedAppModel =
  (models.GeneratedApp as Model<GeneratedAppAttrs>) ||
  model<GeneratedAppAttrs>("GeneratedApp", generatedAppSchema);
