import { ChatMessageModel, GeneratedAppModel, type ChatMessageDocument } from "@bismo/db-models";
import type { ChatMode } from "@bismo/shared-schemas";
import { commitWorkingTree, repoDir } from "./gitRepo";
import { publish } from "./socket";
import { BUILD_TOOLS, PLAN_TOOLS, READ_ONLY_TOOLS, runAgentQuery } from "./agentRun";
import { awaitApproval } from "./planApprovals";
import { injectDashboard } from "./dashboardScaffold";

const HISTORY_LIMIT = 20;

function buildChatPrompt(mode: ChatMode, history: ChatMessageDocument[], newMessage: string): string {
  const historyBlock = history
    .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
    .join("\n\n");

  const task =
    mode === "ask"
      ? `# Your task
Answer the user's question about this application — you are read-only in this mode. Explore the repo (Glob/Read/Grep) as needed to give a specific, accurate answer grounded in what's actually there, not a guess. Do not propose it as something you're about to do — you have no Write/Edit tools available at all, so just explain.`
      : mode === "plan"
        ? `# Your task
Explore this repo (Glob/Read/Grep) to understand it, then propose a concrete plan for the requested change by calling the ExitPlanMode tool — do not write or edit any files yourself, that only happens after the user approves your plan. Be specific about which files you'll touch and what will change in each. If the user requests changes to your plan instead of approving it, revise it and call ExitPlanMode again with the updated version.`
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
- You have ${
    mode === "ask"
      ? "Read, Glob, and Grep tools only — no shell access."
      : mode === "plan"
        ? "Read, Glob, Grep, and ExitPlanMode (Write/Edit/Bash are unavailable until your plan is approved)."
        : "Read, Write, Edit, Glob, Grep, and Bash — but Bash only runs a fixed set of commands: `cd <subdir>`/`cd ..`, `bun install`, `bunx prisma generate`, and `bunx/npx shadcn@latest init`/`add`. Anything else, including chaining with `;`, `&&`, `|`, backticks, or `$()`, is denied — don't waste turns trying other commands."
  }
- Do not initialize a git repository or attempt to commit — that happens outside your control after you finish.
- Stay inside the current directory.
`;
}

function buildAgentOptions(generatedAppId: string, mode: ChatMode) {
  if (mode === "ask") return { tools: READ_ONLY_TOOLS };
  if (mode !== "plan") return { tools: BUILD_TOOLS };

  return {
    tools: PLAN_TOOLS,
    permissionMode: "plan" as const,
    onPlanReady: async (plan: string) => {
      await GeneratedAppModel.updateOne(
        { _id: generatedAppId },
        { $set: { status: "awaiting_approval", pendingPlan: plan } },
      );
      const decision = await awaitApproval(generatedAppId);
      // Flips back to "working" the moment the human responds, whether
      // approved (execution continues) or not (the agent revises) — the
      // final `runChatTurn` completion below is what sets it to "idle".
      await GeneratedAppModel.updateOne(
        { _id: generatedAppId },
        { $set: { status: "working", pendingPlan: null } },
      );
      return decision;
    },
  };
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
  await GeneratedAppModel.updateOne({ _id: generatedAppId }, { $set: { status: "idle", pendingPlan: null } });
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
    const text = await runAgentQuery(generatedAppId, dir, prompt, buildAgentOptions(generatedAppId, mode));

    // Ask never touches the working tree, so there's nothing to (re-)wire.
    // Additive, never a hard requirement — see the matching comment in
    // generation.ts.
    if (mode !== "ask") {
      await injectDashboard(dir, generatedAppId).catch((err) => {
        console.error(`[dashboardScaffold] ${generatedAppId}: injection failed:`, err);
      });
    }

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
