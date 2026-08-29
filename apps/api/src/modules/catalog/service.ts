import { HTTPException } from "hono/http-exception";
import {
  AppBlueprintModel,
  BusinessDomainModel,
  BusinessModelModel,
  OrgContextModel,
  type AppBlueprintDocument,
} from "@bismo/db-models";

function serializeSummary(doc: AppBlueprintDocument) {
  return {
    id: String(doc._id),
    namespace: doc.namespace,
    name: doc.name,
    description: doc.description,
    version: doc.version,
  };
}

/** Public catalog: every blueprint that has reached 'approved', no publish step required. */
export async function listCatalogBlueprints() {
  const docs = await AppBlueprintModel.find({ status: "approved" }).sort({ name: 1 });
  return docs.map(serializeSummary);
}

export async function getCatalogBlueprint(id: string) {
  const doc = await AppBlueprintModel.findOne({ _id: id, status: "approved" });
  if (!doc) throw new HTTPException(404, { message: "Blueprint not found" });

  const [domains, businessModel, orgContext] = await Promise.all([
    BusinessDomainModel.find({ _id: { $in: doc.connections.domainIds } }).select("code name"),
    doc.connections.modelId
      ? BusinessModelModel.findById(doc.connections.modelId).select("code name")
      : null,
    doc.connections.orgContextId
      ? OrgContextModel.findById(doc.connections.orgContextId).select("code name")
      : null,
  ]);

  return {
    ...serializeSummary(doc),
    domains: domains.map((d) => ({ id: String(d._id), code: d.code as string, name: d.name as string })),
    businessModel: businessModel
      ? { id: String(businessModel._id), code: businessModel.code as string, name: businessModel.name as string }
      : null,
    orgContext: orgContext
      ? { id: String(orgContext._id), code: orgContext.code as string, name: orgContext.name as string }
      : null,
  };
}
