import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from "mongoose";
import { approvablePlugin, type ApprovableFields } from "./plugins/approvable.plugin";

const businessModelSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    archetypeCategory: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    monetizationMechanics: { type: String, default: "" },
    distributionChannels: { type: [String], default: [] },
    specCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

approvablePlugin(businessModelSchema);

export type BusinessModelAttrs = InferSchemaType<typeof businessModelSchema> & ApprovableFields;
export type BusinessModelDocument = HydratedDocument<BusinessModelAttrs>;
export const BusinessModelModel =
  (models.BusinessModel as Model<BusinessModelAttrs>) ||
  model<BusinessModelAttrs>("BusinessModel", businessModelSchema);
