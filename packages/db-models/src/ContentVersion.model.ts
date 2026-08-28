import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from "mongoose";

/**
 * A frozen snapshot of a Specification's fields at the moment a newer edit
 * superseded it — written only when the spec's parent (BusinessDomain/
 * BusinessModel/OrgContext/AppBlueprint) was 'approved' at edit time, since
 * that's the only case where prior content is "live" and worth preserving.
 * Never updated afterward.
 */
const contentVersionSchema = new Schema(
  {
    parentType: {
      type: String,
      enum: ["Specification"],
      required: true,
    },
    parentId: { type: Schema.Types.ObjectId, required: true, ref: "Specification" },
    version: { type: Number, required: true },
    snapshot: { type: Schema.Types.Mixed, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    approvedAt: { type: Date, default: null },
    supersededAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

contentVersionSchema.index({ parentType: 1, parentId: 1, supersededAt: -1 });

export type ContentVersionAttrs = InferSchemaType<typeof contentVersionSchema>;
export type ContentVersionDocument = HydratedDocument<ContentVersionAttrs>;
export const ContentVersionModel =
  (models.ContentVersion as Model<ContentVersionAttrs>) ||
  model<ContentVersionAttrs>("ContentVersion", contentVersionSchema);
