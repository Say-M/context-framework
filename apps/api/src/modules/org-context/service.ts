import { HTTPException } from "hono/http-exception";
import { OrgContextModel, type OrgContextDocument } from "@bismo/db-models";
import type {
  CreateOrgContextInput,
  ListOrgContextsQuery,
  UpdateOrgContextInput,
} from "@bismo/shared-schemas";
import type { AuthUser } from "../../middleware/auth";

export function serializeOrgContext(doc: OrgContextDocument) {
  return {
    id: String(doc._id),
    code: doc.code,
    structureType: doc.structureType,
    name: doc.name,
    description: doc.description,
    legalEntities: doc.legalEntities,
    operatingLocations: doc.operatingLocations,
    doaTiers: doc.doaTiers,
    complianceTags: doc.complianceTags,
    specCount: doc.specCount,
    status: doc.status,
    createdBy: String(doc.createdBy),
    reviewedBy: doc.reviewedBy ? String(doc.reviewedBy) : null,
    reviewNote: doc.reviewNote,
    reviewedAt: doc.reviewedAt ? doc.reviewedAt.toISOString() : null,
    submittedAt: doc.submittedAt.toISOString(),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export async function listOrgContexts(query: ListOrgContextsQuery) {
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.structureType) filter.structureType = query.structureType;
  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: "i" } },
      { code: { $regex: query.search, $options: "i" } },
    ];
  }

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    OrgContextModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit),
    OrgContextModel.countDocuments(filter),
  ]);

  return {
    items: items.map(serializeOrgContext),
    page: query.page,
    limit: query.limit,
    total,
  };
}

export async function getOrgContext(id: string) {
  const doc = await OrgContextModel.findById(id);
  if (!doc) throw new HTTPException(404, { message: "Organization context not found" });
  return doc;
}

export async function createOrgContext(input: CreateOrgContextInput, actor: AuthUser) {
  const existing = await OrgContextModel.findOne({ code: input.code });
  if (existing) {
    throw new HTTPException(409, { message: `Code ${input.code} is already in use` });
  }
  return OrgContextModel.create({ ...input, createdBy: actor.id });
}

function assertCanMutate(doc: OrgContextDocument, actor: AuthUser) {
  if (actor.role === "admin") return;
  const isOwner = String(doc.createdBy) === actor.id;
  const editableStatus = doc.status === "pending" || doc.status === "rejected";
  if (!isOwner || !editableStatus) {
    throw new HTTPException(403, {
      message: "Only the author (while pending/rejected) or an admin can modify this item",
    });
  }
}

export async function updateOrgContext(id: string, input: UpdateOrgContextInput, actor: AuthUser) {
  const doc = await getOrgContext(id);
  assertCanMutate(doc, actor);
  Object.assign(doc, input);
  await doc.save();
  return doc;
}

export async function deleteOrgContext(id: string, actor: AuthUser) {
  const doc = await getOrgContext(id);
  assertCanMutate(doc, actor);
  await doc.deleteOne();
}

export async function resubmitOrgContext(id: string, actor: AuthUser) {
  const doc = await getOrgContext(id);
  const isOwner = String(doc.createdBy) === actor.id;
  if (!isOwner && actor.role !== "admin") {
    throw new HTTPException(403, { message: "Only the author or an admin can resubmit this item" });
  }
  if (doc.status !== "rejected") {
    throw new HTTPException(400, { message: "Only a rejected item can be resubmitted" });
  }
  doc.status = "pending";
  doc.reviewNote = null;
  doc.reviewedBy = null;
  doc.reviewedAt = null;
  doc.submittedAt = new Date();
  await doc.save();
  return doc;
}
