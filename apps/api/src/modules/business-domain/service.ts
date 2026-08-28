import { HTTPException } from "hono/http-exception";
import { BusinessDomainModel, type BusinessDomainDocument } from "@bismo/db-models";
import type {
  CreateBusinessDomainInput,
  ListBusinessDomainsQuery,
  UpdateBusinessDomainInput,
} from "@bismo/shared-schemas";
import type { AuthUser } from "../../middleware/auth";

export function serializeBusinessDomain(doc: BusinessDomainDocument) {
  return {
    id: String(doc._id),
    code: doc.code,
    category: doc.category,
    name: doc.name,
    description: doc.description,
    capabilities: doc.capabilities,
    keyEntities: doc.keyEntities,
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

export async function listBusinessDomains(query: ListBusinessDomainsQuery) {
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.category) filter.category = query.category;
  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: "i" } },
      { code: { $regex: query.search, $options: "i" } },
    ];
  }

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    BusinessDomainModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit),
    BusinessDomainModel.countDocuments(filter),
  ]);

  return {
    items: items.map(serializeBusinessDomain),
    page: query.page,
    limit: query.limit,
    total,
  };
}

export async function getBusinessDomain(id: string) {
  const doc = await BusinessDomainModel.findById(id);
  if (!doc) throw new HTTPException(404, { message: "Business domain not found" });
  return doc;
}

export async function createBusinessDomain(input: CreateBusinessDomainInput, actor: AuthUser) {
  const existing = await BusinessDomainModel.findOne({ code: input.code });
  if (existing) {
    throw new HTTPException(409, { message: `Code ${input.code} is already in use` });
  }
  return BusinessDomainModel.create({ ...input, createdBy: actor.id });
}

/** Owner may mutate only while pending/rejected; admin may mutate anytime. */
function assertCanMutate(doc: BusinessDomainDocument, actor: AuthUser) {
  if (actor.role === "admin") return;
  const isOwner = String(doc.createdBy) === actor.id;
  const editableStatus = doc.status === "pending" || doc.status === "rejected";
  if (!isOwner || !editableStatus) {
    throw new HTTPException(403, {
      message: "Only the author (while pending/rejected) or an admin can modify this item",
    });
  }
}

export async function updateBusinessDomain(
  id: string,
  input: UpdateBusinessDomainInput,
  actor: AuthUser,
) {
  const doc = await getBusinessDomain(id);
  assertCanMutate(doc, actor);
  Object.assign(doc, input);
  await doc.save();
  return doc;
}

export async function deleteBusinessDomain(id: string, actor: AuthUser) {
  const doc = await getBusinessDomain(id);
  assertCanMutate(doc, actor);
  await doc.deleteOne();
}

export async function resubmitBusinessDomain(id: string, actor: AuthUser) {
  const doc = await getBusinessDomain(id);
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
