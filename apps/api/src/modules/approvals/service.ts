import { HTTPException } from "hono/http-exception";
import { CONTENT_TYPES, getContentTypeBySlug } from "../../lib/contentTypeRegistry";
import type { AuthUser } from "../../middleware/auth";

export async function listApprovalQueue() {
  const perType = await Promise.all(
    CONTENT_TYPES.map(async (entry) => {
      const docs = await entry.Model.find({ status: "pending" }).select(
        "name code namespace submittedAt createdBy",
      );
      return docs.map((doc) => ({
        id: String(doc._id),
        type: entry.slug,
        name: doc.name as string,
        // AppBlueprint has no `code` field (it has `namespace` instead) —
        // fall back so the queue can render a code-like chip for it too.
        code: (doc.code as string | undefined) ?? (doc.namespace as string | undefined) ?? "",
        submittedAt: (doc.submittedAt as Date).toISOString(),
        createdBy: String(doc.createdBy),
      }));
    }),
  );

  return perType.flat().sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
}

async function loadPendingOrThrow(slug: string, id: string) {
  const entry = getContentTypeBySlug(slug);
  const doc = await entry.Model.findById(id);
  if (!doc) throw new HTTPException(404, { message: "Item not found" });
  if (doc.status !== "pending") {
    throw new HTTPException(400, { message: "Only pending items can be reviewed" });
  }
  return { entry, doc };
}

export async function approveItem(slug: string, id: string, actor: AuthUser) {
  const { entry, doc } = await loadPendingOrThrow(slug, id);
  doc.status = "approved";
  doc.reviewedBy = actor.id;
  doc.reviewedAt = new Date();
  doc.reviewNote = null;
  await doc.save();
  return { doc, entry };
}

export async function rejectItem(slug: string, id: string, reason: string, actor: AuthUser) {
  const { entry, doc } = await loadPendingOrThrow(slug, id);
  doc.status = "rejected";
  doc.reviewedBy = actor.id;
  doc.reviewedAt = new Date();
  doc.reviewNote = reason;
  await doc.save();
  return { doc, entry };
}
