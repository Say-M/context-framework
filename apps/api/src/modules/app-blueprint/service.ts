import { HTTPException } from "hono/http-exception";
import {
  AppBlueprintModel,
  BlueprintFolderModel,
  BusinessDomainModel,
  BusinessModelModel,
  OrgContextModel,
  SpecificationModel,
  type AppBlueprintDocument,
  type BlueprintFolderDocument,
} from "@bismo/db-models";
import {
  BLUEPRINT_SECTIONS,
  type BlueprintSection,
  type ConnectionsInput,
  type CreateAppBlueprintInput,
  type CreateBlueprintFolderInput,
  type FolderNode,
  type ListAppBlueprintsQuery,
  type UpdateAppBlueprintMetadataInput,
} from "@bismo/shared-schemas";
import type { AuthUser } from "../../middleware/auth";
import { buildOkfManifest, nextVersion } from "../../lib/okf";

const ROOT_SPEC_FRONTMATTER_TYPE = "Application Blueprint";
const DEFAULT_TRUST_TIER = "human-reviewed";
const DEFAULT_STATUS_LABEL = "stable";
const DEFAULT_STALE_AFTER_DAYS = 365;

export function serializeAppBlueprint(doc: AppBlueprintDocument) {
  return {
    id: String(doc._id),
    namespace: doc.namespace,
    name: doc.name,
    description: doc.description,
    version: doc.version,
    connections: {
      domainIds: doc.connections.domainIds.map((id) => String(id)),
      modelId: doc.connections.modelId ? String(doc.connections.modelId) : null,
      orgContextId: doc.connections.orgContextId ? String(doc.connections.orgContextId) : null,
    },
    sections: doc.sections,
    rootSpecId: doc.rootSpecId ? String(doc.rootSpecId) : null,
    publishedManifest: doc.publishedManifest ?? null,
    publishedAt: doc.publishedAt ? doc.publishedAt.toISOString() : null,
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

export async function listAppBlueprints(query: ListAppBlueprintsQuery) {
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: "i" } },
      { namespace: { $regex: query.search, $options: "i" } },
    ];
  }

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    AppBlueprintModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit),
    AppBlueprintModel.countDocuments(filter),
  ]);

  return {
    items: items.map(serializeAppBlueprint),
    page: query.page,
    limit: query.limit,
    total,
  };
}

export async function getAppBlueprint(id: string) {
  const doc = await AppBlueprintModel.findById(id);
  if (!doc) throw new HTTPException(404, { message: "Application blueprint not found" });
  return doc;
}

async function assertConnectionsExist(input: ConnectionsInput) {
  const [domainCount, model, orgContext] = await Promise.all([
    BusinessDomainModel.countDocuments({ _id: { $in: input.domainIds } }),
    BusinessModelModel.findById(input.modelId).select("_id"),
    OrgContextModel.findById(input.orgContextId).select("_id"),
  ]);
  if (domainCount !== input.domainIds.length) {
    throw new HTTPException(404, { message: "One or more selected business domains were not found" });
  }
  if (!model) throw new HTTPException(404, { message: "Selected business model was not found" });
  if (!orgContext) throw new HTTPException(404, { message: "Selected org context was not found" });
}

export async function createAppBlueprint(input: CreateAppBlueprintInput, actor: AuthUser) {
  const existing = await AppBlueprintModel.findOne({ namespace: input.namespace });
  if (existing) {
    throw new HTTPException(409, { message: `Namespace ${input.namespace} is already in use` });
  }
  await assertConnectionsExist(input);

  const doc = await AppBlueprintModel.create({
    namespace: input.namespace,
    name: input.name,
    description: input.description,
    connections: {
      domainIds: input.domainIds,
      modelId: input.modelId,
      orgContextId: input.orgContextId,
    },
    createdBy: actor.id,
  });

  const staleAfter = new Date();
  staleAfter.setDate(staleAfter.getDate() + DEFAULT_STALE_AFTER_DAYS);
  const rootSpec = await SpecificationModel.create({
    parentType: "AppBlueprint",
    parentId: doc._id,
    section: null,
    filename: "blueprint.md",
    path: "blueprint.md",
    title: `${input.name} Overview`,
    summary: "Root overview document for this application blueprint.",
    frontmatter: {
      type: ROOT_SPEC_FRONTMATTER_TYPE,
      trustTier: DEFAULT_TRUST_TIER,
      status: DEFAULT_STATUS_LABEL,
      staleAfter,
    },
    content: `# ${input.name}\n\n${input.description}\n`,
    rawSource: "",
    createdBy: actor.id,
  });

  doc.rootSpecId = rootSpec._id;
  await doc.save();
  return doc;
}

