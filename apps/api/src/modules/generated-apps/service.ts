import { rm } from "node:fs/promises";
import { HTTPException } from "hono/http-exception";
import {
  AppBlueprintModel,
  ChatMessageModel,
  GeneratedAppModel,
  SpecificationModel,
  type ChatMessageDocument,
  type GeneratedAppDocument,
} from "@bismo/db-models";
import type { ChatMode, CreateGeneratedAppInput } from "@bismo/shared-schemas";
import { archiveCommitToBuffer, listCommits, repoDir } from "../../lib/gitRepo";
import { runGeneration } from "../../lib/generation";
import { runChatTurn } from "../../lib/chat";
import { resolveApproval } from "../../lib/planApprovals";
import { withTransaction } from "../../config/db";

export async function serializeGeneratedApp(doc: GeneratedAppDocument) {
  const blueprint = await AppBlueprintModel.findById(doc.blueprintId).select("name");
  return {
    id: String(doc._id),
    blueprintId: String(doc.blueprintId),
    blueprintName: blueprint?.name ?? "",
    database: doc.database,
    frontendFramework: doc.frontendFramework,
    initialPrompt: doc.initialPrompt,
    status: doc.status,
    lastError: doc.lastError,
    pendingPlan: doc.pendingPlan,
    createdBy: String(doc.createdBy),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

/**
 * Resolves everything the generator needs to read: the blueprint's connected
 * domains/model/org context plus every Specification across them and the
 * blueprint's own. Consumed by lib/generation.ts to build the agent's prompt.
 */
export async function buildBlueprintBundle(blueprintId: string) {
  const blueprint = await AppBlueprintModel.findById(blueprintId);
  if (!blueprint) throw new HTTPException(404, { message: "Blueprint not found" });

  const [domainSpecs, modelSpecs, orgContextSpecs, blueprintSpecs] = await Promise.all([
    SpecificationModel.find({
      parentType: "BusinessDomain",
      parentId: { $in: blueprint.connections.domainIds },
    }),
    blueprint.connections.modelId
      ? SpecificationModel.find({ parentType: "BusinessModel", parentId: blueprint.connections.modelId })
      : Promise.resolve([]),
    blueprint.connections.orgContextId
      ? SpecificationModel.find({ parentType: "OrgContext", parentId: blueprint.connections.orgContextId })
      : Promise.resolve([]),
    SpecificationModel.find({ parentType: "AppBlueprint", parentId: blueprint._id }),
  ]);

  return { blueprint, specs: [...domainSpecs, ...modelSpecs, ...orgContextSpecs, ...blueprintSpecs] };
}

export async function createGeneratedApp(input: CreateGeneratedAppInput, platformUserId: string) {
  const blueprint = await AppBlueprintModel.findById(input.blueprintId);
  if (!blueprint || blueprint.status !== "approved") {
    throw new HTTPException(404, { message: "Blueprint not found" });
  }

  const doc = await GeneratedAppModel.create({
    blueprintId: input.blueprintId,
    createdBy: platformUserId,
    database: input.database,
    frontendFramework: input.frontendFramework || "React + Vite + TanStack Query",
    initialPrompt: input.prompt || "",
    status: "working",
  });

  // Deliberately not awaited — real generation takes minutes. The caller
  // gets the doc back immediately with status "working" and polls
  // GET /:id; runGeneration always resolves it to a terminal status itself,
  // so this catch is only a last-resort safety net.
  void runGeneration(String(doc._id)).catch((err) => {
    console.error(`[generated-apps] runGeneration(${doc._id}) rejected unexpectedly:`, err);
  });

  return doc;
}

function assertOwnsGeneratedApp(doc: GeneratedAppDocument, platformUserId: string) {
  // 404, not 403 — a platform user shouldn't learn that another user's
  // generated app exists at all.
  if (String(doc.createdBy) !== platformUserId) {
    throw new HTTPException(404, { message: "Generated app not found" });
  }
}

export async function listMyGeneratedApps(platformUserId: string) {
  const docs = await GeneratedAppModel.find({ createdBy: platformUserId }).sort({ createdAt: -1 });
  return Promise.all(docs.map(serializeGeneratedApp));
}

export async function getGeneratedApp(id: string, platformUserId: string) {
  const doc = await GeneratedAppModel.findById(id);
  if (!doc) throw new HTTPException(404, { message: "Generated app not found" });
  assertOwnsGeneratedApp(doc, platformUserId);
  return doc;
}

export async function listVersions(id: string, platformUserId: string) {
  await getGeneratedApp(id, platformUserId);
  return listCommits(repoDir(id));
}

export async function downloadVersion(id: string, sha: string, platformUserId: string) {
  await getGeneratedApp(id, platformUserId);
  const commits = await listCommits(repoDir(id));
  if (!commits.some((commit) => commit.sha === sha)) {
    throw new HTTPException(404, { message: "Version not found" });
  }
  return archiveCommitToBuffer(repoDir(id), sha);
}

export async function deleteGeneratedApp(id: string, platformUserId: string) {
  const doc = await getGeneratedApp(id, platformUserId);
  if (doc.status === "working" || doc.status === "awaiting_approval") {
    throw new HTTPException(409, { message: "Can't delete an app while it's still generating" });
  }
  // Without a transaction, a crash between these two deletes leaves orphaned
  // ChatMessages pointing at a deleted GeneratedApp.
  await withTransaction(async (session) => {
    await ChatMessageModel.deleteMany({ generatedAppId: id }, { session });
    await doc.deleteOne({ session });
  });
  // Windows can hold a transient lock on a just-used directory (e.g. a git
  // subprocess exiting) — retry with backoff rather than surfacing EBUSY on
  // what would otherwise be a fully-succeeded delete (the DB rows are
  // already gone by this point regardless).
  await rm(repoDir(id), { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}

function serializeChatMessage(doc: ChatMessageDocument) {
  return {
    id: String(doc._id),
    generatedAppId: String(doc.generatedAppId),
    mode: doc.mode,
    role: doc.role,
    content: doc.content,
    commitSha: doc.commitSha,
    failed: doc.failed,
    createdAt: doc.createdAt.toISOString(),
  };
}

export async function listChatMessages(id: string, platformUserId: string) {
  await getGeneratedApp(id, platformUserId);
  const docs = await ChatMessageModel.find({ generatedAppId: id }).sort({ createdAt: 1 });
  return docs.map(serializeChatMessage);
}

export async function sendChatMessage(id: string, content: string, mode: ChatMode, platformUserId: string) {
  const doc = await getGeneratedApp(id, platformUserId);
  if (doc.status !== "idle") {
    throw new HTTPException(409, { message: "Wait for the current turn to finish before sending another message" });
  }

  const userMessage = await ChatMessageModel.create({
    generatedAppId: id,
    mode,
    role: "user",
    content,
  });

  await GeneratedAppModel.updateOne({ _id: id }, { $set: { status: "working" } });

  // Deliberately not awaited — same fire-and-forget pattern as
  // createGeneratedApp. runChatTurn always resolves status back to "idle"
  // itself, so this catch is only a last-resort safety net.
  void runChatTurn(id, String(userMessage._id), content, mode).catch((err) => {
    console.error(`[generated-apps] runChatTurn(${id}) rejected unexpectedly:`, err);
  });

  return serializeChatMessage(userMessage);
}

export async function decidePlan(
  id: string,
  decision: "approve" | "reject",
  feedback: string | undefined,
  platformUserId: string,
) {
  const doc = await getGeneratedApp(id, platformUserId);
  if (doc.status !== "awaiting_approval") {
    throw new HTTPException(409, { message: "No plan is currently awaiting approval." });
  }

  const resolved = resolveApproval(id, { approved: decision === "approve", feedback });
  if (!resolved) {
    // The in-memory pending approval is gone — almost certainly the API
    // process restarted mid-review (the dev server's --watch does this on
    // every save). The paused agent run is gone with it, so self-heal back
    // to idle instead of leaving the UI stuck on "awaiting_approval"
    // forever with no way to resolve it.
    await GeneratedAppModel.updateOne({ _id: id }, { $set: { status: "idle", pendingPlan: null } });
    throw new HTTPException(409, {
      message: "This plan is no longer active (the server may have restarted) — send a new message to try again.",
    });
  }
}
