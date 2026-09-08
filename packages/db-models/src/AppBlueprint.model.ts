import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from "mongoose";
import { DEFAULT_BLUEPRINT_SECTIONS } from "@bismo/shared-schemas";
import { approvablePlugin, type ApprovableFields } from "./plugins/approvable.plugin";

const connectionsSchema = new Schema(
  {
    domainIds: [{ type: Schema.Types.ObjectId, ref: "BusinessDomain" }],
    modelId: { type: Schema.Types.ObjectId, ref: "BusinessModel", default: null },
    orgContextId: { type: Schema.Types.ObjectId, ref: "OrgContext", default: null },
  },
  { _id: false },
);

const okfRefSchema = new Schema(
  { id: { type: Schema.Types.ObjectId, required: true }, code: String, name: String },
  { _id: false },
);

const publishedManifestSchema = new Schema(
  {
    okf_version: { type: String, required: true },
    namespace: { type: String, required: true },
    name: { type: String, required: true },
    version: { type: String, required: true },
    description: { type: String, default: "" },
    author: {
      type: new Schema({ name: String, email: String }, { _id: false }),
      required: true,
    },
    inherited_domains: { type: [okfRefSchema], default: [] },
    inherited_models: { type: [okfRefSchema], default: [] },
    org_context: { type: [okfRefSchema], default: [] },
  },
  { _id: false },
);

const appBlueprintSchema = new Schema(
  {
    namespace: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    version: { type: String, default: "v0.0.0" },
    connections: {
      type: connectionsSchema,
      default: () => ({ domainIds: [], modelId: null, orgContextId: null }),
    },
    // A dynamic per-blueprint list of section slugs, not a fixed enum — see
    // DEFAULT_BLUEPRINT_SECTIONS's doc comment. Authors can add/remove
    // beyond this starting seed via POST/DELETE /:id/sections.
    sections: { type: [String], default: () => [...DEFAULT_BLUEPRINT_SECTIONS] },
    rootSpecId: { type: Schema.Types.ObjectId, ref: "Specification", default: null },
    publishedManifest: { type: publishedManifestSchema, default: null },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// A blueprint isn't submitted for review until the author explicitly
// Publishes it (see lib/okf.ts) — unlike the other 3 modules where creation
// itself submits for review, so the default status here is 'draft', not
// 'pending'.
approvablePlugin(appBlueprintSchema, {
  statuses: ["draft", "pending", "approved", "rejected"],
  defaultStatus: "draft",
});

export type AppBlueprintStatus = "draft" | "pending" | "approved" | "rejected";
export type AppBlueprintAttrs = InferSchemaType<typeof appBlueprintSchema> &
  ApprovableFields<AppBlueprintStatus>;
export type AppBlueprintDocument = HydratedDocument<AppBlueprintAttrs>;
export const AppBlueprintModel =
  (models.AppBlueprint as Model<AppBlueprintAttrs>) ||
  model<AppBlueprintAttrs>("AppBlueprint", appBlueprintSchema);