/** Owner may mutate only while draft/rejected; admin may mutate anytime. */
function assertCanMutate(doc: AppBlueprintDocument, actor: AuthUser) {
  if (actor.role === "admin") return;
  const isOwner = String(doc.createdBy) === actor.id;
  const editableStatus = doc.status === "draft" || doc.status === "rejected";
  if (!isOwner || !editableStatus) {
    throw new HTTPException(403, {
      message: "Only the author (while draft/rejected) or an admin can modify this blueprint",
    });
  }
}

/**
 * If the blueprint is currently approved, reopens it as a draft so it can be
 * edited again — a subsequent Publish resubmits the revised version for
 * review. Triggered only by a spec changing under it (see
 * specifications/service.ts): versioning/history lives at the spec level,
 * not here — this just clears the blueprint's own review state so admins
 * see it back in the queue once republished. No-op if not currently approved.
 */
async function reopenIfApproved(doc: AppBlueprintDocument) {
  if (doc.status !== "approved") return;
  doc.status = "draft";
  doc.reviewNote = null;
  doc.reviewedBy = null;
  doc.reviewedAt = null;
}

/** Called by specifications/service.ts after a spec under an AppBlueprint changes. */
export async function reopenAppBlueprintIfApprovedById(id: string) {
  const doc = await AppBlueprintModel.findById(id);
  if (!doc) return;
  await reopenIfApproved(doc);
  await doc.save();
}

export async function updateConnections(id: string, input: ConnectionsInput, actor: AuthUser) {
  const doc = await getAppBlueprint(id);
  assertCanMutate(doc, actor);
  await assertConnectionsExist(input);

  doc.connections = {
    domainIds: input.domainIds as unknown as typeof doc.connections.domainIds,
    modelId: input.modelId as unknown as typeof doc.connections.modelId,
    orgContextId: input.orgContextId as unknown as typeof doc.connections.orgContextId,
  };
  await doc.save();
  return doc;
}

export async function updateAppBlueprintMetadata(
  id: string,
  input: UpdateAppBlueprintMetadataInput,
  actor: AuthUser,
) {
  const doc = await getAppBlueprint(id);
  assertCanMutate(doc, actor);

  if (input.name !== undefined) doc.name = input.name;
  if (input.description !== undefined) doc.description = input.description;
  await doc.save();
  return doc;
}

export async function deleteAppBlueprint(id: string, actor: AuthUser) {
  const doc = await getAppBlueprint(id);
  assertCanMutate(doc, actor);
  await SpecificationModel.deleteMany({ parentType: "AppBlueprint", parentId: doc._id });
  await doc.deleteOne();
}

interface SpecSummary {
  id: string;
  filename: string;
  path: string;
  title: string;
  frontmatterType: string;
}

export async function getSectionTree(id: string) {
  const doc = await getAppBlueprint(id);
  const [specs, folders] = await Promise.all([
    SpecificationModel.find({ parentType: "AppBlueprint", parentId: doc._id }).sort({
      section: 1,
      filename: 1,
    }),
    BlueprintFolderModel.find({ blueprintId: doc._id }).sort({ path: 1 }),
  ]);

  const toSummary = (spec: (typeof specs)[number]): SpecSummary => ({
    id: String(spec._id),
    filename: spec.filename,
    path: spec.path,
    title: spec.title,
    frontmatterType: spec.frontmatter.type,
  });

  const buildFolderNode = (folder: BlueprintFolderDocument): FolderNode => {
    const childFolders = folders.filter(
      (f) => f.parentFolderId && String(f.parentFolderId) === String(folder._id),
    );
    const folderSpecs = specs.filter(
      (s) => s.section === folder.section && s.folderPath === folder.path,
    );
    return {
      id: String(folder._id),
      name: folder.name,
      path: folder.path,
      specs: folderSpecs.map(toSummary),
      folders: childFolders.map(buildFolderNode),
    };
  };

  const root = specs.find((s) => s.section === null || s.section === undefined) ?? null;
  const sections = BLUEPRINT_SECTIONS.map((slug: BlueprintSection) => {
    const topLevelFolders = folders.filter((f) => f.section === slug && !f.parentFolderId);
    const rootSpecs = specs.filter((s) => s.section === slug && !s.folderPath);
    return {
      slug,
      specs: rootSpecs.map(toSummary),
      folders: topLevelFolders.map(buildFolderNode),
    };
  });

  return { root: root ? toSummary(root) : null, sections };
}

