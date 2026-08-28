import { ContentVersionModel } from "@bismo/db-models";

interface SnapshotSpecVersionParams {
  specificationId: string;
  version: number;
  snapshot: Record<string, unknown>;
  createdBy: string;
  approvedBy: string | null;
  approvedAt: Date | null;
}

/**
 * Freezes a Specification's current (about-to-be-superseded) state into
 * history, right before it's edited — only called when the spec's parent
 * (BusinessDomain/BusinessModel/OrgContext/AppBlueprint) is 'approved' at
 * edit time, since that's the only case where the existing content is
 * "live" and worth preserving. Write-once — nothing ever updates a
 * ContentVersion row afterward.
 */
export async function snapshotSpecVersion(params: SnapshotSpecVersionParams) {
  await ContentVersionModel.create({
    parentType: "Specification",
    parentId: params.specificationId,
    version: params.version,
    snapshot: params.snapshot,
    createdBy: params.createdBy,
    approvedBy: params.approvedBy,
    approvedAt: params.approvedAt,
    supersededAt: new Date(),
  });
}

function serializeVersion(doc: {
  _id: unknown;
  version: unknown;
  snapshot: unknown;
  createdBy: unknown;
  approvedBy?: unknown;
  approvedAt?: Date | null;
  supersededAt: Date;
}) {
  return {
    id: String(doc._id),
    version: doc.version,
    snapshot: doc.snapshot,
    createdBy: String(doc.createdBy),
    approvedBy: doc.approvedBy ? String(doc.approvedBy) : null,
    approvedAt: doc.approvedAt ? doc.approvedAt.toISOString() : null,
    supersededAt: doc.supersededAt.toISOString(),
  };
}

export async function getSpecVersionHistory(specificationId: string) {
  const docs = await ContentVersionModel.find({
    parentType: "Specification",
    parentId: specificationId,
  }).sort({ supersededAt: -1 });
  return docs.map(serializeVersion);
}
