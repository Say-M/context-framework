import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from "mongoose";

/**
 * A user-created subfolder inside one of an AppBlueprint's 12 fixed
 * sections. Folders nest arbitrarily deep via `parentFolderId` (null =
 * directly under the section root). `path` is denormalized (e.g.
 * "approval_rules/line_items") so Specification.folderPath can reference it
 * directly without a join, and so a folder can be identified/recreated
 * idempotently without walking parents every time.
 */
const blueprintFolderSchema = new Schema(
  {
    blueprintId: { type: Schema.Types.ObjectId, ref: "AppBlueprint", required: true },
    section: { type: String, required: true },
    parentFolderId: { type: Schema.Types.ObjectId, ref: "BlueprintFolder", default: null },
    name: { type: String, required: true },
    path: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

blueprintFolderSchema.index({ blueprintId: 1, section: 1, path: 1 }, { unique: true });
blueprintFolderSchema.index({ blueprintId: 1, section: 1, parentFolderId: 1 });

export type BlueprintFolderAttrs = InferSchemaType<typeof blueprintFolderSchema>;
export type BlueprintFolderDocument = HydratedDocument<BlueprintFolderAttrs>;
export const BlueprintFolderModel =
  (models.BlueprintFolder as Model<BlueprintFolderAttrs>) ||
  model<BlueprintFolderAttrs>("BlueprintFolder", blueprintFolderSchema);
