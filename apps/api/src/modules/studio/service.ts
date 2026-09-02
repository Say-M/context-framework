import { readFile } from "node:fs/promises";
import path from "node:path";
import { HTTPException } from "hono/http-exception";
import {
  AppBlueprintModel,
  StudioArtifactModel,
  StudioMessageModel,
  StudioThreadModel,
  type StudioArtifactDocument,
  type StudioMessageDocument,
  type StudioThreadDocument,
} from "@bismo/db-models";
import type { CreateStudioThreadInput, UpdateStudioArtifactInput } from "@bismo/shared-schemas";
import { env } from "../../config/env";
import { runStudioTurn } from "../../lib/studioAgent";

async function serializeStudioThread(doc: StudioThreadDocument) {
  const blueprint = doc.blueprintId ? await AppBlueprintModel.findById(doc.blueprintId).select("name") : null;
  return {
    id: String(doc._id),
    blueprintId: doc.blueprintId ? String(doc.blueprintId) : null,
    blueprintName: blueprint?.name ?? null,
    title: doc.title,
    status: doc.status,
    lastError: doc.lastError,
    createdBy: String(doc.createdBy),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function serializeStudioMessage(doc: StudioMessageDocument) {
  return {
    id: String(doc._id),
    threadId: String(doc.threadId),
    role: doc.role,
    content: doc.content,
    artifactId: doc.artifactId ? String(doc.artifactId) : null,
    failed: doc.failed,
    deepResearch: doc.deepResearch,
    createdAt: doc.createdAt.toISOString(),
  };
}

function serializeStudioArtifact(doc: StudioArtifactDocument) {
  return {
    id: String(doc._id),
    threadId: String(doc.threadId),
    createdBy: String(doc.createdBy),
    kind: doc.kind,
    title: doc.title,
    version: doc.version,
    content: doc.content,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export async function createStudioThread(input: CreateStudioThreadInput, platformUserId: string) {
  if (input.blueprintId) {
    const blueprint = await AppBlueprintModel.findById(input.blueprintId);
    if (!blueprint || blueprint.status !== "approved") {
      throw new HTTPException(404, { message: "Blueprint not found" });
    }
  }

  const doc = await StudioThreadModel.create({
    createdBy: platformUserId,
    blueprintId: input.blueprintId ?? null,
    title: "New thread",
    status: "idle",
  });
  return serializeStudioThread(doc);
}

export async function listMyStudioThreads(platformUserId: string) {
  const docs = await StudioThreadModel.find({ createdBy: platformUserId }).sort({ createdAt: -1 });
  return Promise.all(docs.map(serializeStudioThread));
}

function assertOwnsThread(doc: StudioThreadDocument, platformUserId: string) {
  // 404, not 403 — same reasoning as generated-apps: a platform user
  // shouldn't learn that another user's thread exists at all.
  if (String(doc.createdBy) !== platformUserId) {
    throw new HTTPException(404, { message: "Thread not found" });
  }
}

async function getOwnedThread(id: string, platformUserId: string) {
  const doc = await StudioThreadModel.findById(id);
  if (!doc) throw new HTTPException(404, { message: "Thread not found" });
  assertOwnsThread(doc, platformUserId);
  return doc;
}

export async function getStudioThread(id: string, platformUserId: string) {
  const doc = await getOwnedThread(id, platformUserId);
  return serializeStudioThread(doc);
}

export async function listStudioMessages(threadId: string, platformUserId: string) {
  await getOwnedThread(threadId, platformUserId);
  const docs = await StudioMessageModel.find({ threadId }).sort({ createdAt: 1 });
  return docs.map(serializeStudioMessage);
}

export async function sendStudioMessage(
  threadId: string,
  content: string,
  platformUserId: string,
  deepResearch = false,
) {
  const doc = await getOwnedThread(threadId, platformUserId);
  if (doc.status !== "idle") {
    throw new HTTPException(409, { message: "Wait for the current turn to finish before sending another message" });
  }

  const userMessage = await StudioMessageModel.create({ threadId, role: "user", content, deepResearch });

  // First message titles the thread, mirroring how a chat app usually
  // shows the opening request in the sidebar rather than "New thread".
  if (doc.title === "New thread") {
    await StudioThreadModel.updateOne({ _id: threadId }, { $set: { title: content.slice(0, 80) } });
  }
  await StudioThreadModel.updateOne({ _id: threadId }, { $set: { status: "working" } });

  // Deliberately not awaited — same fire-and-forget pattern as
  // generated-apps chat. runStudioTurn always resolves status back to
  // "idle" itself, so this catch is only a last-resort safety net.
  void runStudioTurn(threadId, String(userMessage._id), content, deepResearch).catch((err) => {
    console.error(`[studio] runStudioTurn(${threadId}) rejected unexpectedly:`, err);
  });

  return serializeStudioMessage(userMessage);
}

export async function listStudioArtifacts(threadId: string, platformUserId: string) {
  await getOwnedThread(threadId, platformUserId);
  const docs = await StudioArtifactModel.find({ threadId }).sort({ createdAt: 1 });
  return docs.map(serializeStudioArtifact);
}

export async function getStudioArtifact(id: string, platformUserId: string) {
  const doc = await StudioArtifactModel.findOne({ _id: id, createdBy: platformUserId });
  if (!doc) throw new HTTPException(404, { message: "Artifact not found" });
  return serializeStudioArtifact(doc);
}

export async function readStudioArtifactImage(id: string, platformUserId: string) {
  const doc = await StudioArtifactModel.findOne({ _id: id, createdBy: platformUserId });
  if (!doc || doc.kind !== "image") throw new HTTPException(404, { message: "Image not found" });
  const content = doc.content as { mimeType?: string; storagePath?: string } | null;
  if (!content?.storagePath) throw new HTTPException(404, { message: "Image not found" });
  const buffer = await readFile(path.join(env.STUDIO_ASSETS_DIR, content.storagePath));
  return { buffer, mimeType: content.mimeType ?? "image/png" };
}

export async function updateStudioArtifact(id: string, platformUserId: string, update: UpdateStudioArtifactInput) {
  // z.unknown() fields are inferred as optional even without .optional() —
  // a Zod quirk, not a real "content is optional" contract — so this is
  // checked explicitly rather than assumed away by the type.
  if (update.content === undefined) {
    throw new HTTPException(400, { message: "content is required" });
  }
  const doc = await StudioArtifactModel.findOne({ _id: id, createdBy: platformUserId });
  if (!doc) throw new HTTPException(404, { message: "Artifact not found" });
  doc.content = update.content;
  if (update.title) doc.title = update.title;
  doc.version += 1;
  await doc.save();
  return serializeStudioArtifact(doc);
}
