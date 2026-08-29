import { ChatMessageModel, GeneratedAppModel, type ChatMessageDocument } from "@bismo/db-models";
import type { ChatMode } from "@bismo/shared-schemas";
import { commitWorkingTree, repoDir } from "./gitRepo";
import { publish } from "./socket";
import { BUILD_TOOLS, READ_ONLY_TOOLS, runAgentQuery } from "./agentRun";

const HISTORY_LIMIT = 20;

function buildChatPrompt(mode: ChatMode, history: ChatMessageDocument[], newMessage: string): string {
  const historyBlock = history
    .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
    .join("\n\n");

  const task =
    mode === "ask"
      ? `# Your task
Answer the user's question about this application — you are read-only in this mode. Explore the repo (Glob/Read/Grep) as needed to give a specific, accurate answer grounded in what's actually there, not a guess. Do not propose it as something you're about to do — you have no Write/Edit tools available at all, so just explain.`
      : `# Your task
Make the requested change against this existing repo. Explore it first (Glob/Read) before editing; don't assume anything about its structure beyond what you actually find there. If the request doesn't actually require any file changes (e.g. it's phrased as a question), just answer it — don't invent changes to make.`;

  return `You are continuing work on an application that already exists — the current directory already contains real files.

# Fixed stack (still applies — do not substitute anything)
Backend: Bun + Hono, ORM: Prisma. Frontend: whatever this repo already uses — check its package.json rather than guessing.

# Conversation so far
${historyBlock || "(this is the first message)"}

# New request from the user
${newMessage}

${task}

# Constraints
- You have ${mode === "ask" ? "Read, Glob, and Grep" : "Read, Write, Edit, Glob, and Grep"} tools only — no shell access. You cannot run \`bun install\`, \`prisma generate\`, or any other command.
- Do not initialize a git repository or attempt to commit — that happens outside your control after you finish.
- Stay inside the current directory.
`;
}

/**
 * A failed chat turn never fails the GeneratedApp itself — versions from
 * earlier turns (or the initial generation) still exist and the app is
 * still perfectly usable, so `status` always returns to "idle" here. The
 * failure is recorded on this one message instead.
 */
async function markChatTurnFailed(generatedAppId: string, mode: ChatMode, message: string) {
  console.error(`[chat] ${generatedAppId} turn failed: ${message}`);
  await ChatMessageModel.create({
    generatedAppId,
    mode,
    role: "assistant",
    content: message.slice(0, 2000),
    failed: true,
  });
  await GeneratedAppModel.updateOne({ _id: generatedAppId }, { $set: { status: "idle" } });
  publish(generatedAppId, { type: "done", status: "idle", lastError: null });
}

/**
 * Runs one chat-driven turn against an already-generated app's existing
 * repo. Always resolves `status` back to "idle" — success or failure —
 * never leaves it stuck on "working" and never marks the app "failed" (see
 * markChatTurnFailed above).
 *
 * Ask mode is read-only end to end: restricted to READ_ONLY_TOOLS (so it
 * structurally cannot write a file regardless of what the prompt says) and
 * never calls commitWorkingTree — it's guaranteed to be a no-op anyway
 * without Write/Edit tools, but skipping it makes "Ask never produces a
 * version" true by construction, not just by accident.
 */
export async function runChatTurn(generatedAppId: string, userMessageId: string, content: string, mode: ChatMode) {
  const doc = await GeneratedAppModel.findById(generatedAppId);
  if (!doc) return;

  try {
    const history = await ChatMessageModel.find({ generatedAppId, _id: { $ne: userMessageId } })
      .sort({ createdAt: -1 })
      .limit(HISTORY_LIMIT);
    history.reverse();

    const dir = repoDir(generatedAppId);
    const prompt = buildChatPrompt(mode, history, content);
    const text = await runAgentQuery(generatedAppId, dir, prompt, mode === "ask" ? READ_ONLY_TOOLS : BUILD_TOOLS);

    const commitSha = mode === "ask" ? null : await commitWorkingTree(dir, `Chat: ${content.slice(0, 72)}`);

    await ChatMessageModel.create({
      generatedAppId,
      mode,
      role: "assistant",
      content: text || (commitSha ? "Done." : "No changes were needed."),
      commitSha,
    });

    await GeneratedAppModel.updateOne({ _id: generatedAppId }, { $set: { status: "idle" } });
    publish(generatedAppId, { type: "done", status: "idle", lastError: null });
  } catch (err) {
    await markChatTurnFailed(generatedAppId, mode, err instanceof Error ? err.message : String(err));
  }
}
