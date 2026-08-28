import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from "mongoose";

const frontmatterSchema = new Schema(
  {
    type: { type: String, required: true },
    trustTier: { type: String, required: true },
    status: { type: String, required: true },
    staleAfter: { type: Date, required: true },
  },
  { _id: false },
);

const specificationSchema = new Schema(
  {
    parentType: {
      type: String,
      enum: ["BusinessDomain", "BusinessModel", "OrgContext", "AppBlueprint"],
      required: true,
    },
    // Dynamic ref via refPath lets a future `.populate('parentId')` resolve
    // against whichever collection parentType names, without a lookup table.
    parentId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: "parentType",
    },
    section: { type: String, default: null },
    // Only meaningful alongside `section` (AppBlueprint specs) — the
    // denormalized BlueprintFolder.path this spec lives under, e.g.
    // "approval_rules/line_items". Null means directly in the section root.
    folderPath: { type: String, default: null },
    filename: { type: String, required: true },
    path: { type: String, required: true },
    title: { type: String, required: true },
    summary: { type: String, default: "" },
    frontmatter: { type: frontmatterSchema, required: true },
    content: { type: String, default: "" },
    rawSource: { type: String, default: "" },
    // Bumped whenever this spec is edited while its parent is 'approved' —
    // the pre-edit state is frozen into ContentVersion first (parentType:
    // 'Specification'), and the parent is reopened for re-review. Editing a
    // spec under a pending/rejected/draft parent just updates in place.
    version: { type: Number, default: 1 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

specificationSchema.index({ parentType: 1, parentId: 1, section: 1 });
specificationSchema.index({ parentId: 1, path: 1 }, { unique: true });

export type SpecificationAttrs = InferSchemaType<typeof specificationSchema>;
export type SpecificationDocument = HydratedDocument<SpecificationAttrs>;
export const SpecificationModel =
  (models.Specification as Model<SpecificationAttrs>) ||
  model<SpecificationAttrs>("Specification", specificationSchema);
