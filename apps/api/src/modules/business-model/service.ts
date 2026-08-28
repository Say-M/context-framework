import { HTTPException } from "hono/http-exception";
import { BusinessModelModel, type BusinessModelDocument } from "@bismo/db-models";
import type {
  CreateBusinessModelInput,
  ListBusinessModelsQuery,
  UpdateBusinessModelInput,
} from "@bismo/shared-schemas";
import type { AuthUser } from "../../middleware/auth";

export function serializeBusinessModel(doc: BusinessModelDocument) {
  return {
    id: String(doc._id),
    code: doc.code,
    archetypeCategory: doc.archetypeCategory,
    name: doc.name,
    description: doc.description,
    monetizationMechanics: doc.monetizationMechanics,
    distributionChannels: doc.distributionChannels,
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

export async function listBusinessModels(query: ListBusinessModelsQuery) {
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.archetypeCategory) filter.archetypeCategory = query.archetypeCategory;
  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: "i" } },
      { code: { $regex: query.search, $options: "i" } },
    ];
  }

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    BusinessModelModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit),
    BusinessModelModel.countDocuments(filter),
  ]);

  return {
    items: items.map(serializeBusinessModel),
    page: query.page,
    limit: query.limit,
    total,
  };
}

export async function getBusinessModel(id: string) {
  const doc = await BusinessModelModel.findById(id);
  if (!doc) throw new HTTPException(404, { message: "Business model not found" });
  return doc;
}

export async function createBusinessModel(input: CreateBusinessModelInput, actor: AuthUser) {
  const existing = await BusinessModelModel.findOne({ code: input.code });
  if (existing) {
    throw new HTTPException(409, { message: `Code ${input.code} is already in use` });
  }
  return BusinessModelModel.create({ ...input, createdBy: actor.id });
}

function assertCanMutate(doc: BusinessModelDocument, actor: AuthUser) {
  if (actor.role === "admin") return;
  const isOwner = String(doc.createdBy) === actor.id;
  const editableStatus = doc.status === "pending" || doc.status === "rejected";
  if (!isOwner || !editableStatus) {
    throw new HTTPException(403, {
      message: "Only the author (while pending/rejected) or an admin can modify this item",
    });
  }
}

export async function updateBusinessModel(
  id: string,
  input: UpdateBusinessModelInput,
  actor: AuthUser,
) {
  const doc = await getBusinessModel(id);
  assertCanMutate(doc, actor);
  Object.assign(doc, input);
  await doc.save();
  return doc;
}

export async function deleteBusinessModel(id: string, actor: AuthUser) {
  const doc = await getBusinessModel(id);
  assertCanMutate(doc, actor);
  await doc.deleteOne();
}

export async function resubmitBusinessModel(id: string, actor: AuthUser) {
  const doc = await getBusinessModel(id);
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