/** Owner-of-blueprint or admin — same ownership rule as spec management, no status gate. */
function assertCanManageFolders(doc: AppBlueprintDocument, actor: AuthUser) {
  if (actor.role === "admin") return;
  if (String(doc.createdBy) !== actor.id) {
    throw new HTTPException(403, {
      message: "Only the blueprint's author or an admin can manage its folders",
    });
  }
}

export async function createBlueprintFolder(
  blueprintId: string,
  input: CreateBlueprintFolderInput,
  actor: AuthUser,
) {
  const doc = await getAppBlueprint(blueprintId);
  assertCanManageFolders(doc, actor);

  let parentFolderId = null;
  if (input.parentFolderPath) {
    const parentFolder = await BlueprintFolderModel.findOne({
      blueprintId,
      section: input.section,
      path: input.parentFolderPath,
    });
    if (!parentFolder) {
      throw new HTTPException(404, { message: "Parent folder not found" });
    }
    parentFolderId = parentFolder._id;
  }

  const path = input.parentFolderPath ? `${input.parentFolderPath}/${input.name}` : input.name;
  try {
    return await BlueprintFolderModel.create({
      blueprintId,
      section: input.section,
      parentFolderId,
      name: input.name,
      path,
      createdBy: actor.id,
    });
  } catch (err) {
    if (err instanceof Error && "code" in err && (err as { code?: number }).code === 11000) {
      throw new HTTPException(409, { message: `A folder named ${input.name} already exists here` });
    }
    throw err;
  }
}

export async function deleteBlueprintFolder(blueprintId: string, folderId: string, actor: AuthUser) {
  const doc = await getAppBlueprint(blueprintId);
  assertCanManageFolders(doc, actor);

  const folder = await BlueprintFolderModel.findOne({ _id: folderId, blueprintId });
  if (!folder) throw new HTTPException(404, { message: "Folder not found" });

  // Cascade: this folder, every folder nested under it, and every spec
  // living directly in any of those folders.
  const descendants = await BlueprintFolderModel.find({
    blueprintId,
    section: folder.section,
    $or: [{ _id: folder._id }, { path: { $regex: `^${folder.path}/` } }],
  });
  const paths = descendants.map((f) => f.path);
  const folderIds = descendants.map((f) => f._id);

  await SpecificationModel.deleteMany({
    parentType: "AppBlueprint",
    parentId: blueprintId,
    section: folder.section,
    folderPath: { $in: paths },
  });
  await BlueprintFolderModel.deleteMany({ _id: { $in: folderIds } });
}

/** Live preview of what Publish would generate — doesn't persist anything. */
export async function previewManifest(id: string) {
  const doc = await getAppBlueprint(id);
  const version = nextVersion(doc.version);
  return buildOkfManifest(doc, version, String(doc.createdBy));
}

export async function publishAppBlueprint(id: string, actor: AuthUser) {
  const doc = await getAppBlueprint(id);
  assertCanMutate(doc, actor);

  const version = nextVersion(doc.version);
  const manifest = await buildOkfManifest(doc, version, actor.id);

  doc.publishedManifest = manifest as unknown as typeof doc.publishedManifest;
  doc.version = version;
  doc.publishedAt = new Date();
  doc.status = "pending";
  doc.reviewNote = null;
  doc.reviewedBy = null;
  doc.reviewedAt = null;
  doc.submittedAt = new Date();
  await doc.save();
  return doc;
}
