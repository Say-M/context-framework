import { addDays } from "date-fns";
import { HTTPException } from "hono/http-exception";
import type { ClientSession } from "mongoose";
import { BlueprintFolderModel, SpecificationModel, type SpecificationDocument } from "@bismo/db-models";
import type {
  CreateSpecificationInput,
  ListSpecificationsQuery,
  UpdateSpecificationInput,
} from "@bismo/shared-schemas";
import { getContentTypeByParentType, type ContentTypeEntry } from "../../lib/contentTypeRegistry";
import { buildRawSource } from "../../lib/specification-format";
import { getSpecVersionHistory, snapshotSpecVersion } from "../../lib/versioning";
import type { AuthUser } from "../../middleware/auth";
import { withTransaction } from "../../config/db";
import { reopenAppBlueprintIfApprovedById } from "../app-blueprint/service";

const DEFAULT_TRUST_TIER = "human-reviewed";
const DEFAULT_STATUS = "stable";
const DEFAULT_STALE_AFTER_DAYS = 365;

// Only these 5 sections get a distinct type badge (matching the product
// mockups) — intentionally partial now that a blueprint's sections are a
// dynamic, per-blueprint list rather than a fixed 12: any section not
// listed here (including user-created ones) falls back to the parent's
// defaultSpecType, same as a section-less spec would.
const APP_BLUEPRINT_SECTION_TYPES: Record<string, string> = {
  data_model: "Entity",
  screens: "Screen",
  workflows: "Workflow",
  business_rules: "Business Rule",
  ai_agents: "AI Agent",
};

function deriveSpecType(entry: { parentType: string; defaultSpecType: string }, section: string | null) {
  if (entry.parentType !== "AppBlueprint") return entry.defaultSpecType;
  return (section && APP_BLUEPRINT_SECTION_TYPES[section]) || entry.defaultSpecType;
}

