import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from "mongoose";
import { approvablePlugin, type ApprovableFields } from "./plugins/approvable.plugin";

const businessDomainSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    category: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    capabilities: { type: [String], default: [] },
    keyEntities: { type: [String], default: [] },
    specCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

approvablePlugin(businessDomainSchema);

export type BusinessDomainAttrs = InferSchemaType<typeof businessDomainSchema> & ApprovableFields;
export type BusinessDomainDocument = HydratedDocument<BusinessDomainAttrs>;
export const BusinessDomainModel =
  (models.BusinessDomain as Model<BusinessDomainAttrs>) ||
  model<BusinessDomainAttrs>("BusinessDomain", businessDomainSchema);
