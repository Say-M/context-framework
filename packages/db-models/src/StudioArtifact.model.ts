import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from "mongoose";

// One polymorphic collection discriminated by `kind`, mirroring how
// Specification.model.ts already discriminates one shared collection by
// `parentType` across 4 different parent types in this codebase — same
// reasoning here: one CRUD/query path for every artifact kind rather than
// 5 near-identical collections.
//
// `content`'s shape depends on `kind` (deliberately a simple,
// library-agnostic intermediate format for every kind except `doc`, which
// round-trips Lexical's own serialized editor state — see the Studio plan
// for the exact per-kind shapes):
//   doc:         Lexical editor-state JSON
//   spreadsheet: { rows: Array<Array<{ value, formula? }>> }
//   slides:      { slides: SlideData[] } — a freeform canvas per slide, a
//                fixed 1280x720 logical size; see slide-layouts.ts in
//                @bismo/shared-schemas for the SlideData/SlideElement shape
//                and the layout-template system that expands agent output
//                into real positioned elements
//   image:       { prompt, mimeType, storagePath }
//   research:    { markdownReport, sources: [{ title, url }] }
const studioArtifactSchema = new Schema(
  {
    threadId: { type: Schema.Types.ObjectId, ref: "StudioThread", required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "PlatformUser", required: true },
    kind: { type: String, enum: ["doc", "spreadsheet", "slides", "image", "research"], required: true },
    title: { type: String, required: true },
    // Bumped on every edit (agent-produced or user-edited) so the frontend
    // can detect a stale in-memory copy after a save.
    version: { type: Number, required: true, default: 1 },
    content: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
);

studioArtifactSchema.index({ threadId: 1, createdAt: 1 });

export type StudioArtifactAttrs = InferSchemaType<typeof studioArtifactSchema>;
export type StudioArtifactDocument = HydratedDocument<StudioArtifactAttrs>;
export const StudioArtifactModel =
  (models.StudioArtifact as Model<StudioArtifactAttrs>) ||
  model<StudioArtifactAttrs>("StudioArtifact", studioArtifactSchema);