export function serializeSpecification(doc: SpecificationDocument) {
  return {
    id: String(doc._id),
    parentType: doc.parentType,
    parentId: String(doc.parentId),
    section: doc.section,
    folderPath: doc.folderPath,
    filename: doc.filename,
    path: doc.path,
    title: doc.title,
    summary: doc.summary,
    frontmatter: {
      type: doc.frontmatter.type,
      trustTier: doc.frontmatter.trustTier,
      status: doc.frontmatter.status,
      staleAfter: doc.frontmatter.staleAfter.toISOString(),
    },
    content: doc.content,
    rawSource: doc.rawSource,
    version: doc.version,
    createdBy: String(doc.createdBy),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

interface ParentInfo {
  _id: unknown;
  createdBy: unknown;
  status: string;
  reviewedBy: unknown;
  reviewedAt: Date | null;
}

async function loadParentOrThrow(parentType: string, parentId: string) {
  const entry = getContentTypeByParentType(parentType);
  const parent = (await entry.Model.findById(parentId).select(
    "createdBy status reviewedBy reviewedAt",
  )) as ParentInfo | null;
  if (!parent) throw new HTTPException(404, { message: "Parent item not found" });
  return { entry, parent };
}

function assertCanManageSpecs(parentCreatedBy: unknown, actor: AuthUser) {
  if (actor.role === "admin") return;
  if (String(parentCreatedBy) !== actor.id) {
    throw new HTTPException(403, {
      message: "Only the parent item's author or an admin can manage its specifications",
    });
  }
}

/**
 * Any spec content change under an approved parent reopens that parent for
 * re-review — AppBlueprint goes back to 'draft' (it needs an explicit
 * republish, since Publish is what regenerates its manifest); the 3 simple
 * modules go straight back to 'pending' since they have no separate submit
 * step. Only fires if the parent is still 'approved' at the moment this
 * runs (the filter makes it a no-op otherwise).
 */
async function reopenParentIfApproved(entry: ContentTypeEntry, parentId: unknown, session?: ClientSession) {
  if (entry.parentType === "AppBlueprint") {
    await reopenAppBlueprintIfApprovedById(String(parentId), session);
    return;
  }
  await entry.Model.updateOne(
    { _id: parentId, status: "approved" },
    {
      $set: {
        status: "pending",
        reviewNote: null,
        reviewedBy: null,
        reviewedAt: null,
        submittedAt: new Date(),
      },
    },
    { session },
  );
}

export async function listSpecifications(query: ListSpecificationsQuery) {
  const filter: Record<string, unknown> = {
    parentType: query.parentType,
    parentId: query.parentId,
  };
  if (query.section) filter.section = query.section;
  const docs = await SpecificationModel.find(filter).sort({ section: 1, filename: 1 });
  return docs.map(serializeSpecification);
}

export async function getSpecification(id: string) {
  const doc = await SpecificationModel.findById(id);
  if (!doc) throw new HTTPException(404, { message: "Specification not found" });
  return doc;
}

export async function getSpecificationVersions(id: string) {
  return getSpecVersionHistory(id);
}

export async function createSpecification(input: CreateSpecificationInput, actor: AuthUser) {
  const { entry, parent } = await loadParentOrThrow(input.parentType, input.parentId);
  assertCanManageSpecs(parent.createdBy, actor);

  if (input.folderPath) {
    const folder = await BlueprintFolderModel.findOne({
      blueprintId: input.parentId,
      section: input.section,
      path: input.folderPath,
    });
    if (!folder) throw new HTTPException(404, { message: "Target folder not found" });
  }

  const path = input.section
    ? `${input.section}/${input.folderPath ? `${input.folderPath}/` : ""}${input.filename}`
    : input.filename;
  const staleAfter = addDays(new Date(), DEFAULT_STALE_AFTER_DAYS);
  const frontmatter = {
    type: deriveSpecType(entry, input.section),
    trustTier: DEFAULT_TRUST_TIER,
    status: DEFAULT_STATUS,
    staleAfter,
  };
  const rawSource = buildRawSource({ ...frontmatter, title: input.title }, input.content);

  // Spec create + parent specCount bump + (conditionally) reopening the
  // parent for re-review are one logical unit — without a transaction, a
  // crash mid-way leaves the parent's specCount undercounted, or an
  // approved parent that silently gained content without going back for
  // re-review.
  try {
    return await withTransaction(async (session) => {
      const [doc] = (await SpecificationModel.create(
        [
          {
            parentType: input.parentType,
            parentId: input.parentId,
            section: input.section,
            folderPath: input.folderPath,
            filename: input.filename,
            path,
            title: input.title,
            summary: input.summary,
            frontmatter,
            content: input.content,
            rawSource,
            createdBy: actor.id,
          },
        ],
        { session },
      )) as [SpecificationDocument];

      await entry.Model.updateOne({ _id: parent._id }, { $inc: { specCount: 1 } }, { session });
      // Adding new content under an approved parent is still a substantive
      // change to what was reviewed, even though the new file has no prior
      // version of its own to preserve.
      if (parent.status === "approved") {
        await reopenParentIfApproved(entry, parent._id, session);
      }
      return doc;
    });
  } catch (err) {
    if (err instanceof Error && "code" in err && (err as { code?: number }).code === 11000) {
      throw new HTTPException(409, { message: `A file named ${input.filename} already exists here` });
    }
    throw err;
  }
}

export async function updateSpecification(
  id: string,
  input: UpdateSpecificationInput,
  actor: AuthUser,
) {
  const doc = await getSpecification(id);
  const { entry, parent } = await loadParentOrThrow(doc.parentType, String(doc.parentId));
  assertCanManageSpecs(parent.createdBy, actor);

  const parentWasApproved = parent.status === "approved";
  // Captured before any in-memory edits below — this is the "about to be
  // superseded" state, not the new one.
  const preEditSnapshot = parentWasApproved ? serializeSpecification(doc) : null;
  const preEditVersion = doc.version;

  if (parentWasApproved) {
    doc.version += 1;
  }

  if (input.title !== undefined) doc.title = input.title;
  if (input.summary !== undefined) doc.summary = input.summary;
  if (input.content !== undefined) doc.content = input.content;

  if (input.title !== undefined || input.content !== undefined) {
    doc.rawSource = buildRawSource(
      {
        type: doc.frontmatter.type,
        title: doc.title,
        trustTier: doc.frontmatter.trustTier,
        status: doc.frontmatter.status,
        staleAfter: doc.frontmatter.staleAfter,
      },
      doc.content,
    );
  }

  // Snapshot + save + (conditionally) reopening the parent are one logical
  // unit — without a transaction, a crash mid-way leaves a ContentVersion
  // row for a version that was never actually superseded, or an approved
  // parent whose content changed without going back for re-review.
  return withTransaction(async (session) => {
    if (parentWasApproved && preEditSnapshot) {
      await snapshotSpecVersion(
        {
          specificationId: id,
          version: preEditVersion,
          snapshot: preEditSnapshot,
          createdBy: String(doc.createdBy),
          approvedBy: parent.reviewedBy ? String(parent.reviewedBy) : null,
          approvedAt: parent.reviewedAt,
        },
        session,
      );
    }

    await doc.save({ session });
    if (parentWasApproved) {
      await reopenParentIfApproved(entry, parent._id, session);
    }
    return doc;
  });
}

export async function deleteSpecification(id: string, actor: AuthUser) {
  const doc = await getSpecification(id);
  const { entry, parent } = await loadParentOrThrow(doc.parentType, String(doc.parentId));
  assertCanManageSpecs(parent.createdBy, actor);

  // Delete + parent specCount decrement + (conditionally) reopening the
  // parent are one logical unit — without a transaction, a crash mid-way
  // leaves the parent's specCount overcounted, or an approved parent stale
  // after content was actually removed.
  await withTransaction(async (session) => {
    await doc.deleteOne({ session });
    await entry.Model.updateOne({ _id: parent._id }, { $inc: { specCount: -1 } }, { session });
    if (parent.status === "approved") {
      await reopenParentIfApproved(entry, parent._id, session);
    }
  });
}
