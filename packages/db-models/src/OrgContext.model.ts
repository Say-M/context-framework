import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from "mongoose";
import { approvablePlugin, type ApprovableFields } from "./plugins/approvable.plugin";

const orgContextSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    structureType: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    legalEntities: { type: [String], default: [] },
    operatingLocations: { type: [String], default: [] },
    doaTiers: { type: [String], default: [] },
    complianceTags: { type: [String], default: [] },
    specCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

approvablePlugin(orgContextSchema);

export type OrgContextAttrs = InferSchemaType<typeof orgContextSchema> & ApprovableFields;
export type OrgContextDocument = HydratedDocument<OrgContextAttrs>;
export const OrgContextModel =
  (models.OrgContext as Model<OrgContextAttrs>) ||
  model<OrgContextAttrs>("OrgContext", orgContextSchema);
